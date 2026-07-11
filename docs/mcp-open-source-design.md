# Open-sourcing the MCP server

**Goal:** publish `apps/mcp` as a standalone, MIT-licensed GitHub repo that anyone can clone, run,
and point at the hosted Landed API — with **zero `@landed/*` monorepo dependencies** and **zero
proprietary IP** (ranking engine, Gemini prompts, DB schema) in the public tree.

**Chosen strategy (confirmed):** _thin proxy to hosted API_. The OSS repo speaks MCP and forwards to
Landed's hosted HTTP API; the API owns the DB, the search engine, Gemini, auth, and metering. This is
the standard shape for a company's public MCP server (GitHub / Stripe / etc.): a transparent,
self-hostable client with the value + data behind the API.

---

## 1. Why not literal vendoring

`apps/mcp` today runs the product _in-process_:

- `getEngine().runSearch({ db, brief, profile, overrides })` — the retrieval + rerank pipeline
  (`@landed/worker-search-engine`, ~1,270 LOC) runs inside the MCP process.
- Direct reads of product collections: `SearchBrief`, `Profile`, `Opportunity`, `ApplicationForm`,
  `ApiToken` (`@landed/schema` + `@landed/types`).
- `createGeminiClient(...)` for prose→brief synthesis (`@landed/opportunities`).

Copying those packages into a public repo would (a) publish the ranking algorithm + Gemini prompts +
data schema, and (b) still not run for anyone, because it needs the private MongoDB + Vertex creds.
The proxy split avoids both.

---

## 2. Target architecture

```
┌────────────────────────────┐         HTTPS          ┌──────────────────────────────┐
│  landed-mcp (OSS repo)     │  ───────────────────▶  │  apps/server (private)       │
│  • MCP protocol + tools    │   POST /mcp/search     │  • NEW /mcp/* endpoints       │
│  • forwards auth headers   │   POST /mcp/job-form   │  • identity + quota + engine  │
│  • local learning catalog  │                        │  • DB · Gemini · search engine│
│  • no DB / engine / secrets│  ◀───────────────────  │  (all proprietary IP stays)   │
└────────────────────────────┘   { jobs, freemium }   └──────────────────────────────┘
```

The boundary: **everything that touches the DB, the engine, or Gemini moves behind the hosted API.**
The proxy holds only the MCP wiring, the (public) learning catalog, and an HTTP client.

---

## 3. Work in `apps/server` (private monorepo)

Today the only internal search endpoint is `POST /search`
([search.route.ts](../../apps/server/src/routes/v1/search.route.ts)), gated by `isInternalService`
(shared secret) + `isLoggedIn` (JWT→userId). It is **user-only** and has none of the MCP freemium
layer. We add a parallel MCP surface that absorbs the logic currently living in
`apps/mcp/src/services/{search,identity,quota}` and the tools' metering.

### 3.1 New routes — `apps/server/src/routes/v1/mcp.route.ts`

| Method / path        | Auth                          | Body                          | Returns |
|----------------------|-------------------------------|-------------------------------|---------|
| `POST /mcp/search`   | `isInternalService` (secret)  | `SearchJobsInput` + `limit` + identity block | `{ jobs, total, returned, freemium }` |
| `POST /mcp/job-form` | `isInternalService` (secret)  | `{ jobId }` + identity block  | `{ jobId, status, applyUrl, fieldsByGroup?, freemium }` |

- Gated by `isInternalService` only (the proxy is a trusted service holding `X-Internal-Secret`),
  **not** `isLoggedIn` — the MCP endpoints do their own caller resolution from a forwarded identity
  block, because the caller may be anonymous or an API-token user, not a JWT session.
- **Identity block** (forwarded by the proxy in the JSON body or dedicated headers):
  `{ authorization?: "Bearer lnd_live_…", anonId?: "lnd_anon_…", ip?: string }`.

### 3.2 New service — `apps/server/src/services/mcp/mcp.service.ts`

Ports these `apps/mcp` internals verbatim (they already contain the real logic):

- **`resolveIdentity`** — from `apps/mcp/src/services/identity.ts`. Validates `lnd_live_` against the
  `ApiToken` collection (`tokenHash` sha256, `revokedAt` unset), bumps `lastUsedAt`; else anon.
- **`getQuota` / `consume`** — from `apps/mcp/src/services/quota.ts`. Move the `mcp.anon_usage`
  collection into `@landed/schema` as `AnonUsage` (register in `ModelFactory`); today it's defined
  inline in `apps/mcp/src/lib/models.ts` and must not be lost when `apps/mcp` is deleted.
