// Curated catalog of Landed's free learning content — the `landedjobs` GitHub org (interview prep,
// portfolio projects, roadmaps) surfaced by the get_learning_content tool. Static for v1; a `course`
// kind is reserved for when the courses feature lands (no Course model exists in the repo yet).

export type LearningCategory = 'interview-prep' | 'portfolio' | 'roadmap' | 'jobs';

export interface LearningItem {
	kind: 'repo' | 'course';
	slug: string;
	title: string;
	url: string;
	description: string;
	category: LearningCategory;
	roles: string[]; // lowercase role keywords for matching
	contentTypes: string[];
}

const ORG = 'https://github.com/landedjobs';

export const LEARNING_CATALOG: LearningItem[] = [
	{
		kind: 'repo',
		slug: 'awesome-ai-engineer-interview',
		title: 'Awesome AI Engineer Interview',
		url: `${ORG}/awesome-ai-engineer-interview`,
		description: '267 real interview questions, 12 company guides, and 10 worked system designs for AI engineers.',
		category: 'interview-prep',
		roles: ['ai engineer', 'llm engineer', 'ai agent engineer', 'ml engineer'],
		contentTypes: ['interview-questions', 'company-guides', 'system-design', 'concept-explainers'],
	},
	{
		kind: 'repo',
		slug: 'rag-engineer-interview-questions',
		title: 'RAG Engineer Interview Questions',
		url: `${ORG}/rag-engineer-interview-questions`,
		description: '100+ RAG-focused questions plus worked designs — retrieval, embeddings, chunking, re-ranking, eval, prod security.',
		category: 'interview-prep',
		roles: ['rag engineer', 'ai engineer', 'llm engineer'],
		contentTypes: ['interview-questions', 'system-design'],
	},
	{
		kind: 'repo',
		slug: 'ai-pm-interview-prep',
		title: 'AI PM Interview Prep',
		url: `${ORG}/ai-pm-interview-prep`,
		description: '131 questions, 10 frameworks, and case answers for AI product manager interviews.',
		category: 'interview-prep',
		roles: ['ai pm', 'ai product manager', 'product manager'],
		contentTypes: ['interview-questions', 'frameworks', 'case-answers'],
	},
	{
		kind: 'repo',
		slug: 'ai-interview-guides',
		title: 'AI Interview Guides',
		url: `${ORG}/ai-interview-guides`,
		description: 'Per-company interview process guides — rounds, format, and how to prepare.',
		category: 'interview-prep',
		roles: ['ai engineer', 'ml engineer', 'ai pm', 'data scientist'],
		contentTypes: ['company-guides'],
	},
	{
		kind: 'repo',
		slug: 'ai-interview-questions',
		title: 'AI Interview Questions',
		url: `${ORG}/ai-interview-questions`,
		description: 'Real vs. likely interview questions, grouped by company, sourced from public and candidate reports.',
		category: 'interview-prep',
		roles: ['ai engineer', 'ml engineer', 'data scientist'],
		contentTypes: ['interview-questions', 'company-guides'],
	},
	{
		kind: 'repo',
		slug: 'ai-engineer-portfolio-projects',
		title: 'AI Engineer Portfolio Projects',
		url: `${ORG}/ai-engineer-portfolio-projects`,
		description: '85+ buildable portfolio projects across 10 themes — RAG, agents, evals, fine-tuning, multimodal, serving, and more.',
		category: 'portfolio',
		roles: ['ai engineer', 'llm engineer', 'ml engineer', 'ai agent engineer'],
		contentTypes: ['projects'],
	},
	{
		kind: 'repo',
		slug: 'projects-to-land-an-ai-job',
		title: 'Projects to Land an AI Job',
		url: `${ORG}/projects-to-land-an-ai-job`,
		description: 'A curated shortlist of 13 highest-signal projects with staged milestones, evals, and a presentation checklist.',
		category: 'portfolio',
		roles: ['ai engineer', 'llm engineer', 'ml engineer'],
		contentTypes: ['projects', 'checklist'],
	},
	{
		kind: 'repo',
		slug: 'ai-product-engineer-roadmap',
		title: 'AI Product Engineer Roadmap',
		url: `${ORG}/ai-product-engineer-roadmap`,
		description: 'A 7-stage learning path to become an AI product engineer, with annotated resources and project recommendations.',
		category: 'roadmap',
		roles: ['ai product engineer', 'ai engineer'],
		contentTypes: ['roadmap', 'resources'],
	},
	{
		kind: 'repo',
		slug: 'become-a-gtm-engineer',
		title: 'Become a GTM Engineer',
		url: `${ORG}/become-a-gtm-engineer`,
		description: 'A 9-stage roadmap into GTM engineering, with annotated resources and portfolio projects.',
		category: 'roadmap',
		roles: ['gtm engineer'],
		contentTypes: ['roadmap', 'resources'],
	},
	{
		kind: 'repo',
		slug: 'awesome-ai-native-jobs',
		title: 'Awesome AI-Native Jobs',
		url: `${ORG}/awesome-ai-native-jobs`,
		description: 'The umbrella index linking every Landed job list and learning resource.',
		category: 'jobs',
		roles: [],
		contentTypes: ['index'],
	},
];

// Filter the catalog by an optional free-text topic, role keyword, and category. All filters are ANDed;
// topic matches loosely across title/description/content types/roles.
export function searchCatalog(opts: { topic?: string; role?: string; category?: LearningCategory }): LearningItem[] {
	const topic = opts.topic?.trim().toLowerCase();
	const role = opts.role?.trim().toLowerCase();

	return LEARNING_CATALOG.filter(item => {
		if (opts.category && item.category !== opts.category) return false;
		if (role && !item.roles.some(r => r.includes(role) || role.includes(r))) return false;
		if (topic) {
			const haystack = [item.title, item.description, item.slug, ...item.contentTypes, ...item.roles].join(' ').toLowerCase();
			if (!haystack.includes(topic)) return false;
		}
		return true;
	});
}
