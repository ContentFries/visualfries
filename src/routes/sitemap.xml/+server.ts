import { pages, pageUrl } from '../../site/docs';

export const prerender = true;

export const GET = () => {
	const urls = ['/', ...pages.map((p) => pageUrl(p.slug))];
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>https://visualfries.com${u === '/' ? '/' : u}</loc></url>`).join('\n')}
</urlset>
`;
	return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
