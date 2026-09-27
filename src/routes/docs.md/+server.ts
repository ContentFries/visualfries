import { pages } from '../../site/docs';
import { pageMarkdown } from '../../site/markdown';

export const prerender = true;
export const GET = () =>
	new Response(pageMarkdown(pages[0]), {
		headers: { 'content-type': 'text/markdown; charset=utf-8' }
	});
