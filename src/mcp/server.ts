import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Auth } from '@/services/api-client';
import { registerSearchJobs } from '@/mcp/tools/search-jobs';
import { registerGetJobForm } from '@/mcp/tools/get-job-form';
import { registerGetLearningContent } from '@/mcp/tools/get-learning-content';
import { registerPrompts } from '@/mcp/prompts';

// Per-request context the tools close over: the forwarded end-caller credentials. The proxy never resolves
// identity itself (no DB) — it passes the caller's API token and/or anon id to the Landed API, which owns
// auth, personalization, and the freemium meter.
export interface ToolContext {
	auth: Auth;
}

const INSTRUCTIONS = `Landed's job-search MCP server — helps a user find AI-native jobs, prepare applications, and study for interviews.

TOOLS
- search_jobs: ranked, fit-scored jobs. Fill the structured fields (role, skills, remote, seniority, comp, industries…) from the user's request; you may also pass free text as \`query\`. Returns each job's fitLabel, oneLineWhy, and applyUrl.
- get_job_form: the application form for a jobId, split into standard / screening / eeo fields for answer prep.
- get_learning_content: free interview-prep, portfolio, and roadmap resources.

PROMPTS (skills — invoke these for guided workflows)
- find_jobs: search and present a shortlist, then offer next steps.
- prepare_application: fetch a job's form and draft the answers.
- prep_for_role: pull learning resources for a target role.

PRESENTING RESULTS
Never show raw JSON to the user. Render jobs as a scannable list (title · company · location, a fit badge, the one-line why, a markdown apply link). For forms, auto-fill standard fields from the user's profile, draft screening answers from their experience, and leave EEO fields to the user.

ACCESS
Anonymous callers get a limited free budget — each returned job from search_jobs counts as one job-unit. get_job_form and get_learning_content are always free. Check the \`freemium\` block in results; when it runs low, tell the user to create an API token in Landed → Settings and send it as \`Authorization: Bearer <token>\` for unlimited, brief-personalized search. Authenticated callers are unmetered and results are ranked against their saved search brief + profile.`;

// A fresh server is built per HTTP request (stateless transport) so its tools capture that request's caller
// credentials. Registration is cheap; the proxy holds no heavy singletons.
export function buildServer(ctx: ToolContext): McpServer {
	const server = new McpServer({ name: 'landed-jobs', version: '0.1.0' }, { instructions: INSTRUCTIONS });
	registerSearchJobs(server, ctx);
	registerGetJobForm(server, ctx);
	registerGetLearningContent(server, ctx);
	registerPrompts(server);
	return server;
}
