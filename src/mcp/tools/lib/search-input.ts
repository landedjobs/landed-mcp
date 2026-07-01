import { z } from 'zod';

// The structured input surface for search_jobs. Each field is described so the *calling* agent's LLM
// populates it from the user's request — the tool schema is our brief-elicitation mechanism. The proxy
// forwards these verbatim to the Landed API, which turns them (plus a Gemini-parsed `query`) into the
// engine's ranking brief.
export const searchJobsShape = {
	query: z.string().trim().max(400).optional().describe('Free-text description of the ideal job, in the user’s own words. Parsed server-side into structured filters; also used as a semantic nudge.'),
	role: z.string().trim().max(120).optional().describe('Target role or title family, e.g. "AI Engineer", "RAG Engineer", "Data Scientist".'),
	seniority: z.string().trim().max(60).optional().describe('Seniority target, e.g. "junior", "mid", "senior", "staff", "lead".'),
	skills: z.array(z.string()).max(30).optional().describe('Core skills / technologies the role should involve, e.g. ["RAG", "LangChain", "Python"].'),
	locations: z.array(z.string()).max(20).optional().describe('Preferred locations / bases, e.g. ["San Francisco", "London"].'),
	regions: z.array(z.string()).max(20).optional().describe('Acceptable remote regions, e.g. ["US", "EU"].'),
	remote: z.enum(['remote', 'hybrid', 'onsite']).optional().describe('Work mode preference.'),
	minComp: z.number().optional().describe('Minimum acceptable base compensation (numeric).'),
	currency: z.string().trim().max(8).optional().describe('Currency for minComp, e.g. "USD".'),
	industries: z.array(z.string()).max(20).optional().describe('Preferred company industries / sectors.'),
	companyStages: z.array(z.string()).max(20).optional().describe('Preferred company stages, e.g. ["seed", "series-a", "public"].'),
	avoid: z.array(z.string()).max(20).optional().describe('Companies or sectors to avoid.'),
	limit: z.number().int().min(1).max(20).optional().describe('How many jobs to return.'),
};

export const searchJobsInput = z.object(searchJobsShape);
export type SearchJobsInput = z.infer<typeof searchJobsInput>;
