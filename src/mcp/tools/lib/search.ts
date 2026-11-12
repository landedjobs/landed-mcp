import { config } from '@/config';
import { jsonResult } from '@/mcp/tools/lib/respond';
import { entryLink } from '@/mcp/tools/lib/entry-link';
import type { SearchJobsInput } from '@/mcp/tools/lib/search-input';
import type { Auth, McpClient } from '@/services/api-client';
import type { SearchResponse } from '@/types';

export const SIGN_IN_MESSAGE = 'Sign in to landed, create an API token in Settings, and send it as Authorization: Bearer <token>.';

export type SearchFn = (auth: Auth, input: SearchJobsInput) => Promise<SearchResponse>;

export function signInRequiredResult(message?: string, signupUrl?: string, client?: McpClient) {
	return jsonResult({ status: 'sign_in_required', message: message || SIGN_IN_MESSAGE, signupUrl: entryLink(signupUrl || config.signupUrl, client) });
}

// A caller without an API token is answered here, so anonymous traffic never reaches the Landed API.
export async function runSearch(auth: Auth, input: SearchJobsInput, search: SearchFn) {
	if (!auth.token) return signInRequiredResult(undefined, undefined, auth.client);
	const res = await search(auth, input);
	if (res.status === 'sign_in_required') return signInRequiredResult(res.message, res.signupUrl, auth.client);
	if (res.status === 'limit_reached') {
		return jsonResult({ status: 'limit_reached', message: res.message, limit: res.limit, resetsAt: res.resetsAt, upgradeUrl: entryLink(res.upgradeUrl, auth.client) });
	}
	const jobs = res.jobs.map(job => ({ ...job, productUrl: entryLink(job.productUrl, auth.client, job.jobId) }));
	return jsonResult({ status: 'ok', jobs, total: res.total, returned: res.returned });
}
