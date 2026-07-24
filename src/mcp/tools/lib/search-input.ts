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
	locations: z.array(z.string()).max(20).optional().describe('Preferred physical cities/countries as exact labels; include country for ambiguous cities, e.g. ["Bengaluru, India", "London, UK"]. Resolved server-side to stable place IDs.'),
	regions: z.array(z.string()).max(20).optional().describe('Legacy human-readable remote eligibility regions/countries, e.g. ["APAC", "India"]. Prefer regionCodes/countryCodes when known.'),
	countryCodes: z.array(z.string().regex(/^[A-Z]{2}$/)).max(20).optional().describe('ISO 3166-1 alpha-2 countries where the job may be based or remotely eligible, e.g. ["IN"].'),
	regionCodes: z.array(z.enum(['apac', 'emea', 'americas'])).max(3).optional().describe('Canonical remote eligibility regions.'),
	workAuthorizationCountryCodes: z.array(z.string().regex(/^[A-Z]{2}$/)).max(20).optional().describe('ISO country codes where the candidate is authorized to work.'),
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
