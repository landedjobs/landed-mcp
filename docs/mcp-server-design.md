# Public MCP Server — Design

Status: **proposal, awaiting sign-off** · Owner: abhishek · Target: `apps/mcp` (new)

A public, HTTP-reachable MCP server that any agent/client can connect to with a URL — no
account needed to try it. Freemium: an anonymous caller gets a **20 job-unit** budget; past
that they must supply a **product API token** minted from their Landed settings. The server
exposes job search, job-application forms (so an agent can prepare answers), and learning
content (our courses + the `landedjobs` GitHub repos).

---

## 1. Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Topology | **New `apps/mcp` app** — own deployable/subdomain, imports `@landed/schema` + the search engine directly (worker pattern), runs search in-process, owns its own public auth + quota. |
| 2 | Anonymous quota tracking | **Hybrid IP + anon token** — meter by anon token when present, else by IP; enforce a per-IP ceiling too so token rotation from one IP can't bypass the cap. |
| 3 | Freemium gating | **Learning free; `search_jobs` + `get_job_form` both metered** (each draws down the 20 job-unit budget). |
| 4 | Doc location | `docs/mcp-server/` (this file). |

---

## 2. Goals & non-goals

**Goals**
- One URL to connect; works with no auth for a meaningful trial (20 job-units).
- Clean upgrade path: sign up → Settings → copy token → paste into MCP client config → personalized + unmetered.
- Reuse the existing search engine and `ApplicationForm` data; do **not** re-implement search.
- Drive distribution: `get_learning_content` surfaces the `landedjobs` repos and (later) our courses.

**Non-goals (v1)**
- No write actions (no "apply", no saving jobs) — read/prepare only.
- No on-demand ATS form fetching — serve what's already in `application_forms`; if absent, return the apply URL.
- No billing/plan enforcement beyond "has a valid token" (plan-based limits are a later layer).

---

## 3. Architecture

`apps/mcp` is a standalone Node service, structured like the workers (e.g. `workers/jobs-digest`),
**not** like `apps/server`. It connects to Mongo directly and reads models via `ModelFactory`,
and imports the search engine the same way the workers do.

```
apps/mcp  (@landed/mcp-server)
  src/
    index.ts                → boot: connect mongo, build engine, start HTTP server
    config/index.ts         → dotenv + required() (mirrors workers/search-engine/src/config)
    lib/
      mongo.ts              → connectMongo() + db() (copied from worker pattern)
      engine.ts             → createSearchEngine() wired to db + vertex config
    http/
      server.ts            → Express app, POST /mcp (Streamable HTTP), health, CORS
      middleware.ts        → identity resolution (token | anon), rate limit
    mcp/
      server.ts            → McpServer instance + tool registration
      tools/
        search-jobs.ts
        get-job-form.ts
        get-learning-content.ts
      catalog/
        learning.ts        → static curated catalog of landedjobs repos (+ courses later)
    services/
      identity.ts          → resolve product token → userId; issue/track anon identity
      quota.ts             → read/increment the job-unit meter (per identity)
```

**Why worker-style, not server-style:** the CLAUDE.md "services are the only place DB is
touched" rule governs `apps/server`. The workers already access Mongo directly via
`ModelFactory` (see `workers/jobs-digest/src/lib/mongo.ts`). `apps/mcp` is the same kind of
standalone service, so it follows the worker precedent. The **write** side of API tokens
(mint/list/revoke, behind web session auth) stays in `apps/server`; `apps/mcp` only
*validates* tokens.

### Request flow

```
MCP client ──HTTP──▶ apps/mcp POST /mcp
    │ Authorization: Bearer lnd_live_…   (optional)
    │ X-Landed-Anon: lnd_anon_…          (optional, for anon continuity)
    ▼
identity middleware
    ├─ product token present & valid ─▶ { kind: 'user', userId }        (unmetered)
    └─ else                            ─▶ { kind: 'anon', anonId, ip }   (metered)
    ▼
tool handler
    ├─ search_jobs / get_job_form ─▶ quota check (anon only) ─▶ runSearch / read form
    └─ get_learning_content        ─▶ always free
```

---

## 4. Identity & auth

### 4.1 Product API token (net-new — this is the biggest new surface)

Today the repo has **no** personal-access-token concept (only JWT via OAuth/OTP). We add one.

**New entity `ApiToken`** — type in `@landed/types`, schema in `@landed/schema` (register in
`ModelFactory`), collection `api_tokens`:

```ts
interface ApiToken {
    apiTokenId: string;      // uuid, app-facing id
    userId: string;          // owner
    name: string;            // user label, e.g. "Claude Desktop"
    tokenHash: string;       // sha256 of the raw token — raw is never stored
    last4: string;           // for display, e.g. "…9f2a"
    createdAt: Date;
    lastUsedAt?: Date;
    revokedAt?: Date;
}
```

