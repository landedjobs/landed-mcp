import { execFileSync } from 'node:child_process';
import * as Sentry from '@sentry/node';
import dotenv from 'dotenv';

// Imported first by index.ts so Sentry can patch express before it loads. It reads env itself because
// config/index.ts has not run yet. No SENTRY_DSN_MCP (local runs, forks of this repo): nothing is sent.
dotenv.config({ path: '.env.dev' });
dotenv.config();

function deployedSha(): string | undefined {
	try {
		return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
	} catch {
		return undefined;
	}
}

const dsn = process.env.SENTRY_DSN_MCP;

if (dsn) {
	Sentry.init({
		dsn,
		environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
		release: process.env.SENTRY_RELEASE || deployedSha(),
		tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
		sendDefaultPii: false,
	});
}

// A tool call that failed for a reason the caller cannot fix: the Landed API was unreachable or answered 5xx.
// A rejected token or a spent free budget is an answer, not a fault.
export function reportToolFailure(tool: string, error: unknown): void {
	const status = (error as { status?: number } | null)?.status;
	if (status !== undefined && status < 500) return;
	Sentry.captureException(error, { tags: { service: 'mcp', tool, ...(status ? { status: String(status) } : {}) } });
}

export function reportError(error: unknown, where: string): void {
	Sentry.captureException(error, { tags: { service: 'mcp', where } });
}
