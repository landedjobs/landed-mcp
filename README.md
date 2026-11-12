<a name="top"></a>

<div align="center">

<a href="https://landed.jobs"><picture><source media="(prefers-color-scheme: dark)" srcset="https://static.b100x.ai/github-repos/images/brand/landed-wordmark-dark.png"><img src="https://static.b100x.ai/email/landed-wordmark.png" alt="Landed" width="200"></picture></a>

<img src="https://static.b100x.ai/github-repos/images/landed-mcp/banner.svg" alt="Landed MCP Server" width="100%">

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Streamable_HTTP-6E56CF.svg)](https://modelcontextprotocol.io)
[![smithery badge](https://smithery.ai/badge/landedjobs/landed)](https://smithery.ai/servers/landedjobs/landed)
[![Works with Claude](https://img.shields.io/badge/Works_with-Claude-D97757.svg)](#claude-desktop)
[![Works with Cursor](https://img.shields.io/badge/Works_with-Cursor-000000.svg)](#cursor)

**Search AI-native jobs and study for interviews — from any MCP client.**
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
- 📝 **Apply in landed** — every result links to the job in the landed app, where you apply.
- 🎓 **Study for interviews** — fetch free, curated interview-prep, portfolio, and roadmap resources.

It speaks **Streamable HTTP** and works with any MCP client. Use the **hosted** server in seconds, or
**self-host** this repo against your own Landed API.

> **Sign in with landed.** Add the server and your AI app opens landed's sign-in; choose **Allow** and
> you're connected. Clients without OAuth can still send a landed API token as `Authorization: Bearer <token>`.

---

## Quick start (hosted)

The hosted server lives at:

```
https://mcp.landed.jobs/mcp
```

Pick your client below. Clients with OAuth (Claude, Claude Code, ChatGPT, Cursor, VS Code) open
"Sign in with landed" the first time: sign in, choose **Allow**, done. You can disconnect any time in
landed under Settings → API tokens. The `--header` / `headers` lines below are only for clients
without OAuth: sign in to [landed](https://app.landed.jobs) and create an API token in Settings.

### Claude Code

The one-liner (CLI):

```bash
claude mcp add --transport http landed-jobs https://mcp.landed.jobs/mcp
```

Then in a session: `/mcp`, pick landed and sign in, to confirm it's connected, and try the `find_jobs` prompt.

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

Restart Claude Desktop.

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

Then enable **landed-jobs** under **Settings → MCP**.

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

### Gemini CLI

Edit `~/.gemini/settings.json` (or `.gemini/settings.json` in your project):

```jsonc
{
  "mcpServers": {
    "landed-jobs": {
      "httpUrl": "https://mcp.landed.jobs/mcp",
      "headers": { "Authorization": "Bearer lnd_live_your_token_here" }
    }
  }
}
```

Restart `gemini` and run `/mcp` to see the tools.

### Any other MCP client

Point it at `https://mcp.landed.jobs/mcp` using the **Streamable HTTP** transport and pass
`Authorization: Bearer <token>`. Quick sanity check from a terminal:

```bash
curl -s -X POST https://mcp.landed.jobs/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Registries

Landed is listed on the [Official MCP Registry](https://registry.modelcontextprotocol.io) as
`io.github.landedjobs/landed`, and on [Smithery](https://smithery.ai/servers/landedjobs/landed) as
`landedjobs/landed`. Clients that read either registry can discover and install it without any
manual configuration.

---

## Tools

| Tool | What it does | Access |
|------|--------------|:---:|
| `search_jobs` | Ranked, fit-scored jobs, each with a `productUrl` to the job in the landed app (apply there). Fill the structured fields (role, seniority, locations, remote, skills, minComp); free-text `query` is matched only as a title. | signed in, daily limit by plan |
| `get_learning_content` | Curated interview-prep, portfolio, and roadmap resources. | signed in |

`search_jobs` returns one of three statuses:

- `ok`: `jobs` (each with `jobId`, `title`, `company`, `location`, `fitLabel`, `oneLineWhy`, `productUrl`).
- `sign_in_required`: the token was not accepted; reconnect landed in your AI app.
- `limit_reached`: the day's searches for the plan are used; the result has `message`, `limit` and `resetsAt`.

## Prompts (guided workflows)

MCP **prompts** are reusable, user-invocable skills that teach the agent how to chain the tools and
present results as a clean shortlist — never raw JSON. In most clients they show up as slash-commands.

| Prompt | Args | What it guides |
|--------|------|----------------|
| `find_jobs` | `describe?` | Search, then present a ranked, fit-scored shortlist with links to apply in landed. |
| `prep_for_role` | `role?` | Pull learning resources for a role and suggest a study order. |

The server also ships always-on `instructions` (access and limits, tool overview, presentation rules)
that compliant clients load automatically.

### Location parameters

Location eligibility is structured rather than keyword-matched:

- `locations`: physical cities/countries, with country included for ambiguous cities, e.g. `["Bengaluru, India"]`
- `countryCodes`: ISO alpha-2 remote/base eligibility, e.g. `["IN"]`
- `regionCodes`: `apac`, `emea`, or `americas`
- `workAuthorizationCountryCodes`: ISO alpha-2 work-authorization countries
- `remote`: work mode (`remote`, `hybrid`, or `onsite`)

The hosted API resolves human city labels to stable place identities. Callers must not invent place
IDs. The legacy `regions` field remains accepted for compatibility.

---

## Auth & pricing

The server uses OAuth 2.1 (authorization code with PKCE, dynamic client registration). A request with no
token gets `401` with `WWW-Authenticate: Bearer resource_metadata="https://mcp.landed.jobs/.well-known/oauth-protected-resource"`,
and the client discovers the rest from there:

- `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`
- `POST /oauth/register` (dynamic client registration), `POST /oauth/token` (code exchange)
- the Allow screen at `https://app.landed.jobs/oauth/authorize`

The token an app receives is an ordinary landed API token, listed in Settings → API tokens. A token you
create there by hand works the same way, as `Authorization: Bearer lnd_live_…`. Privacy:
[mcp.landed.jobs/privacy](https://mcp.landed.jobs/privacy).

Each search counts against a daily limit set by your landed plan:

| Plan | Searches per day |
|------|:---:|
| Free | 10 |
| Plus | 50 |
| Pro and Max | 200 |

At the limit, `search_jobs` returns `limit_reached` with when it resets.

---

## Architecture

This repository is a **thin, self-hostable proxy**. It speaks MCP and forwards to the hosted Landed
API — it holds **no database, no ranking engine, and no job data**.

```
   MCP client                 landed-mcp (this repo)              Landed API
 ┌─────────────┐   HTTP    ┌────────────────────────┐  HTTPS   ┌────────────────────────┐
 │ Claude /    │ ───────▶  │ • MCP protocol + tools │ ──────▶  │ • search engine        │
 │ Cursor /    │  /mcp     │ • forwards caller creds│          │ • job corpus           │
 │ VS Code …   │ ◀───────  │ • local learning list  │ ◀──────  │ • auth · plan limits   │
 └─────────────┘           └────────────────────────┘          └────────────────────────┘
```

The proxy forwards the caller's API token to the Landed API, which validates it, runs the search,
counts it against the plan limit, and returns the result. A request without a token is answered by the
proxy itself with `401`, so it never reaches the API. The `get_learning_content` catalog is static and lives in this repo
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

### Stdio and Docker

For clients that start the server as a process, `pnpm start:stdio` speaks MCP over stdio instead of HTTP. Set `LANDED_API_TOKEN` to your API token; without it `search_jobs` answers `sign_in_required`.

```bash
docker build -t landed-mcp .
docker run -i --rm landed-mcp
```

The image runs the stdio server against the hosted API.

### Environment variables

| Variable | Required | Default | Description |
|----------|:---:|---------|-------------|
| `LANDED_API_BASE` | ✓ | `http://localhost:8000/api/v1` | Hosted Landed API base, **including** the `/api/v1` prefix. |
| `LANDED_INTERNAL_SECRET` | ✓ | — | Shared secret authenticating this proxy to the API (must match the server's `INTERNAL_SERVICE_SECRET`). |
| `PORT` | | `8090` | HTTP port to listen on. |
| `CORS_ORIGINS` | | `*` | Comma-separated allowlist of origins, or `*`. |
| `RATE_LIMIT_PER_MIN` | | `60` | Per-IP first-line request cap. Each person's plan search limit is the real economic cap. |
| `LANDED_SIGNUP_URL` | | `https://app.landed.jobs` | Sign-up link in `sign_in_required` answers. |

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
pnpm test          # input-contract and search-result tests
pnpm start         # run once
```

The repository includes official MCP Registry metadata in [`server.json`](server.json). It describes
the public Streamable HTTP endpoint but does not imply that the server has been submitted to or
accepted by any external registry.

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
    ├── prompts.ts           # find_jobs / prep_for_role
    ├── catalog/learning.ts  # static, public learning resources
    └── tools/               # search_jobs · get_learning_content
```

Stack: TypeScript · Express · [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) · Zod. No database, no build step (runs on `tsx`).

---

## Contributing

Issues and PRs welcome — bug fixes, new client setup guides, and learning-catalog additions especially.
Please run `pnpm check-types` and `pnpm test` before opening a PR. For private vulnerability reports,
follow [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Landed
