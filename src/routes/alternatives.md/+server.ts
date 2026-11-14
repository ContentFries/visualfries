import { error } from '@sveltejs/kit';
import { articleMarkdown } from '../../site/markdown';

export const prerender = true;
export const GET = () => {
	const markdown = articleMarkdown('/alternatives');
	if (!markdown) error(404, 'No such page');
	return new Response(markdown, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
};
