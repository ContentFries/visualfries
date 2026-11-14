import { error } from '@sveltejs/kit';
import { articleMarkdown, articlePages } from '../../../site/markdown';

export const prerender = true;
export const entries = () =>
	articlePages('for')
		.filter((p) => p.path !== '/for')
		.map((p) => ({ slug: p.path.split('/').pop()! }));
export const GET = ({ params }) => {
	const markdown = articleMarkdown(`/for/${params.slug}`);
	if (!markdown) error(404, 'No such page');
	return new Response(markdown, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
};
