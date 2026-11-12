import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiClient } from '@/services/api-client';
import { searchJobsShape, type SearchJobsInput } from '@/mcp/tools/lib/search-input';
import { errorResult } from '@/mcp/tools/lib/respond';
import { runSearch } from '@/mcp/tools/lib/search';
import type { ToolContext } from '@/mcp/server';
import { reportToolFailure } from '@/instrument';

const DESCRIPTION = `Search landed's live job corpus and get a ranked, fit-scored shortlist for the signed-in person.
Each search counts against the person's daily search limit. Over the limit the result is status "limit_reached" with a message and when it resets.
Fill the structured fields from the user's words: role, seniority, locations, remote, skills, minComp (with currency), and the rest when known (remote-eligibility countryCodes/regionCodes, industries, companyStages, avoid). The free-text "query" is matched only as a job title, so it does not replace those fields. Use ISO country codes and canonical region codes; include the country in ambiguous city labels; never invent place IDs.
Each job carries productUrl, a link to the job in the landed app; people apply there.`;

export function registerSearchJobs(server: McpServer, ctx: ToolContext): void {
	server.registerTool('search_jobs', {
			title: 'Search jobs',
			description: DESCRIPTION,
			inputSchema: searchJobsShape,
			annotations: { title: 'Search jobs', readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
		}, async (args: SearchJobsInput) => {
		try {
			return await runSearch(ctx.auth, args, apiClient.search);
		} catch (err) {
			reportToolFailure('search_jobs', err);
			return errorResult(err instanceof Error ? err.message : 'Search failed.');
		}
	});
}
