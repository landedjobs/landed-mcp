import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '@/services/api-client';
import { errorResult, jsonResult } from '@/mcp/tools/lib/respond';
import type { ToolContext } from '@/mcp/server';

const DESCRIPTION = `Get the application form for a job (by the jobId returned from search_jobs), so you can prepare answers before the user applies.
Fields are grouped: "standard" (auto-fillable from a candidate profile via mapsTo), "screening" (free-text questions to draft from the résumé/experience), and "eeo" (leave to the user). Always free — a job's form is only reachable once you've already found the job via search_jobs.`;

const shape = { jobId: z.string().trim().min(1).describe('The jobId from a search_jobs result.') };

export function registerGetJobForm(server: McpServer, ctx: ToolContext): void {
	server.registerTool('get_job_form', { title: 'Get job application form', description: DESCRIPTION, inputSchema: shape }, async ({ jobId }: { jobId: string }) => {
		try {
			return jsonResult(await apiClient.jobForm(ctx.auth, jobId));
		} catch (err) {
			return errorResult(err instanceof Error ? err.message : 'Could not fetch form.');
		}
	});
}
