import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// MCP "prompts" are the server's skills — reusable, user-invocable workflow templates that teach the
// calling agent how to chain the tools and, crucially, how to present the results to the end user (never
// raw JSON). Each returns a single user-role message the client injects as guidance.

function userText(text: string) {
	return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }] };
}

const FIND_JOBS = `The user is looking for jobs described as: "{describe}".

1. Call **search_jobs**. Read their request and fill the structured fields you can infer — role, skills, seniority, remote (remote|hybrid|onsite), locations, minComp + currency, industries, companyStages, avoid. You may also pass their words verbatim as \`query\`; the server parses it into the same filters and uses it as a semantic nudge.
2. Present the ranked results as a clean, scannable list — NOT raw JSON. For each job show:
   - **Title** · company · location
   - a fit badge from \`fitLabel\` (excellent / good / borderline)
   - the \`oneLineWhy\` (why it fits)
   - a markdown apply link using \`applyUrl\` (fall back to \`url\`)
3. After listing, offer the two next steps: (a) prepare an application for any job — call **prepare_application** / **get_job_form** with its \`jobId\`; (b) get free prep — call **get_learning_content**.
4. Access note: read the \`freemium\` block. Anonymous callers spend one job-unit per returned job. If \`jobUnitsRemaining\` is low or the tool reports the budget is exhausted, tell the user they can create a free API token in Landed → Settings and add it as an \`Authorization: Bearer\` header for unlimited, brief-personalized search.`;

const PREPARE_APPLICATION = `Help the user prepare their application for job \`{jobId}\`.

1. Call **get_job_form** with this jobId.
2. If \`status\` is "not_available", tell the user the structured form isn't captured for this role and give them the \`applyUrl\` to apply directly.
3. If \`status\` is "fetched", work through \`fieldsByGroup\` group by group:
   - **standard** — fill these from what you already know about the user (name, email, phone, links, résumé). Ask for anything you don't have; never invent contact details.
   - **screening** — draft a strong, specific answer for each question, grounded in the user's real experience and skills. Present them as a table (question → your draft) and invite edits.
   - **eeo** — leave blank. Explain these are optional self-identification questions only the user should fill in.
4. Close with the \`applyUrl\` so they can submit.`;

const PREP_FOR_ROLE = `The user wants to prepare for **{role}** roles.

1. Call **get_learning_content** with role and/or a topic (e.g. "RAG", "system design").
2. Present the items grouped by category — interview-prep, portfolio, roadmap — each as a markdown link (title → url) with its one-line description.
3. Suggest a sensible order: skim the roadmap, drill the interview-prep questions and company guides, then build one or two portfolio projects to show. This tool is always free.`;

export function registerPrompts(server: McpServer): void {
	server.registerPrompt(
		'find_jobs',
		{
			title: 'Find & present jobs',
			description: 'Search Landed for matching jobs and present a ranked, fit-scored shortlist, then offer to prep an application or pull learning resources.',
			argsSchema: { describe: z.string().optional().describe('What the user is looking for, in their own words.') },
		},
		({ describe }) => userText(FIND_JOBS.replace('{describe}', describe?.trim() || 'the kind of role they described'))
	);

	server.registerPrompt(
		'prepare_application',
		{
			title: 'Prepare a job application',
			description: 'Fetch a job’s application form and draft answers — auto-fill standard fields, draft screening answers from experience, leave EEO to the user.',
			argsSchema: { jobId: z.string().describe('The jobId from a search_jobs result.') },
		},
		({ jobId }) => userText(PREPARE_APPLICATION.replace('{jobId}', jobId))
	);

	server.registerPrompt(
		'prep_for_role',
		{
			title: 'Prep for a role',
			description: 'Pull Landed’s free interview-prep, portfolio, and roadmap resources for a target role and suggest a study order.',
			argsSchema: { role: z.string().optional().describe('Target role, e.g. "AI Engineer", "AI PM", "GTM Engineer".') },
		},
		({ role }) => userText(PREP_FOR_ROLE.replace('{role}', role?.trim() || 'their target'))
	);
}
