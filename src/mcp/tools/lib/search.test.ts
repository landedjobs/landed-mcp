import assert from 'node:assert/strict';
import test from 'node:test';
import { runSearch, SIGN_IN_MESSAGE, type SearchFn } from './search';
import type { SearchResponse } from '../../../types';

function parse(result: { content: { text: string }[] }) {
	return JSON.parse(result.content[0].text);
}

function stub(response: SearchResponse) {
	const calls: unknown[] = [];
	const fn: SearchFn = async (auth, input) => {
		calls.push({ auth, input });
		return response;
	};
	return { fn, calls };
}

const TOKEN = { token: 'lnd_live_test' };

test('no token: sign_in_required without calling the API', async () => {
	const { fn, calls } = stub({ status: 'ok', jobs: [] });
	const out = parse(await runSearch({ ip: '1.2.3.4' }, { role: 'AI Engineer' }, fn));
	assert.equal(calls.length, 0);
	assert.equal(out.status, 'sign_in_required');
	assert.equal(out.message, SIGN_IN_MESSAGE);
	assert.match(out.signupUrl, /^https:\/\//);
});

test('ok: relays jobs with productUrl', async () => {
	const job = { jobId: 'j1', title: 'AI Engineer', fitLabel: 'good', oneLineWhy: 'RAG work', productUrl: 'https://app.landed.jobs/jobs/j1' };
	const { fn, calls } = stub({ status: 'ok', jobs: [job], total: 1, returned: 1 });
	const out = parse(await runSearch(TOKEN, { role: 'AI Engineer' }, fn));
	assert.equal(calls.length, 1);
	assert.equal(out.status, 'ok');
	assert.deepEqual(out.jobs, [job]);
});

test('limit_reached: message, reset time and upgrade link', async () => {
	const { fn } = stub({ status: 'limit_reached', limit: 10, resetsAt: '2026-11-13T00:00:00.000Z', upgradeUrl: 'https://app.landed.jobs/pricing', message: 'You have used your 10 searches today.' });
	const out = parse(await runSearch(TOKEN, {}, fn));
	assert.deepEqual(out, { status: 'limit_reached', message: 'You have used your 10 searches today.', limit: 10, resetsAt: '2026-11-13T00:00:00.000Z', upgradeUrl: 'https://app.landed.jobs/pricing' });
});

test('sign_in_required from the API keeps its message and link', async () => {
	const { fn } = stub({ status: 'sign_in_required', message: 'Token revoked. Create a new one in Settings.', signupUrl: 'https://app.landed.jobs/signup' });
	const out = parse(await runSearch(TOKEN, {}, fn));
	assert.deepEqual(out, { status: 'sign_in_required', message: 'Token revoked. Create a new one in Settings.', signupUrl: 'https://app.landed.jobs/signup' });
});
