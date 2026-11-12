import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHttpServer } from '@/http/server';
import { apiClient } from '@/services/api-client';
import { config } from '@/config';

let server: Server;
let base = '';
const forwarded: { path: string; body: unknown }[] = [];
let answer: { status: number; body: unknown } = { status: 200, body: {} };

before(async () => {
	apiClient.oauth = async (path, body) => {
		forwarded.push({ path, body });
		return answer;
	};
	server = createHttpServer().listen(0);
	await new Promise(resolve => server.once('listening', resolve));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server.close());

test('no token: 401 with where to sign in', async () => {
	const res = await fetch(`${base}/mcp`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
	});
	assert.equal(res.status, 401);
	const header = res.headers.get('www-authenticate') ?? '';
	assert.match(header, /^Bearer /);
	assert.ok(header.includes(`resource_metadata="${config.publicUrl}/.well-known/oauth-protected-resource"`));
});

test('publishes the resource and authorization server metadata', async () => {
	const resource = (await (await fetch(`${base}/.well-known/oauth-protected-resource`)).json()) as Record<string, unknown>;
	assert.equal(resource.resource, `${config.publicUrl}/mcp`);
	assert.deepEqual(resource.authorization_servers, [config.publicUrl]);

	const meta = (await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json()) as Record<string, unknown>;
	assert.equal(meta.issuer, config.publicUrl);
	assert.equal(meta.authorization_endpoint, `${config.appUrl}/oauth/authorize`);
	assert.equal(meta.token_endpoint, `${config.publicUrl}/oauth/token`);
	assert.equal(meta.registration_endpoint, `${config.publicUrl}/oauth/register`);
	assert.deepEqual(meta.code_challenge_methods_supported, ['S256']);
	assert.deepEqual(meta.token_endpoint_auth_methods_supported, ['none']);
});

test('forwards registration and a form-encoded token request', async () => {
	answer = { status: 201, body: { client_id: 'lnd_mcp_1' } };
	const reg = await fetch(`${base}/oauth/register`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ client_name: 'Claude', redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] }),
	});
	assert.equal(reg.status, 201);
	assert.deepEqual(await reg.json(), { client_id: 'lnd_mcp_1' });

	answer = { status: 200, body: { access_token: 'lnd_live_x', token_type: 'Bearer' } };
	const tok = await fetch(`${base}/oauth/token`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ grant_type: 'authorization_code', code: 'c', client_id: 'lnd_mcp_1', redirect_uri: 'https://claude.ai/cb', code_verifier: 'v' }),
	});
	assert.equal(tok.status, 200);
	assert.equal(tok.headers.get('cache-control'), 'no-store');
	assert.deepEqual({ ...forwarded.at(-1), body: { ...(forwarded.at(-1)?.body as object) } }, {
		path: 'token',
		body: { grant_type: 'authorization_code', code: 'c', client_id: 'lnd_mcp_1', redirect_uri: 'https://claude.ai/cb', code_verifier: 'v' },
	});
});

test('turns an API refusal into an OAuth error', async () => {
	answer = { status: 400, body: { message: 'The code is invalid or already used', code: 'invalid_grant' } };
	const res = await fetch(`${base}/oauth/token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
	assert.equal(res.status, 400);
	assert.deepEqual(await res.json(), { error: 'invalid_grant', error_description: 'The code is invalid or already used' });
});

test('serves the privacy page', async () => {
	const res = await fetch(`${base}/privacy`);
	assert.equal(res.status, 200);
	assert.match(await res.text(), /Disconnecting/);
});