- Raw token format: `lnd_live_<32+ base62 chars>`. Shown **once** at creation; only the hash
  is persisted.
- `apps/server` owns the lifecycle (JWT/session-authenticated), reusing route → controller →
  service → `AppError`:
  - `POST   /api/v1/tokens`      → mint (body: `{ name }`) → returns raw token once.
  - `GET    /api/v1/tokens`      → list (id, name, last4, createdAt, lastUsedAt).
  - `DELETE /api/v1/tokens/:id`  → revoke (set `revokedAt`).
- `apps/mcp` validates: sha256 the presented token → look up non-revoked `ApiToken` by
  `tokenHash` → resolve `userId`; bump `lastUsedAt` (throttled). Timing-safe compare.

**Client Settings UI** (`apps/client`): a "MCP / API tokens" section — create (name → reveal
once → copy), list, revoke — plus a copy-paste MCP config snippet with the server URL.

### 4.2 Anonymous identity (hybrid)

- On the first anonymous call with no `X-Landed-Anon` header, mint an `anonId`
  (`lnd_anon_<uuid>`) and return it to the client (in the tool result payload and/or a
  `_meta` field) so a cooperating client can resend it for continuity.
- Meter primarily by `anonId`; **also** track by client IP. A call is blocked if **either**
  the anon counter or the IP counter has reached the cap — so rotating anon tokens from one IP
  can't reset the budget, and a shared/NAT IP still lets distinct clients each get some budget
  up to the IP ceiling.
- Anonymous usage lives in a small collection (`anon_usage`) or a TTL cache:
  `{ key, kind: 'anon'|'ip', jobUnitsUsed, firstSeenAt, lastSeenAt }`.

> Open question O1: is the 20 job-unit budget **lifetime** or **rolling (e.g. per 30 days)**?
> Assumption for now: lifetime per identity, with a document TTL we can tune later.

---

## 5. Quota / metering

