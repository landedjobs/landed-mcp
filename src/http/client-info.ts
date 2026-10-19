import type { Request } from 'express';
import type { Auth, McpClient } from '@/services/api-client';

// Stateless transport: `initialize` and later `tools/call` arrive as separate requests on separate servers,
// so the handshake's clientInfo is remembered here, keyed by the caller (token, else IP) plus User-Agent.
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 10_000;
const seen = new Map<string, { client: McpClient; at: number }>();

function keyFor(req: Request, auth: Auth): string {
	return `${auth.token ?? auth.ip ?? ''}|${req.headers['user-agent'] ?? ''}`;
}

function fromInitialize(body: unknown): McpClient | undefined {
	const msg = body as { method?: unknown; params?: { clientInfo?: { name?: unknown; version?: unknown } } } | undefined;
	if (msg?.method !== 'initialize') return undefined;
	const info = msg.params?.clientInfo;
	if (typeof info?.name !== 'string' || !info.name.trim()) return undefined;
	return { name: info.name.trim().slice(0, 100), version: typeof info.version === 'string' ? info.version.trim().slice(0, 50) : undefined };
}

export function resolveClient(req: Request, auth: Auth): McpClient | undefined {
	const key = keyFor(req, auth);
	const client = fromInitialize(req.body);
	if (client) {
		seen.delete(key);
		if (seen.size >= MAX_ENTRIES) seen.delete(seen.keys().next().value as string);
		seen.set(key, { client, at: Date.now() });
		return client;
	}
	const hit = seen.get(key);
	if (!hit) return undefined;
	if (Date.now() - hit.at > TTL_MS) {
		seen.delete(key);
		return undefined;
	}
	return hit.client;
}
