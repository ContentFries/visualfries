import { pages, pageUrl, sectionLabel, type DocPage } from './docs';

// Raw Markdown of every docs page, read at build time.
const sources = import.meta.glob('/src/routes/docs/**/+page.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const SITE = 'https://visualfries.com';

// Pages written in Svelte (live demos) describe themselves here.
const svelteOnly: Record<string, { description: string; body: string }> = {
	examples: {
		description:
			'Scene JSON examples mounted live in the browser with the real VisualFries engine.',
		body: 'This page mounts real scene JSON with `createSceneBuilder` in your browser: basic text, animated text, a video background and word-timed subtitles. Each example shows its JSON next to the running scene. Open it in a browser to interact.'
	}
};

function frontmatter(raw: string) {
	const m = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
	const data: Record<string, string> = {};
	if (m) {
		for (const line of m[1].split('\n')) {
			const kv = /^(\w+):\s*(.*)$/.exec(line);
			if (kv) data[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '');
		}
	}
	return { data, body: m ? raw.slice(m[0].length) : raw };
}

export function pageMarkdown(page: DocPage): string {
	const file = `/src/routes/docs/${page.slug ? page.slug + '/' : ''}+page.md`;
	const raw = sources[file];
	let description = '';
	let body = '';
	if (raw) {
		const fm = frontmatter(raw);
		description = fm.data.description ?? '';
		body = fm.body
			.replace(/<script[\s\S]*?<\/script>\n?/g, '')
			.replace(/<span class="tag plan">planned<\/span>/g, '(planned)')
			.trim();
	} else if (svelteOnly[page.slug]) {
		description = svelteOnly[page.slug].description;
		body = svelteOnly[page.slug].body;
	}
	const head = `# ${page.title}\n\n> ${description}\n\nSource: ${SITE}${pageUrl(page.slug)} · Section: ${sectionLabel(page.section)}\n`;
	return `${head}\n${body}\n`;
}

export function pageDescription(page: DocPage): string {
	const file = `/src/routes/docs/${page.slug ? page.slug + '/' : ''}+page.md`;
	const raw = sources[file];
	return raw
		? (frontmatter(raw).data.description ?? '')
		: (svelteOnly[page.slug]?.description ?? '');
}

export function llmsTxt(): string {
	const lines = [
		'# VisualFries',
		'',
		'> Open-source (MIT) Svelte 5 engine for visual social-media content. One JSON document describes blocks (Svelte components), time (transcript words or seconds) and surfaces; it mounts live in an editor and renders frame-exact on a server. Motion projects time animations by the words of a transcript.',
		'',
		'Every page below is available as Markdown by appending `.md` to its URL. The whole documentation in one file: ' +
			`${SITE}/llms-full.txt`,
		''
	];
	let section = '';
	for (const p of pages) {
		const label = sectionLabel(p.section);
		if (label !== section) {
			section = label;
			lines.push(`## ${label}`, '');
		}
		lines.push(
			`- [${p.title}](${SITE}${pageUrl(p.slug)}.md): ${pageDescription(p)}${p.planned ? ' (planned)' : ''}`
		);
		if (pages[pages.indexOf(p) + 1]?.section !== p.section) lines.push('');
	}
	lines.push(
		'## Optional',
		'',
		`- [Source code](https://github.com/ContentFries/visualfries): library, CLI and this site`,
		''
	);
	return lines.join('\n');
}

export function llmsFullTxt(): string {
	return [llmsTxt(), ...pages.map(pageMarkdown)].join('\n\n---\n\n');
}
