import express, { Router, type Request, type Response } from 'express';
import { config } from '@/config';
import { apiClient } from '@/services/api-client';
import { reportError } from '@/instrument';

// "Sign in with landed" (OAuth 2.1, authorization code + PKCE, public clients). This server is the
// protected resource and the issuer: it publishes the metadata Claude, ChatGPT and Gemini discover, and
// forwards registration and code exchange to the Landed API. The Allow screen lives on app.landed.jobs.

export const resourceUrl = () => `${config.publicUrl}/mcp`;
export const resourceMetadataUrl = () => `${config.publicUrl}/.well-known/oauth-protected-resource`;

export const SCOPE = 'jobs:read';

export function protectedResourceMetadata() {
	return {
		resource: resourceUrl(),
		authorization_servers: [config.publicUrl],
		bearer_methods_supported: ['header'],
		scopes_supported: [SCOPE],
		resource_name: 'landed',
		resource_documentation: 'https://www.landed.jobs/mcp',
	};
}

export function authorizationServerMetadata() {
	return {
		issuer: config.publicUrl,
		authorization_endpoint: `${config.appUrl}/oauth/authorize`,
		token_endpoint: `${config.publicUrl}/oauth/token`,
		registration_endpoint: `${config.publicUrl}/oauth/register`,
		response_types_supported: ['code'],
		grant_types_supported: ['authorization_code'],
		code_challenge_methods_supported: ['S256'],
		token_endpoint_auth_methods_supported: ['none'],
		scopes_supported: [SCOPE],
		service_documentation: 'https://www.landed.jobs/mcp',
		op_policy_uri: `${config.publicUrl}/privacy`,
	};
}

// The Landed API answers { message, code }; apps expect RFC 6749 { error, error_description }.
function oauthBody(status: number, body: unknown) {
	if (status < 400) return body;
	const { code, message } = (body ?? {}) as { code?: string; message?: string };
	return { error: code ?? (status >= 500 ? 'server_error' : 'invalid_request'), error_description: message ?? 'Request failed' };
}

async function forward(path: 'register' | 'token', req: Request, res: Response) {
	try {
		const { status, body } = await apiClient.oauth(path, req.body ?? {});
		res.setHeader('Cache-Control', 'no-store');
		res.status(status >= 500 ? 502 : status).json(oauthBody(status, body));
	} catch (err) {
		reportError(err, `oauth_${path}`);
		res.status(502).json({ error: 'temporarily_unavailable', error_description: 'landed could not be reached. Try again.' });
	}
}

const PRIVACY = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>landed MCP privacy</title><style>body{font:16px/1.6 -apple-system,system-ui,sans-serif;max-width:680px;margin:40px auto;padding:0 16px;color:#1d1c1a}
h1{font-size:26px}h2{font-size:18px;margin-top:28px}a{color:#d9441a}@media(prefers-color-scheme:dark){body{background:#17171a;color:#ecebe8}}</style></head><body>
<h1>landed MCP server: privacy</h1>
<p>This covers the landed connector at <code>mcp.landed.jobs</code>, used from Claude, ChatGPT, Gemini and other AI apps. The rest of landed is covered by <a href="https://www.landed.jobs/privacy">landed's privacy policy</a>.</p>
<h2>What it can do</h2>
<p>Read-only: search jobs ranked against your landed profile, and read free interview-prep resources. It can't apply for you, change your profile, or see your applications or messages.</p>
<h2>What we log</h2>
<p>For each tool call: the tool, the app and version that called it, your landed account, whether it worked, and how long it took. For a search, the app sends the search fields (role, location, skills and so on) that landed needs to run it. We never receive the rest of your conversation with the AI app.</p>
<h2>Signing in</h2>
<p>When you connect, you sign in on app.landed.jobs and choose Allow. The app gets a landed token, which we store only as a hash. Search counts against your landed plan's daily limit.</p>
<h2>Disconnecting</h2>
<p>Remove the connection in landed under Settings → API tokens, or remove the connector in the AI app. A removed token stops working at once.</p>
<h2>Contact</h2>
<p><a href="mailto:support@landed.jobs">support@landed.jobs</a></p>
</body></html>`;

export function oauthRouter(): Router {
	const router = Router();
	const prm = (_req: Request, res: Response) => res.json(protectedResourceMetadata());
	const asm = (_req: Request, res: Response) => res.json(authorizationServerMetadata());
	router.get('/.well-known/oauth-protected-resource', prm);
	router.get('/.well-known/oauth-protected-resource/mcp', prm);
	router.get('/.well-known/oauth-authorization-server', asm);
	router.get('/.well-known/oauth-authorization-server/mcp', asm);
	router.get('/.well-known/openid-configuration', asm);
	router.post('/oauth/register', (req, res) => forward('register', req, res));
	router.post('/oauth/token', express.urlencoded({ extended: false }), (req, res) => forward('token', req, res));
	router.get('/privacy', (_req, res) => res.type('html').send(PRIVACY));
	return router;
}
