import { describe, expect, it } from 'vitest';
import { pages } from '../../src/site/docs';
import {
	articlePages,
	llmsTxt,
	outsideFences,
	pageMarkdown,
	sitemapEntries
} from '../../src/site/markdown';

const sources = import.meta.glob('/src/routes/docs/**/+page.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const fences = (md: string) => md.match(/^```[^\n]*\n[\s\S]*?^```[ \t]*$/gm) ?? [];

describe('docs markdown twins', () => {
	it('keeps every code example verbatim, including <script> in examples', () => {
		let checked = 0;
		for (const page of pages) {
			const raw = sources[`/src/routes/docs/${page.slug ? page.slug + '/' : ''}+page.md`];
			if (!raw) continue;
			const twin = pageMarkdown(page);
			for (const block of fences(raw)) {
				expect(twin, `${page.slug || 'index'}: example missing from .md`).toContain(block);
				checked++;
			}
		}
		expect(checked).toBeGreaterThan(40);
	});

	it('puts every code fence on a line of its own', () => {
		// Text after a closing fence keeps it open: the prose below shows as code.
		for (const [file, raw] of Object.entries(sources))
			for (const line of raw.split('\n'))
				if (line.trimStart().startsWith('```')) expect(line.trim(), file).toMatch(/^```[\w-]*$/);
	});

	it('strips only the page script, not fenced code', () => {
		const md =
			'<script>\nimport X from "x";\n</script>\n\nText\n\n```svelte\n<script>\n  const a = 1;\n</script>\n```\n';
		const out = outsideFences(md, (p) => p.replace(/<script[\s\S]*?<\/script>\n?/g, ''));
		expect(out).not.toContain('import X');
		expect(out).toContain('const a = 1;');
	});
});

describe('use-case and comparison pages', () => {
	const sample = {
		'/src/routes/for/reels/+page.md':
			'---\ntitle: Reels\ndescription: Short.\nupdated: 2026-11-14\n---\nBody',
		'/src/routes/alternatives/+page.md':
			'---\ntitle: Hub\ndescription: All of them.\nupdated: 2026-11-14\n---\nBody',
		'/src/routes/alternatives/other-tool/+page.md':
			"---\ntitle: 'An alternative: us'\ndescription: Why.\nupdated: 2026-11-01\nfaq:\n  - q: One?\n    a: Yes.\n---\nBody"
	};

	it('reads path, title, description and date from each page', () => {
		expect(articlePages('for', sample)).toEqual([
			{ path: '/for/reels', title: 'Reels', description: 'Short.', updated: '2026-11-14' }
		]);
		expect(articlePages('alternatives', sample)).toEqual([
			{ path: '/alternatives', title: 'Hub', description: 'All of them.', updated: '2026-11-14' },
			{
				path: '/alternatives/other-tool',
				title: 'An alternative: us',
				description: 'Why.',
				updated: '2026-11-01'
			}
		]);
	});

	it('keeps frontmatter values free of a colon followed by a space', () => {
		// Unquoted YAML reads "a: b: c" as a nested map; the page then renders without its layout.
		const pages = import.meta.glob(
			['/src/routes/for/**/+page.md', '/src/routes/alternatives/**/+page.md'],
			{ query: '?raw', import: 'default', eager: true }
		) as Record<string, string>;
		for (const [file, raw] of Object.entries(pages)) {
			const head = /^---\n([\s\S]*?)\n---/.exec(raw)?.[1] ?? '';
			for (const line of head.split('\n')) {
				const value = /^\s*(?:- )?\w+:\s(.*)$/.exec(line)?.[1] ?? '';
				if (/^['"]/.test(value)) continue;
				expect(value, `${file}: ${line.slice(0, 60)}`).not.toMatch(/:\s/);
			}
		}
	});

	it('lists the real pages in llms.txt and the sitemap entries', () => {
		const real = [...articlePages('for'), ...articlePages('alternatives')];
		expect(articlePages('for').length).toBeGreaterThanOrEqual(4);
		expect(articlePages('alternatives').length).toBeGreaterThanOrEqual(3);
		for (const p of real) {
			expect(p.title, p.path).not.toBe('');
			expect(p.description.length, p.path).toBeGreaterThan(80);
			expect(p.updated, p.path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(llmsTxt()).toContain(`https://www.visualfries.com${p.path})`);
		}
		const urls = sitemapEntries().map((e) => e.loc);
		expect(urls).toContain('https://www.visualfries.com/');
		expect(urls).toContain('https://www.visualfries.com/docs/programs');
		for (const p of real) expect(urls).toContain(`https://www.visualfries.com${p.path}`);
		expect(new Set(urls).size).toBe(urls.length);
	});
});
