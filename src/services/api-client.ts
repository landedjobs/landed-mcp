import { config } from '@/config';
import type { JobFormResponse, SearchResponse } from '@/types';
import type { SearchJobsInput } from '@/mcp/tools/lib/search-input';

// The end-caller identity we forward to the Landed API on every request. `token` is the caller's product
// API token (lnd_live_…) if they presented one; otherwise `anonId` is the anon token we minted/echoed and
// `ip` keys their freemium budget. The proxy itself authenticates with the shared secret (header below).
export interface McpClient {
	name: string;
	version?: string;
}

export interface Auth {
	token?: string;
	anonId: string;
	ip?: string;
	client?: McpClient;
}

export type UsageStatus = 'ok' | 'error';

function headersFor(auth: Auth): Record<string, string> {
	const headers: Record<string, string> = { 'content-type': 'application/json', 'x-internal-secret': config.api.secret };
	if (auth.client?.name) headers['x-mcp-client-name'] = auth.client.name;
	if (auth.client?.version) headers['x-mcp-client-version'] = auth.client.version;
	return headers;
}

async function post<T>(auth: Auth, path: string, body: unknown): Promise<T> {
	const res = await fetch(`${config.api.base}${path}`, {
		method: 'POST',
		headers: headersFor(auth),
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		// 401 = the caller's API token was rejected upstream; surface the server's message to the agent.
		throw new Error(res.status === 401 ? text || 'Invalid or revoked API token' : `Landed API ${path} failed (${res.status})`);
	}
	return (await res.json()) as T;
}

export const apiClient = {
	search(auth: Auth, input: SearchJobsInput): Promise<SearchResponse> {
		return post(auth, '/mcp/search', { token: auth.token, anonId: auth.anonId, ip: auth.ip, ...input });
	},
	jobForm(auth: Auth, jobId: string): Promise<JobFormResponse> {
		return post(auth, '/mcp/job-form', { token: auth.token, anonId: auth.anonId, ip: auth.ip, jobId });
	},
	// For tools answered inside the proxy. Fire-and-forget: a failed log never affects the tool call.
	logUsage(auth: Auth, tool: string, status: UsageStatus, latencyMs: number): void {
		fetch(`${config.api.base}/mcp/usage-log`, {
			method: 'POST',
			headers: headersFor(auth),
			body: JSON.stringify({
				token: auth.token,
				anonId: auth.anonId,
				ip: auth.ip,
				tool,
				clientName: auth.client?.name,
				clientVersion: auth.client?.version,
				status,
				latencyMs,
			}),
			signal: AbortSignal.timeout(5000),
		}).catch(() => {});
	},
};
