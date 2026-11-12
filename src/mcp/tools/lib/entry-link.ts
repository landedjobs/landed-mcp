import { config } from '@/config';
import type { McpClient } from '@/services/api-client';

// Every link into the landed app says which AI app sent the person and, for a job, which job, so the
// sign-up it leads to keeps where it came from. A utm_source already on the link (ChatGPT adds one) stays.
const APP_HOST = /^app(-[a-z0-9]+)?\.landed\.jobs$/;
const SOURCES: Record<string, string> = { chatgpt: 'chatgpt.com', claude: 'claude.ai' };

export function clientFrom(client?: McpClient): string {
	const name = client?.name?.toLowerCase() ?? '';
	if (!name || name.includes('openai') || name.includes('chatgpt')) return 'chatgpt';
	if (name.includes('claude') || name.includes('anthropic')) return 'claude';
	return name.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'chatgpt';
}

function isAppLink(url: URL): boolean {
	const hosts = [config.appUrl, config.signupUrl].map(value => {
		try {
			return new URL(value).host;
		} catch {
			return '';
		}
	});
	return hosts.includes(url.host) || APP_HOST.test(url.hostname);
}

export function entryLink(href: string, client?: McpClient, jobId?: string): string {
	let url: URL;
	try {
		url = new URL(href);
	} catch {
		return href;
	}
	if (!isAppLink(url)) return href;
	const from = clientFrom(client);
	if (!url.searchParams.has('from')) url.searchParams.set('from', from);
	if (!url.searchParams.has('utm_source')) url.searchParams.set('utm_source', SOURCES[from] ?? from);
	if (jobId && /^[a-zA-Z0-9_-]{1,160}$/.test(jobId) && !url.searchParams.has('job')) url.searchParams.set('job', jobId);
	return url.toString();
}
