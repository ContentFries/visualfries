import { error } from '@sveltejs/kit';
import { pages } from '../../../site/docs';
import { pageMarkdown } from '../../../site/markdown';

export const prerender = true;
export const entries = () => pages.filter((p) => p.slug).map((p) => ({ slug: p.slug }));
export const GET = ({ params }) => {
	const page = pages.find((p) => p.slug === params.slug);
	if (!page) error(404, 'No such page');
	return new Response(pageMarkdown(page), {
		headers: { 'content-type': 'text/markdown; charset=utf-8' }
	});
};
