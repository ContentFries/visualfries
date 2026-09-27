import { fileURLToPath } from 'node:url';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex, escapeSvelte } from 'mdsvex';
import { createHighlighter } from 'shiki';

// The site (src/routes) is a static SvelteKit app; the library itself is packaged from
// src/lib by svelte-package and is unaffected by the site settings below.
const highlighter = await createHighlighter({
	themes: ['github-dark-default'],
	langs: ['javascript', 'typescript', 'svelte', 'json', 'bash', 'css', 'html', 'text', 'markdown']
});

// Give every h2/h3 a stable id (for "On this page" and deep links).
function headingIds() {
	const text = (node) =>
		node.type === 'text' ? node.value : (node.children ?? []).map(text).join('');
	const slug = (s) =>
		s
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.trim()
			.replace(/\s+/g, '-');
	return (tree) => {
		const seen = new Map();
		const walk = (node) => {
			if (node.type === 'element' && (node.tagName === 'h2' || node.tagName === 'h3')) {
				node.properties = node.properties ?? {};
				if (!node.properties.id) {
					const base = slug(text(node)) || 'section';
					const n = seen.get(base) ?? 0;
					seen.set(base, n + 1);
					node.properties.id = n ? `${base}-${n}` : base;
				}
			}
			(node.children ?? []).forEach(walk);
		};
		walk(tree);
	};
}

/** @type {import('mdsvex').MdsvexOptions} */
const mdsvexOptions = {
	extensions: ['.md'],
	layout: { _: fileURLToPath(new URL('./src/site/DocsArticle.svelte', import.meta.url)) },
	rehypePlugins: [headingIds],
	highlight: {
		highlighter: async (code, lang = 'text') => {
			const language = highlighter.getLoadedLanguages().includes(lang) ? lang : 'text';
			const html = escapeSvelte(
				highlighter.codeToHtml(code, { lang: language, theme: 'github-dark-default' })
			);
			return `{@html \`${html}\`}`;
		}
	}
};

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [vitePreprocess(), mdsvex(mdsvexOptions)],
	kit: {
		adapter: adapter({ pages: 'build', assets: 'build', strict: true }),
		prerender: { handleHttpError: 'fail', entries: ['*', '/404'] }
	}
};

export default config;
