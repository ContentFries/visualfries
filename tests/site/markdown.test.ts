import { describe, expect, it } from 'vitest';
import { pages } from '../../src/site/docs';
import { outsideFences, pageMarkdown } from '../../src/site/markdown';

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
