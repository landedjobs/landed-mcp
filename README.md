<a name="top"></a>

<div align="center">

<a href="https://landed.jobs"><img src="https://static.b100x.ai/email/landed-wordmark.png" alt="Landed" width="200"></a>

<img src="https://static.b100x.ai/github-repos/images/landed-mcp/banner.svg" alt="Landed MCP Server" width="100%">

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Streamable_HTTP-6E56CF.svg)](https://modelcontextprotocol.io)
[![Works with Claude](https://img.shields.io/badge/Works_with-Claude-D97757.svg)](#claude-desktop)
[![Works with Cursor](https://img.shields.io/badge/Works_with-Cursor-000000.svg)](#cursor)

**Search AI-native jobs, prepare applications, and study for interviews — from any MCP client.**
A public [Model Context Protocol](https://modelcontextprotocol.io) server giving Claude, Cursor, VS Code, and any MCP-capable agent live access to [Landed](https://landed.jobs)'s ranked, fit-scored job corpus.

*Maintained by [Landed](https://landed.jobs) — daily AI-native job matches, agent help with every application, and mock-interview prep.*

</div>

---

## What is this?

**Landed MCP** connects your AI assistant to a curated, continuously-updated corpus of AI-native roles
(AI Engineer, ML Engineer, RAG Engineer, AI PM, GTM Engineer, and more). Instead of copy-pasting job
boards into a chat, your agent can:

- 🔎 **Search jobs** — ranked and fit-scored against a structured brief (role, skills, seniority,
  remote, compensation, industries…), or from a plain-English description.
- 📝 **Prepare applications** — pull a job's real application form, grouped into standard / screening /
  EEO fields, so the agent can auto-fill and draft answers before you apply.
- 🎓 **Study for interviews** — fetch free, curated interview-prep, portfolio, and roadmap resources.

It speaks **Streamable HTTP** and works with any MCP client. Use the **hosted** server in seconds, or
**self-host** this repo against your own Landed API.

> **Free to start.** Anonymous callers get a shared free budget — no signup, no key. Add an API token
> for unlimited, personalized results.

---

## Quick start (hosted)

The hosted server lives at:

```
https://mcp.landed.jobs/mcp
```

Pick your client below. Everything works **anonymously** out of the box — just omit the `Authorization`
header. Add `Authorization: Bearer lnd_live_…` (mint one at
[Landed → Settings → API tokens](https://landed.jobs)) for unlimited, brief-personalized search.

### Claude Code

The one-liner (CLI):

```bash
# Anonymous (free tier)
claude mcp add --transport http landed-jobs https://mcp.landed.jobs/mcp

# Authenticated (unlimited, personalized)
claude mcp add --transport http landed-jobs https://mcp.landed.jobs/mcp \
  --header "Authorization: Bearer lnd_live_your_token_here"
```

Then in a session: `/mcp` to confirm it's connected, and try the `find_jobs` prompt.

### Claude Desktop

Open **Settings → Developer → Edit Config** (this opens `claude_desktop_config.json`), then add:

```jsonc
{
  "mcpServers": {
    "landed-jobs": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote", "https://mcp.landed.jobs/mcp",
        "--header", "Authorization: Bearer lnd_live_your_token_here"
      ]
    }
  }
}
```

Restart Claude Desktop. Drop the `--header` line for the free anonymous tier.

> Claude Desktop bridges remote HTTP servers through [`mcp-remote`](https://www.npmjs.com/package/mcp-remote).
> If your build has native **Custom Connectors** (Settings → Connectors → *Add custom connector*), you can
> instead paste `https://mcp.landed.jobs/mcp` directly.

### Cursor

Create `.cursor/mcp.json` in your project (or `~/.cursor/mcp.json` globally):

```jsonc
{
  "mcpServers": {
    "landed-jobs": {
      "url": "https://mcp.landed.jobs/mcp",
      "headers": { "Authorization": "Bearer lnd_live_your_token_here" }
    }
  }
}
```

Then enable **landed-jobs** under **Settings → MCP**. Omit `headers` for the free tier.

### VS Code (GitHub Copilot / Agent Mode)

Create `.vscode/mcp.json`:

```jsonc
{
  "servers": {
    "landed-jobs": {
      "type": "http",
      "url": "https://mcp.landed.jobs/mcp",
      "headers": { "Authorization": "Bearer lnd_live_your_token_here" }
    }
  }
}
```

Open the Chat view → **Agent** mode → the tools appear under the 🔧 picker.

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```jsonc
{
  "mcpServers": {
    "landed-jobs": {
      "serverUrl": "https://mcp.landed.jobs/mcp",
      "headers": { "Authorization": "Bearer lnd_live_your_token_here" }
    }
  }
}
```

### Cline (VS Code extension)

Open **Cline → MCP Servers → Configure**, or edit `cline_mcp_settings.json`:

```jsonc
{
  "mcpServers": {
    "landed-jobs": {
      "type": "streamableHttp",
      "url": "https://mcp.landed.jobs/mcp",
      "headers": { "Authorization": "Bearer lnd_live_your_token_here" }
    }
  }
}
```

### Any other MCP client

Point it at `https://mcp.landed.jobs/mcp` using the **Streamable HTTP** transport. Pass
`Authorization: Bearer <token>` if you have one. Quick sanity check from a terminal:

```bash
curl -s -X POST https://mcp.landed.jobs/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## Tools

| Tool | What it does | Anonymous cost |
|------|--------------|:---:|
| `search_jobs` | Ranked, fit-scored jobs. Fill structured fields (role, skills, remote, seniority, comp, industries…) or a free-text `query` (parsed into filters server-side). | 1 unit / job returned |
| `get_job_form` | Application form for a `jobId`, grouped `standard` / `screening` / `eeo` for answer prep. | **free** |
| `get_learning_content` | Curated interview-prep, portfolio, and roadmap resources. | **free** |

## Prompts (guided workflows)

MCP **prompts** are reusable, user-invocable skills that teach the agent how to chain the tools and
present results as a clean shortlist — never raw JSON. In most clients they show up as slash-commands.

| Prompt | Args | What it guides |
|--------|------|----------------|
| `find_jobs` | `describe?` | Search, then present a ranked, fit-scored shortlist + next steps. |
| `prepare_application` | `jobId` | Fetch the form; auto-fill standard, draft screening, leave EEO to the user. |
| `prep_for_role` | `role?` | Pull learning resources for a role and suggest a study order. |

The server also ships always-on `instructions` (tool overview, presentation rules, freemium behavior)
that compliant clients load automatically.

---

## Auth & pricing

| Tier | How | What you get |
|------|-----|--------------|
| **Anonymous** | No header | A shared free budget of job-units. Metered by a hybrid of your IP and an issued `X-Landed-Anon` token (echoed on every response — resend it to keep your budget across sessions). |
| **Authenticated** | `Authorization: Bearer lnd_live_…` | Unlimited search, personalized to your saved brief + profile. Mint a token at [Landed → Settings → API tokens](https://landed.jobs). |

Every result carries a `freemium` block so your agent can see how much budget is left and how to lift
the cap.

---

## Architecture

This repository is a **thin, self-hostable proxy**. It speaks MCP and forwards to the hosted Landed
API — it holds **no database, no ranking engine, and no job data**.

```
   MCP client                 landed-mcp (this repo)              Landed API
 ┌─────────────┐   HTTP    ┌────────────────────────┐  HTTPS   ┌────────────────────────┐
 │ Claude /    │ ───────▶  │ • MCP protocol + tools │ ──────▶  │ • search engine        │
 │ Cursor /    │  /mcp     │ • forwards caller creds│          │ • job corpus + forms   │
 │ VS Code …   │ ◀───────  │ • local learning list  │ ◀──────  │ • auth · freemium meter│
 └─────────────┘           └────────────────────────┘          └────────────────────────┘
```

The proxy resolves nothing itself: it forwards the caller's API token (or an anonymous id) to the
Landed API, which validates it, runs the search, meters usage, and returns results plus a `freemium`
block the proxy relays verbatim. The `get_learning_content` catalog is static and lives in this repo
([`src/mcp/catalog/learning.ts`](src/mcp/catalog/learning.ts)) — that tool works with no backend at all.

---

## Self-host

Run your own proxy against the Landed API (or your own deployment of it).

### Prerequisites

- **Node.js ≥ 20**
- **pnpm** (`npm i -g pnpm`)
- A **Landed API base URL** and its **shared internal secret**

### Run

```bash
git clone git@github.com:landedjobs/landed-mcp.git
cd landed-mcp
pnpm install
cp .env.example .env       # then fill in the values below
pnpm dev                   # hot-reload dev server
# → [mcp] listening on :8090 — POST /mcp → https://api.landed.jobs/api/v1
```

For production: `pnpm start`.

### Environment variables

| Variable | Required | Default | Description |
|----------|:---:|---------|-------------|
| `LANDED_API_BASE` | ✓ | `http://localhost:8000/api/v1` | Hosted Landed API base, **including** the `/api/v1` prefix. |
| `LANDED_INTERNAL_SECRET` | ✓ | — | Shared secret authenticating this proxy to the API (must match the server's `INTERNAL_SERVICE_SECRET`). |
| `PORT` | | `8090` | HTTP port to listen on. |
| `CORS_ORIGINS` | | `*` | Comma-separated allowlist of origins, or `*`. |
| `RATE_LIMIT_PER_MIN` | | `60` | Per-IP first-line request cap. The API's freemium meter is the real economic cap. |

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/mcp` | MCP Streamable HTTP endpoint (stateless). |
| `GET` | `/healthz` | Liveness probe (`{ "ok": true }`). |

---

## Development

```bash
pnpm dev           # watch + reload
pnpm check-types   # tsc --noEmit
pnpm start         # run once
```

**Project layout**

```
src/
├── index.ts                 # bootstrap: start the HTTP server
├── config/                  # env → typed config
├── http/                    # express shell + per-IP rate limiter
├── services/api-client.ts   # typed fetch client → Landed API
├── types.ts                 # the API response contract (owned here)
└── mcp/
    ├── server.ts            # instructions + tool/prompt registration
    ├── prompts.ts           # find_jobs / prepare_application / prep_for_role
    ├── catalog/learning.ts  # static, public learning resources
    └── tools/               # search_jobs · get_job_form · get_learning_content
```

Stack: TypeScript · Express · [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) · Zod. No database, no build step (runs on `tsx`).

---

## Contributing

Issues and PRs welcome — bug fixes, new client setup guides, and learning-catalog additions especially.
Please run `pnpm check-types` before opening a PR.

## License

[MIT](LICENSE) © Landed
