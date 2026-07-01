# landed-mcp

Landed's public **Model Context Protocol** server. Any MCP client (Claude Desktop, Cursor, an agent
SDK, …) connects over HTTP and gets tools to search AI-native jobs, fetch application forms, and pull
free learning content.

- **Transport:** Streamable HTTP (stateless), `POST /mcp`.
- **Freemium:** anonymous callers get a shared budget of **job-units** (each job returned by
  `search_jobs` = 1 unit). `get_job_form` and `get_learning_content` are always free. Past the budget,
  pass a **product API token** for unlimited, personalized results.

This repo is a thin, self-hostable **proxy**: it speaks MCP and forwards to the hosted Landed API. All
the heavy lifting — the search engine, job corpus, form data, auth, and metering — lives behind that
API. See [Architecture](#architecture).

## Tools

| Tool | What it does | Metered (anon) |
|------|--------------|:---:|
| `search_jobs` | Ranked, fit-scored jobs. Fill structured fields (role, skills, remote, seniority, comp, industries…) or a free-text `query` (parsed into filters server-side). | 1 unit / job returned |
| `get_job_form` | Application form for a `jobId`, grouped `standard`/`screening`/`eeo` for answer prep. | free |
| `get_learning_content` | Curated interview-prep, portfolio, and roadmap resources (landedjobs GitHub org). | free |

## Prompts (skills)

Reusable, user-invocable workflows that teach the calling agent how to chain the tools and present
results (never raw JSON). Surface as slash-commands in most MCP clients.

| Prompt | Args | What it guides |
|--------|------|----------------|
| `find_jobs` | `describe?` | Search, then present a ranked, fit-scored shortlist + next steps. |
| `prepare_application` | `jobId` | Fetch the form; auto-fill standard, draft screening, leave EEO to the user. |
| `prep_for_role` | `role?` | Pull learning resources for a role and suggest a study order. |

Always-on guidance also ships in the server's `instructions` (tool overview, presentation rules,
freemium behavior), which compliant clients load automatically.

## Auth model

- **Anonymous** — no header. Metered by a hybrid of your IP and an issued `X-Landed-Anon` token
  (echoed on every response; resend it to keep your budget across sessions).
- **Authenticated** — `Authorization: Bearer lnd_live_…` (mint one in Landed → Settings → API
  tokens). Unlimited, and personalized to your saved search brief + profile.

## Connect

```jsonc
// Claude Desktop / any MCP client config
{
  "mcpServers": {
    "landed-jobs": {
      "type": "http",
      "url": "https://mcp.landed.jobs/mcp",
      "headers": { "Authorization": "Bearer lnd_live_your_token_here" }
    }
  }
}
```

Omit `headers` entirely to use the free anonymous tier.

## Architecture

```
MCP client  ──HTTP──▶  landed-mcp (this repo)  ──HTTPS──▶  Landed API
                       • MCP protocol + tools               • search engine · job corpus
                       • forwards caller creds               • application forms
                       • local learning catalog              • auth · freemium metering
```

The proxy holds no database, no ranking engine, and no secrets beyond the API base URL and the shared
service secret. It resolves nothing itself: it forwards the caller's API token (or an anonymous id) to
the Landed API, which validates it, runs the search, meters usage, and returns the results plus a
`freemium` block that the proxy relays verbatim. The `get_learning_content` catalog is static and lives
in this repo ([`src/mcp/catalog/learning.ts`](src/mcp/catalog/learning.ts)) — that tool works with no
backend at all.

## Run it yourself

```bash
pnpm install
cp .env.example .env      # set LANDED_API_BASE + LANDED_INTERNAL_SECRET
pnpm dev
# → [mcp] listening on :8090 — POST /mcp → https://api.landed.jobs/api/v1
```

### Environment

| Var | Default | Notes |
|-----|---------|-------|
| `LANDED_API_BASE` | `http://localhost:8000/api/v1` | Hosted Landed API base, incl. `/api/v1`. |
| `LANDED_INTERNAL_SECRET` | — | Shared secret authenticating the proxy to the API. |
| `PORT` | `8090` | HTTP port. |
| `CORS_ORIGINS` | `*` | Comma-separated allowlist, or `*`. |
| `RATE_LIMIT_PER_MIN` | `60` | Per-IP first-line guard; the API's meter is the real cap. |

## License

[MIT](LICENSE)
