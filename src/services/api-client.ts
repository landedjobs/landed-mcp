import { config } from '@/config';
import type { JobFormResponse, SearchResponse } from '@/types';
import type { SearchJobsInput } from '@/mcp/tools/lib/search-input';

// The end-caller identity we forward to the Landed API on every request. `token` is the caller's product
// API token (lnd_live_…) if they presented one; otherwise `anonId` is the anon token we minted/echoed and
// `ip` keys their freemium budget. The proxy itself authenticates with the shared secret (header below).
export interface Auth {
	token?: string;
	anonId: string;
	ip?: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(`${config.api.base}${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-internal-secret': config.api.secret },
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
		return post('/mcp/search', { token: auth.token, anonId: auth.anonId, ip: auth.ip, ...input });
	},
	jobForm(auth: Auth, jobId: string): Promise<JobFormResponse> {
		return post('/mcp/job-form', { token: auth.token, anonId: auth.anonId, ip: auth.ip, jobId });
	},
};
