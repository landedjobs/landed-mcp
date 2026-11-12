// The contract between this proxy and the hosted Landed API. These are the only data shapes the server
// returns to us — deliberately small and owned here, so the repo has zero dependency on Landed's internal
// packages (types, schema, or the search engine).

export interface JobResult {
	jobId: string;
	title: string;
	company?: string;
	location?: string;
	fitLabel: string; // excellent | good | borderline | notAFit
	oneLineWhy: string;
	productUrl: string; // the job in the landed app, where the person applies
	url?: string;
	applyUrl?: string;
}

export interface SearchOk {
	status: 'ok';
	jobs: JobResult[];
	total?: number;
	returned?: number;
}

export interface SearchSignInRequired {
	status: 'sign_in_required';
	message?: string;
	signupUrl?: string;
}

export interface SearchLimitReached {
	status: 'limit_reached';
	limit: number;
	resetsAt: string;
	upgradeUrl: string;
	message: string;
}

export type SearchResponse = SearchOk | SearchSignInRequired | SearchLimitReached;
