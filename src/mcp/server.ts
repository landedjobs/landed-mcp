import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Auth } from '@/services/api-client';
import { registerSearchJobs } from '@/mcp/tools/search-jobs';
import { registerGetLearningContent } from '@/mcp/tools/get-learning-content';
import { registerPrompts } from '@/mcp/prompts';

// Per-request context the tools close over: the forwarded end-caller credentials. The proxy never resolves
// identity itself (no DB) — it passes the caller's API token to the Landed API, which owns auth,
// personalization, and plan limits.
export interface ToolContext {
  auth: Auth;
}

const INSTRUCTIONS = `landed's job-search MCP server: helps a user find jobs and study for interviews.

ACCESS
The person signs in with landed when they connect this server; their landed account is sent with every call. Each search counts against their daily search limit. At the limit search_jobs returns status "limit_reached": show its message and when it resets.

TOOLS
- search_jobs: ranked, fit-scored jobs. Fill the structured fields from the user's words: role, seniority, locations, remote, skills, minComp (with currency), plus remote-eligibility country/region codes, industries, companyStages and avoid when known. The free-text \`query\` is matched only as a job title, so it never replaces those fields. Never invent place IDs. Each job has fitLabel, oneLineWhy and productUrl.
- get_learning_content: free interview-prep, portfolio, and roadmap resources.

PROMPTS (skills — invoke these for guided workflows)
- find_jobs: search and present a shortlist, then offer next steps.
- prep_for_role: pull learning resources for a target role.

PRESENTING RESULTS
Never show raw JSON to the user. Render jobs as a scannable list (title · company · location, a fit badge, the one-line why, a markdown link to productUrl). To apply, send people to the job's productUrl in the landed app.`;

// A fresh server is built per HTTP request (stateless transport) so its tools capture that request's caller
// credentials. Registration is cheap; the proxy holds no heavy singletons.
export function buildServer(ctx: ToolContext): McpServer {
	const server = new McpServer({ name: 'landed-jobs', version: '0.3.0' }, { instructions: INSTRUCTIONS });
	registerSearchJobs(server, ctx);
	registerGetLearningContent(server, ctx);
	registerPrompts(server);
	return server;
}
