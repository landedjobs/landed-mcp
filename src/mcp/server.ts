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
search_jobs requires a landed API token, sent as \`Authorization: Bearer <token>\`. Without one it returns status "sign_in_required": tell the user to sign in to landed (signupUrl), create an API token in Settings, and add it to this connection. Each search counts against the person's daily search limit for their plan: Free 10, Plus 50, Pro and Max 200. At the limit it returns status "limit_reached": show its message, when it resets, and the upgradeUrl. get_learning_content is open to everyone, with or without a token.

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
	const server = new McpServer({ name: 'landed-jobs', version: '0.2.0' }, { instructions: INSTRUCTIONS });
	registerSearchJobs(server, ctx);
	registerGetLearningContent(server, ctx);
	registerPrompts(server);
	return server;
}
