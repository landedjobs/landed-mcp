import dotenv from 'dotenv';

dotenv.config({ path: '.env.dev' });
dotenv.config();

function required(key: string, fallback?: string): string {
	const value = process.env[key] ?? fallback;
	if (value === undefined) throw new Error(`Missing required env var: ${key}`);
	return value;
}

export const config = {
	// The hosted Landed API this proxy forwards to. Include the /api/v1 prefix. All the heavy lifting —
	// search engine, DB, Gemini, auth, and freemium metering — lives behind it; this server only speaks MCP.
	api: {
		base: required('LANDED_API_BASE', 'http://localhost:8000/api/v1').replace(/\/$/, ''),
		// Shared secret authenticating this proxy to the Landed API (matches the server's INTERNAL_SERVICE_SECRET).
		secret: required('LANDED_INTERNAL_SECRET', ''),
	},
	http: {
		port: Number(process.env.PORT ?? 8090),
		cors: process.env.CORS_ORIGINS ?? '*',
	},
	rateLimitPerMin: Number(process.env.RATE_LIMIT_PER_MIN ?? 60),
};
