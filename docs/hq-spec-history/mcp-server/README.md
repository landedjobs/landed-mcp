# MCP Server — Built ✅ (landed-mcp)

The greenlit MCP play is **built and live**. Repo: `stack/landed-mcp` (own repo, gitignored in the HQ) · [github.com/landedjobs/landed-mcp](https://github.com/landedjobs/landed-mcp) · hosted at **`https://mcp.landed.jobs/mcp`**.

This page records what exists so distribution work (registry listings, docs, content) can build on it without re-reading the code.

---

## What it is

- **TypeScript, `@modelcontextprotocol/sdk` v1.12**, Node ≥ 20, run via `tsx` (no build step). MIT license.
- **Transport: Streamable HTTP** (stateless) — `POST /mcp`, plus `GET /healthz`. Default port 8090.
- **Architecture: thin proxy.** No database of its own — it forwards to the Landed API (`LANDED_API_BASE` → `/mcp/search`, `/mcp/job-form`) authenticated by `LANDED_INTERNAL_SECRET`. The API owns ranking, metering, and persistence (EC2 Mongo `landed_prod`). Learning content is a **static 11-item catalog** in `src/mcp/catalog/learning.ts` (our GitHub repos).
- Env: `LANDED_API_BASE`, `LANDED_INTERNAL_SECRET`, `PORT`, `CORS_ORIGINS`, `RATE_LIMIT_PER_MIN` (default 60/min/IP, in-memory).

## Tools (3)

| Tool | What it does | Cost |
|---|---|---|
| `search_jobs` | Search AI-native jobs — free-text `query` + structured filters (role, seniority, skills, locations/regions, remote, minComp, industries, companyStages, avoid, limit ≤ 20). Returns ranked jobs with `fitLabel` + `oneLineWhy` + apply URLs. | Anonymous: 1 job-unit per returned job (shared per-IP budget, `lnd_anon_<uuid>` token echoed in `X-Landed-Anon`). Authenticated (`lnd_live_...` Bearer token from Landed → Settings → API tokens): unlimited + personalized. |
| `get_job_form` | Fetch a job's application form fields (grouped: standard / screening / eeo, with auto-fill `mapsTo` hints) by `jobId`. | Free |
| `get_learning_content` | Search the static catalog of our 11 GitHub repos by topic / role / category (interview-prep, portfolio, roadmap, jobs). | Free |

Plus **3 guided prompts**: `find_jobs`, `prepare_application`, `prep_for_role`.

**The freemium loop is the growth mechanic:** anonymous budget → `budget_exhausted` → `signupUrl` → account + API token. Every `get_learning_content` answer also funnels agents/users into the GitHub repos.

## State of the build

- ✅ Complete and working: all 3 tools + 3 prompts, CORS, rate limiting, budget handling, comprehensive README (setup for Claude Code/Desktop, Cursor, VS Code, Windsurf, Cline, generic).
- ⚠️ Gaps: **no tests**, no Dockerfile, rate limiter is in-memory (needs Redis if multi-instance), `course` kind reserved in the catalog but no courses wired yet.
- Registry-ready metadata: name `landed-mcp` (MCP server name `landed-jobs`), v0.1.0, MIT, homepage `mcp.landed.jobs`, GitHub URL.

## Distribution next steps (the actual strategy work)

Per the greenlight in [../deferred/deferred-strategies.md](../deferred/deferred-strategies.md) and the listing research ([../listing-strategy/](../listing-strategy/)):

1. **Submit to registries:** Official MCP Registry, Smithery, Glama, mcp.so, PulseMCP. The README + metadata are ready; each listing needs a short description + config snippet (reuse the README's).
2. **Docs page on landed.jobs** (`/mcp`) — installation for each client + the freemium explanation; link it from the GitHub profile README and the umbrella repo.
3. **Content angle:** "we shipped an MCP server — your AI agent can now search AI-native jobs" is a strong micro-drop / launch post for X + LinkedIn (fits the content calendar), plus listings on AI directories (Toolify/TAAFT accept MCP tools now).
4. **Keep the learning catalog in sync with the repos** — when a repo is added/renamed, update `src/mcp/catalog/learning.ts` (currently manual; candidate for the GitHub control-panel page to own).
5. **Attribution:** MCP-referred traffic should be trackable — the `signupUrl` and catalog URLs should carry `utm_source=mcp` (verify; add if missing).
6. **Later hardening before promoting hard:** basic tests, Redis rate limit, Dockerfile.

## Keep MVP scope in mind

The tools are MVP-true (search jobs, application forms, learning content). Registry descriptions and docs copy must stay inside the three pillars — no referral/tracking claims (see [../../knowledge/product/product-context.md](../../knowledge/product/product-context.md)).
