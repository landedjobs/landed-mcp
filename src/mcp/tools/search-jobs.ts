import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiClient } from '@/services/api-client';
import { searchJobsShape, type SearchJobsInput } from '@/mcp/tools/lib/search-input';
import { budgetExhaustedResult, errorResult, jsonResult } from '@/mcp/tools/lib/respond';
import type { ToolContext } from '@/mcp/server';

const DESCRIPTION = `Search Landed's live job corpus for AI-native roles and get a ranked, fit-scored shortlist.
Fill the structured fields (role, skills, remote, seniority, comp, industries…) from the user's request — they drive the ranking. You may also pass a free-text "query"; it's parsed into the same filters and used as a semantic nudge.
Free tier: up to a shared budget of jobs for anonymous callers (each returned job counts). Authenticated callers (Authorization: Bearer <API token>) get unlimited, brief-personalized results.`;

export function registerSearchJobs(server: McpServer, ctx: ToolContext): void {
	server.registerTool('search_jobs', { title: 'Search jobs', description: DESCRIPTION, inputSchema: searchJobsShape }, async (args: SearchJobsInput) => {
		try {
			const res = await apiClient.search(ctx.auth, args);
			if (res.status === 'budget_exhausted') return budgetExhaustedResult(res);
			return jsonResult({ jobs: res.jobs, total: res.total, returned: res.returned, freemium: res.freemium });
		} catch (err) {
			return errorResult(err instanceof Error ? err.message : 'Search failed.');
		}
	});
}