- Unit = **job-unit**. Budget = **20** for anonymous identities.
- `search_jobs` consumes **N** job-units where N = number of jobs returned (capped so a single
  call can't blow the whole budget — see O2).
- `get_job_form` consumes **1** job-unit (it concerns a single job).
- `get_learning_content` consumes **0** (always free).
- Product-token identities are **unmetered** in v1 (plan limits are a future layer).
- When a metered call would exceed the remaining budget, return a structured, agent-friendly
  error: what's left (0), and how to continue — "Sign up at <url>, create a token in Settings,
  and set it as the `Authorization: Bearer` header." Include the signup URL.

> Open question O2: cap on jobs per single `search_jobs` call for anon (e.g. max 5 so the
> 20-budget spans ~4 searches)? Recommendation: **anon limit ≤ 5 per call**, token'd up to 20.

---

## 6. Tools

### 6.1 `search_jobs`
- **Input:** `{ query: string, role?, location?, remote?: 'remote'|'hybrid'|'onsite', seniority?, limit?: number }`.
  - Anon: `limit` clamped to ≤ 5. Token'd: ≤ 20.
- **Behavior:**
  - Anon → build a **skeleton brief** from `query` + filters as `overrides`; call `runSearch`.
  - Token'd → load the user's saved `SearchBrief` + `Profile`, pass `query`/`overrides`;
    personalized ranking.
- **Output:** array of `{ jobId, title, company, location, fitLabel, oneLineWhy, applyUrl, url }`
  plus `total`. (`applyUrl`/`url` pulled from the opportunity doc; the engine hit gives the
  ranking fields.)
- **Meter:** N job-units (anon only).

### 6.2 `get_job_form`
- **Input:** `{ jobId: string }`.
- **Behavior:** read `application_forms` for the opportunity. Return fields grouped
  `standard | screening | eeo`, each `{ key, label, type, options, required, group, mapsTo }`,
  so the calling agent can pre-draft answers (esp. `screening` free-text). If no form is
  stored: return `{ status: 'not_available', applyUrl }` (no on-demand ATS fetch in v1).
- **Meter:** 1 job-unit (anon only).

### 6.3 `get_learning_content`
- **Input:** `{ topic?: string, role?: string, category?: 'interview-prep'|'portfolio'|'roadmap'|'jobs' }`.
- **Behavior:** filter the curated catalog (§7) by topic/role/category; return matching repos
  (and, once modeled, courses).
- **Output:** `{ items: [{ kind: 'repo'|'course', title, url, description, category, contentTypes[] }] }`.
- **Meter:** free.

> Possible v1.1 tool: `get_job` (full details for one `jobId`). Left out of v1 to keep surface small.

---

## 7. Learning catalog

There is **no manifest** in `../distribution/github-repos`; it's the `landedjobs` GitHub org.
So v1 ships a **hand-authored static catalog** in `apps/mcp/src/mcp/catalog/learning.ts`,
covering the 7 evergreen learning repos + roadmaps (URLs `https://github.com/landedjobs/<name>`):

- `awesome-ai-engineer-interview` — 267 questions, 12 company guides, worked designs — *interview-prep*
- `rag-engineer-interview-questions` — RAG-focused Q + designs — *interview-prep*
- `ai-pm-interview-prep` — 131 questions, frameworks — *interview-prep*
- `ai-interview-guides` — per-company processes — *interview-prep*
- `ai-interview-questions` — real vs likely, company-grouped — *interview-prep*
- `ai-engineer-portfolio-projects` — 85+ projects, 10 themes — *portfolio*
- `projects-to-land-an-ai-job` — curated 13 high-signal — *portfolio*
- `ai-product-engineer-roadmap`, `become-a-gtm-engineer` — *roadmap*
- (optional) per-role `*-jobs` repos — *jobs*

**Courses:** no `Course` model exists in the repo yet (CLAUDE.md lists courses as in-scope to
migrate from `landed`, but the scaffold doesn't include it). v1 catalog is repos-only; a
`kind: 'course'` slot is reserved and wired so courses drop in when that feature lands.

> Open question O3: keep the catalog static in-app, or later back it by a small DB collection /
> pull repo metadata from the GitHub API? Recommendation: static for v1.

---

## 8. Transport & MCP wiring

- `@modelcontextprotocol/sdk` `McpServer` + **Streamable HTTP** transport, **stateless** mode
  (no server-held session) so a public multi-tenant server scales horizontally and any client
  can connect with just the URL.
- `POST /mcp` handles JSON-RPC; identity is resolved from headers per request (§4).
- Health check `GET /healthz`; permissive CORS for browser-based MCP clients.
- Server URL (prod): e.g. `https://mcp.landed.jobs/mcp` (subdomain TBD) — the client snippet in
  Settings uses this.

---

## 9. Config / env (`apps/mcp/.env`)

Mirrors `workers/search-engine`:
```
MONGO_URI, MONGO_DB
GOOGLE_VERTEX_PROJECT, GOOGLE_VERTEX_LOCATION, GEMINI_EMBED_MODEL, GEMINI_RERANK_MODEL
PORT
ANON_JOB_UNIT_BUDGET=20
ANON_MAX_JOBS_PER_SEARCH=5
SIGNUP_URL=https://landed.b100x.ai
```
(No `INTERNAL_SERVICE_SECRET` needed — `apps/mcp` isn't a proxy; it talks to Mongo directly.)

---

## 10. Security & abuse

- Public unauthenticated surface → **per-IP rate limit** (requests/min) in addition to the
  job-unit budget, to protect the (expensive) vector+rerank search.
- Never store raw tokens; sha256 + `last4` only; timing-safe compare on validate.
- Validate/clamp all tool inputs with Zod; clamp `limit`; reject oversized `query`.
- CORS allowlist for credentials; the token travels as a bearer header, not a query param.
- Log tool usage (identity kind, tool, units) for analytics + abuse detection; no PII in logs.

---

## 11. Work breakdown (phased)

**Phase 0 — API tokens (in `apps/server` + packages)**
1. `ApiToken` type (`@landed/types`) + schema (`@landed/schema`, register in `ModelFactory`).
2. Token service + controller + routes (mint/list/revoke), JWT-guarded.
3. Client Settings UI: create/reveal-once/list/revoke + MCP config snippet.

**Phase 1 — `apps/mcp` skeleton**
4. Scaffold app (package.json `@landed/mcp-server`, tsconfig, turbo wiring, `.env.example`).
5. `lib/mongo.ts` + `lib/engine.ts` (worker pattern); `http/server.ts` with `POST /mcp` +
   `/healthz`; stateless Streamable HTTP.

**Phase 2 — identity & quota**
6. `services/identity.ts` (product token validate; anon mint/resolve, IP+token hybrid).
7. `services/quota.ts` (`anon_usage` collection or TTL cache; increment/check job-units).
8. Rate-limit + CORS middleware.

**Phase 3 — tools**
9. `search_jobs` (skeleton brief for anon; saved brief+profile for token'd).
10. `get_job_form` (read `application_forms`).
11. `get_learning_content` + static catalog.

**Phase 4 — polish**
12. Structured "budget exhausted → get a token" errors with signup URL.
13. Usage logging/analytics; README with the connect snippet; deploy config + subdomain.

---

## 12. Open questions

- **O1** — Anonymous budget: lifetime or rolling window?
- **O2** — Max jobs per single anon `search_jobs` call (recommend ≤ 5)?
- **O3** — Learning catalog: static in-app vs DB/GitHub-API backed?
- **O4** — Subdomain/URL for the MCP server (`mcp.landed.jobs`? `…/mcp` on an existing host?).
- **O5** — Should product-token users be unmetered in v1, or already tied to plan/`UsageMeter`
  (per the billing memo)? Recommend unmetered v1, meter later.
