import '@/instrument';
import { randomUUID } from 'node:crypto';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildServer } from '@/mcp/server';

// Local stdio entry for clients and registries (Glama) that start the server as a process. One anonymous
// caller for the life of the process; set LANDED_API_TOKEN to search with your own API token instead.
async function main(): Promise<void> {
	const token = process.env.LANDED_API_TOKEN?.trim() || undefined;
	const server = buildServer({ auth: { token, anonId: `lnd_anon_${randomUUID()}` } });
	await server.connect(new StdioServerTransport());
}

main().catch(error => {
	console.error('[mcp] stdio server failed', error);
	process.exit(1);
});
