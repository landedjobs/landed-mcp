import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from '@/config';
import { buildServer } from '@/mcp/server';
import { rateLimit } from '@/http/rate-limit';
import type { Auth } from '@/services/api-client';

const PRODUCT_TOKEN_PREFIX = 'lnd_live_';
const ANON_PREFIX = 'lnd_anon_';

function methodNotAllowed(_req: Request, res: Response): void {
	res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed. Use POST for MCP.' }, id: null });
}

function clientIp(req: Request): string | undefined {
	const fwd = req.headers['x-forwarded-for'];
	if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
	return req.socket?.remoteAddress ?? undefined;
}

// Read the forwarded caller credentials off the request. We do NOT validate here — the Landed API validates
// the token and enforces the freemium meter. A valid-looking product token means "authenticated"; otherwise
// the caller is anonymous, reusing their echoed anon token or getting a freshly minted one.
function readAuth(req: Request): Auth {
	const bearer = req.headers.authorization?.split(' ')[1]?.trim();
	const token = bearer && bearer.startsWith(PRODUCT_TOKEN_PREFIX) ? bearer : undefined;
	const header = req.headers['x-landed-anon'];
	const existing = typeof header === 'string' && header.startsWith(ANON_PREFIX) ? header : undefined;
	return { token, anonId: existing ?? `${ANON_PREFIX}${randomUUID()}`, ip: clientIp(req) };
}

export function createHttpServer(): Express {
	const app = express();
	app.use(express.json({ limit: '1mb' }));
	app.use(
		cors({
			origin: config.http.cors === '*' ? true : config.http.cors.split(',').map(o => o.trim()),
			exposedHeaders: ['X-Landed-Anon'],
		})
	);

	app.get('/healthz', (_req, res) => res.json({ ok: true }));

	// Stateless Streamable HTTP: build a fresh server + transport per request so tools capture this caller's
	// credentials, and tear both down when the response closes.
	app.post('/mcp', rateLimit, async (req: Request, res: Response) => {
		const auth = readAuth(req);
		// Echo the (possibly freshly-minted) anon token for anonymous callers so a cooperating client can
		// resend it and keep its budget across sessions.
		if (!auth.token) res.setHeader('X-Landed-Anon', auth.anonId);

		const server = buildServer({ auth });
		const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
		res.on('close', () => {
			void transport.close();
			void server.close();
		});

		try {
			await server.connect(transport);
			await transport.handleRequest(req, res, req.body);
		} catch (err) {
			console.error('mcp request failed', err);
			if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
		}
	});

	// Stateless mode has no server-initiated stream or session to resume/terminate.
	app.get('/mcp', methodNotAllowed);
	app.delete('/mcp', methodNotAllowed);

	return app;
}
