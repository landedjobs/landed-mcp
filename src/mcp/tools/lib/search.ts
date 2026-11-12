import { config } from '@/config';
import { jsonResult } from '@/mcp/tools/lib/respond';
import type { SearchJobsInput } from '@/mcp/tools/lib/search-input';
import type { Auth } from '@/services/api-client';
import type { SearchResponse } from '@/types';

export const SIGN_IN_MESSAGE = 'Sign in to landed, create an API token in Settings, and send it as Authorization: Bearer <token>.';

export type SearchFn = (auth: Auth, input: SearchJobsInput) => Promise<SearchResponse>;

export function signInRequiredResult(message?: string, signupUrl?: string) {
	return jsonResult({ status: 'sign_in_required', message: message || SIGN_IN_MESSAGE, signupUrl: signupUrl || config.signupUrl });
}

// A caller without an API token is answered here, so anonymous traffic never reaches the Landed API.
export async function runSearch(auth: Auth, input: SearchJobsInput, search: SearchFn) {
	if (!auth.token) return signInRequiredResult();
	const res = await search(auth, input);
	if (res.status === 'sign_in_required') return signInRequiredResult(res.message, res.signupUrl);
	if (res.status === 'limit_reached') {
		return jsonResult({ status: 'limit_reached', message: res.message, limit: res.limit, resetsAt: res.resetsAt, upgradeUrl: res.upgradeUrl });
	}
	return jsonResult({ status: 'ok', jobs: res.jobs, total: res.total, returned: res.returned });
}
