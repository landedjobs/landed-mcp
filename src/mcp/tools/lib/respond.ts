// MCP tool results carry text content; we return JSON so the calling agent can parse structured data.
export function jsonResult(payload: unknown) {
	return { content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }] };
}

export function errorResult(message: string, extra?: Record<string, unknown>) {
	return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message, ...extra }, null, 2) }], isError: true };
}
