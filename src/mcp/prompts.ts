import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// MCP "prompts" are the server's skills — reusable, user-invocable workflow templates that teach the
// calling agent how to chain the tools and, crucially, how to present the results to the end user (never
// raw JSON). Each returns a single user-role message the client injects as guidance.

function userText(text: string) {
	return { messages: [{ role: 'user' as const, content: { type: 'text' as const, text } }] };
}

const FIND_JOBS = `The user is looking for jobs described as: "{describe}".

1. Call **search_jobs**. Fill the structured fields from their words: role, seniority, physical \`locations\`, remote (remote|hybrid|onsite), skills, minComp + currency, and when known remote-eligibility \`countryCodes\` / \`regionCodes\`, work authorization, industries, companyStages, avoid. Include the country in ambiguous city labels. Never invent place IDs. The free-text \`query\` is matched only as a job title, so put the title there and everything else in the fields.
2. If \`status\` is "sign_in_required", tell the user to reconnect landed in this app and sign in again.
3. If \`status\` is "limit_reached", show the \`message\` and when the limit resets (\`resetsAt\`).
4. Otherwise present the ranked results as a clean, scannable list — NOT raw JSON. For each job show:
   - **Title** · company · location
   - a fit badge from \`fitLabel\` (excellent / good / borderline)
   - the \`oneLineWhy\` (why it fits)
   - a markdown link to \`productUrl\`, the job in the landed app, where they apply
5. After listing, offer free prep for the role with **get_learning_content**.`;

const PREP_FOR_ROLE = `The user wants to prepare for **{role}** roles.

1. Call **get_learning_content** with role and/or a topic (e.g. "RAG", "system design").
2. Present the items grouped by category — interview-prep, portfolio, roadmap — each as a markdown link (title → url) with its one-line description.
3. Suggest a sensible order: skim the roadmap, drill the interview-prep questions and company guides, then build one or two portfolio projects to show.`;

export function registerPrompts(server: McpServer): void {
	server.registerPrompt(
		'find_jobs',
		{
			title: 'Find & present jobs',
			description: 'Search Landed for matching jobs and present a ranked, fit-scored shortlist with links to apply in landed, then offer learning resources.',
			argsSchema: { describe: z.string().optional().describe('What the user is looking for, in their own words.') },
		},
		({ describe }) => userText(FIND_JOBS.replace('{describe}', describe?.trim() || 'the kind of role they described'))
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
