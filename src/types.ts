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
	url?: string;
	applyUrl?: string;
}

// One normalized apply-form question. `group` is standard | screening | eeo.
export interface FormField {
	key: string;
	label: string;
	type: string;
	options: string[];
	required: boolean;
	group: string;
	mapsTo?: string;
}

// The freemium status the server appends to every tool result. Present as-is to the caller.
export interface FreemiumMeta {
	plan: string; // free | authenticated
	metered: boolean;
	jobUnitsBudget?: number;
	jobUnitsUsed?: number;
	jobUnitsRemaining?: number;
	anonToken?: string;
	note?: string;
}

export interface SearchResponse {
	status: 'ok' | 'budget_exhausted';
	jobs?: JobResult[];
	total?: number;
	returned?: number;
	signupUrl?: string; // present on budget_exhausted
	freemium: FreemiumMeta;
}

export interface JobFormResponse {
	jobId: string;
	status: 'fetched' | 'not_available';
	applyUrl?: string;
	fieldsByGroup?: Record<string, FormField[]>;
	freemium: FreemiumMeta;
}