- **`runJobSearch`** — from `apps/mcp/src/services/search.ts` (brief resolve → synth → engine →
  `attachUrls`). Reuses the existing `searchService`/engine wiring already in the server.
- **`synthesizeOverrides`** — from `apps/mcp/src/services/brief-synth.ts` (Gemini Flash, prompt +
  `overridesSchema`). The prompt string is proprietary and stays server-side.
- **`getJobForm`** — the DB logic from `apps/mcp/src/mcp/tools/get-job-form.ts` (opportunity →
  `(atsType, atsId)` → `ApplicationForm`, grouping).

Net: the freemium meter, token auth, engine call, and Gemini prompt all live in `apps/server`. The
anon-token _string_ can still be minted proxy-side (a random UUID needs no secret) and passed in the
identity block, so `X-Landed-Anon` behavior is unchanged.

### 3.3 Config

Reuse `config.internalServiceSecret`. Freemium knobs (`anonJobUnitBudget`, `anonMaxJobsPerSearch`,
`signupUrl`) move into `apps/server` config.

---

## 4. The standalone OSS repo (`landed-mcp`)

### 4.1 What carries over unchanged (no `@landed/*` deps)

- `src/mcp/server.ts` — instructions + tool/prompt registration. `ToolContext` changes from a
  resolved `Identity` to a forwarded `{ authorization?, anonId, ip? }`.
- `src/mcp/prompts.ts` — pure, as-is.
- `src/mcp/catalog/learning.ts` + `src/mcp/tools/get-learning-content.ts` — static, public,
  non-proprietary. Stays local; the tool keeps working with **no backend at all**.
- `src/mcp/tools/lib/respond.ts` — freemium formatting, now driven by the `freemium` block the API
  returns.
- `src/http/server.ts` — same Express + Streamable HTTP shell. The `/mcp` handler no longer calls
  `resolveIdentity`; it mints/echoes the anon token and forwards the auth header + IP into
  `ToolContext`.
- `src/http/rate-limit.ts` — in-memory per-IP limiter, as-is (cheap first line; API enforces its own).

### 4.2 What changes

- **`src/mcp/tools/search-jobs.ts`** — calls `apiClient.search(ctx, args, limit)` instead of the
  in-process `runJobSearch` + `getQuota`/`consume`. The API returns the metered result + freemium
  block ready to relay.
- **`src/mcp/tools/get-job-form.ts`** — calls `apiClient.jobForm(ctx, jobId)`.
- **`src/mcp/tools/lib/overrides.ts`** — shrinks to just `searchJobsShape` / `SearchJobsInput`. The
  `structuredToOverrides` / `mergeOverrides` / `overridesSchema` mapping + synth logic moves
  server-side (it needs Gemini + the engine's `BriefOverrides` type). The proxy just forwards the raw
  `SearchJobsInput`.

### 4.3 What's new

- **`src/services/api-client.ts`** — `search()` and `jobForm()` → `fetch` to `LANDED_API_BASE` with
  `X-Internal-Secret` + the forwarded identity block; typed JSON back.
- **`src/types.ts`** — ~30 lines of local interfaces replacing all `@landed/*` type imports:
  `JobResult` (was `FitHit` + url/applyUrl), `FormFieldGroup`, `FreemiumMeta`, `SearchResponse`,
  `JobFormResponse`. These are the API contract, owned by the repo.

### 4.4 What's deleted

`src/lib/{engine,mongo,models}.ts`, `src/services/{search,identity,quota,brief-synth}.ts` — all moved
into `apps/server`.

### 4.5 `package.json`

- Drop: `@landed/opportunities`, `@landed/schema`, `@landed/types`, `@landed/worker-search-engine`,
  `mongoose`.
- Keep: `@modelcontextprotocol/sdk`, `express`, `cors`, `dotenv`, `zod` (+ `@types/*`, `tsx`, `typescript`).
- Rename `@landed/mcp-server` → e.g. `landed-mcp`; add `license: MIT`, `repository`, `homepage`.

### 4.6 New files for a public repo

`LICENSE` (MIT) · `.gitignore` · standalone `tsconfig.json` (no workspace path aliases — keep the
`@/*` self-alias only) · optional `Dockerfile` + `.github/workflows/ci.yml` (typecheck) ·
`.env.example` slimmed to `PORT`, `CORS_ORIGINS`, `LANDED_API_BASE`, `LANDED_INTERNAL_SECRET`,
`RATE_LIMIT_PER_MIN`, `SIGNUP_URL` (drops all `MONGO_*`, `GOOGLE_VERTEX_*`, `GEMINI_*`).

### 4.7 README

The current README is already strong (tools, prompts, auth model, connect snippet). Add a **"Self-host
/ run your own"** section pointing at `LANDED_API_BASE`, and a short **architecture** note (thin proxy;
data + ranking behind the hosted API).

