import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchCatalog, type LearningCategory } from '@/mcp/catalog/learning';
import { jsonResult } from '@/mcp/tools/lib/respond';
import type { ToolContext } from '@/mcp/server';

const DESCRIPTION = `Get Landed's free learning content to help the user prepare — curated interview-prep repos (real questions, company guides, worked system designs), portfolio-project catalogs, and role roadmaps from the landedjobs GitHub org.
Filter by topic, role, and/or category. Always free, for any caller.`;

const shape = {
	topic: z.string().trim().max(120).optional().describe('Free-text topic, e.g. "RAG", "system design", "evals".'),
	role: z.string().trim().max(120).optional().describe('Target role, e.g. "AI Engineer", "AI PM", "GTM Engineer".'),
	category: z.enum(['interview-prep', 'portfolio', 'roadmap', 'jobs']).optional().describe('Restrict to one category of content.'),
};

export function registerGetLearningContent(server: McpServer, _ctx: ToolContext): void {
	server.registerTool('get_learning_content', { title: 'Get learning content', description: DESCRIPTION, inputSchema: shape }, async (args: { topic?: string; role?: string; category?: LearningCategory }) => {
		const items = searchCatalog(args);
		return jsonResult({ items, count: items.length });
	});
}
