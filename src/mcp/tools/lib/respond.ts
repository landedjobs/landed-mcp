import type { SearchResponse } from '@/types';

// MCP tool results carry text content; we return JSON so the calling agent can parse structured data.
export function jsonResult(payload: unknown) {
	return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

export function errorResult(message: string, extra?: Record<string, unknown>) {
	return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message, ...extra }, null, 2) }], isError: true };
}

// Rendered when the Landed API reports the anonymous caller's free budget is spent. The server owns the
// message + signup URL; we just relay them so the agent can tell the user how to continue.
export function budgetExhaustedResult(res: SearchResponse) {
	return errorResult('Free job-unit budget exhausted.', {
		howToContinue: `Sign up at ${res.signupUrl}, create an API token in Settings, and pass it as the "Authorization: Bearer <token>" header on the MCP connection for unlimited, personalized search.`,
		signupUrl: res.signupUrl,
		freemium: res.freemium,
	});
}
