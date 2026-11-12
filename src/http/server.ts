import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from '@/config';
import { buildServer } from '@/mcp/server';
import { rateLimit } from '@/http/rate-limit';
import { resolveClient } from '@/http/client-info';
import type { Auth } from '@/services/api-client';
import { reportError } from '@/instrument';
import { oauthRouter, resourceMetadataUrl, SCOPE } from '@/http/oauth';

const PRODUCT_TOKEN_PREFIX = 'lnd_live_';

function methodNotAllowed(_req: Request, res: Response): void {
	res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed. Use POST for MCP.' }, id: null });
}

function clientIp(req: Request): string | undefined {
	const fwd = req.headers['x-forwarded-for'];
	if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
	return req.socket?.remoteAddress ?? undefined;
}

// Read the forwarded caller credentials off the request. We do NOT validate here — the Landed API validates
// the token and enforces plan limits.
function readAuth(req: Request): Auth {
	const bearer = req.headers.authorization?.split(' ')[1]?.trim();
	const token = bearer && bearer.startsWith(PRODUCT_TOKEN_PREFIX) ? bearer : undefined;
	return { token, ip: clientIp(req) };
}

export function createHttpServer(): Express {
	const app = express();
	app.use(express.json({ limit: '1mb' }));
	app.use(
		cors({ origin: config.http.cors === '*' ? true : config.http.cors.split(',').map(o => o.trim()), exposedHeaders: ['WWW-Authenticate'] })
	);
	app.use(oauthRouter());

	app.get('/healthz', (_req, res) => res.json({ ok: true }));

	// Stateless Streamable HTTP: build a fresh server + transport per request so tools capture this caller's
	// credentials, and tear both down when the response closes.
	app.post('/mcp', rateLimit, async (req: Request, res: Response) => {
		const auth = readAuth(req);
		// No token: answer 401 with where to sign in, so the app opens "Sign in with landed".
		if (!auth.token) {
			res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${resourceMetadataUrl()}", scope="${SCOPE}"`);
			res.status(401).json({ jsonrpc: '2.0', error: { code: -32001, message: 'Sign in with landed to use this server.' }, id: null });
			return;
		}
		auth.client = resolveClient(req, auth);

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
			reportError(err, 'transport');
			if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id: null });
		}
	});

	// Stateless mode has no server-initiated stream or session to resume/terminate.
	app.get('/mcp', methodNotAllowed);
	app.delete('/mcp', methodNotAllowed);

	return app;
}