---

## 5. Config / env delta

| Var                     | apps/mcp today | OSS proxy | apps/server |
|-------------------------|:---:|:---:|:---:|
| `MONGO_URI` / `MONGO_DB`| ✓ | — | ✓ (already) |
| `GOOGLE_VERTEX_PROJECT`, `GEMINI_*` | ✓ | — | ✓ (already) |
| `LANDED_API_BASE`       | — | ✓ new | — |
| `LANDED_INTERNAL_SECRET`| — | ✓ new | ✓ (already `internalServiceSecret`) |
| `ANON_JOB_UNIT_BUDGET`, `ANON_MAX_JOBS_PER_SEARCH` | ✓ | — | ✓ moves here |
| `PORT`, `CORS_ORIGINS`, `RATE_LIMIT_PER_MIN`, `SIGNUP_URL` | ✓ | ✓ | — |

---

## 6. Migration / deployment

1. Land the `apps/server` `/mcp/*` endpoints + `AnonUsage` schema move; keep `apps/mcp` running
   in-process (no behavior change) — endpoints added, nothing removed.
2. Build the proxy in a **new folder** (in-monorepo first, e.g. `apps/mcp-proxy`, or straight into the
   new repo) that calls the new endpoints. Verify parity against a running server.
3. Cut the new repo from the proxy folder, wire CI, publish.
4. Point production `mcp.landed.jobs` at the proxy; retire the old in-process `apps/mcp`.

Rollback: the old `apps/mcp` stays deployable until step 4 is verified.

---

## 7. Decisions (resolved) — IMPLEMENTED

1. **Repo** — `landed-mcp`, MIT, scaffolded standalone at `../landed-mcp` (sibling of `landed-v2`),
   git-initialised with an initial commit. Not yet pushed (needs GitHub auth + remote).
2. **Proxy staging** — scaffolded the standalone repo directly (no temporary in-monorepo stage).
3. **Learning catalog** — kept vendored in the OSS repo (static, zero-backend).
4. **Anon-token minting** — kept proxy-side (UUID, no secret; unchanged `X-Landed-Anon` UX). The server
   trusts the proxy-supplied `anonId` as a metering key.
5. **`get_job_form`** — **NOT metered.** Rationale: a caller can only reach a `jobId` they already paid
   for via `search_jobs`, so form lookup is free by design. Only `search_jobs` meters (1 unit/job).
6. **Public API contract** — exposed at `/api/v1/mcp/{search,job-form}`, gated by the shared internal
   secret (`isInternalService`). A public gateway/CDN rate-limit in front remains an ops option.

### What landed
- **Server** (`apps/server`): `POST /api/v1/mcp/search` + `/job-form`; `mcp.service.ts` (identity,
  quota, brief-synth via `aiService`, engine search via `searchService`, form lookup);
  `mcp.controller.ts` + `mcp.validation.ts` + `mcp.route.ts`; `config.mcp` freemium knobs.
- **Schema/types**: `AnonUsage` type (`@landed/types`) + `AnonUsageModel` (`@landed/schema`,
  `mcp.anon_usage`, registered in `ModelFactory`).
- **OSS repo** (`../landed-mcp`): thin MCP proxy — zero `@landed/*` deps, ~30 lines of local API-contract
  types, `api-client.ts` forwarding to the hosted API. Typechecks clean; boots and serves `tools/list`.

### Follow-ups (not done)
- Retire/delete the old in-process `apps/mcp` once the proxy is verified against a running server
  (left in place for rollback safety — **decision pending**).
- Set `INTERNAL_SERVICE_SECRET` (server) = `LANDED_INTERNAL_SECRET` (proxy) in each deploy env.
- Create the GitHub remote and push; optional CI (typecheck) + Dockerfile.
- End-to-end parity test against a live server (needs Mongo + Vertex).
</content>
</invoke>
