import type { NextFunction, Request, Response } from 'express';
import { config } from '@/config';

// Minimal in-memory fixed-window limiter, keyed by client IP — a cheap first line of defense for the public
// endpoint (the freemium job-unit budget is the real economic cap). For a multi-instance deploy this should
// move to a shared store (e.g. Redis); single-instance is fine to start.
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function ipOf(req: Request): string {
	const fwd = req.headers['x-forwarded-for'];
	if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
	return req.socket?.remoteAddress ?? 'unknown';
}

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
	const key = ipOf(req);
	const now = Date.now();
	const entry = hits.get(key);
	if (!entry || entry.resetAt <= now) {
		hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
		return next();
	}
	entry.count += 1;
	if (entry.count > config.rateLimitPerMin) {
		res.status(429).json({ jsonrpc: '2.0', error: { code: -32029, message: 'Rate limit exceeded, slow down.' }, id: null });
		return;
	}
	next();
}

// Bound memory: drop expired windows opportunistically.
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
}, WINDOW_MS).unref();
