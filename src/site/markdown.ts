import { pages, pageUrl, sectionLabel, type DocPage } from './docs';

// Raw Markdown of every docs page, read at build time.
const sources = import.meta.glob('/src/routes/docs/**/+page.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const SITE = 'https://visualfries.com';

// The scene JSON behind the live examples page.
const exampleScenes = import.meta.glob('/src/lib/examples/0*.json', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const fence = '```';

// Pages written in Svelte (live demos) describe themselves here.
const svelteOnly: Record<string, { description: string; body: string }> = {
	examples: {
		description:
			'Scene JSON examples mounted live in the browser with the real VisualFries engine.',
		body: [
			'The web page mounts each scene below with `createSceneBuilder` in the browser; the interactive part is browser-only. The site replaces the remote sample video URL with its own clip.',
			...Object.entries(exampleScenes)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(
					([file, json]) => `## ${file.split('/').pop()}\n\n${fence}json\n${json.trim()}\n${fence}`
				)
		].join('\n\n')
	}
};

/** Apply `fn` to prose only; fenced code blocks pass through byte for byte. */
export function outsideFences(markdown: string, fn: (prose: string) => string): string {
	const parts = markdown.split(/(^```[^\n]*\n[\s\S]*?^```[ \t]*$)/m);
	return parts.map((part, i) => (i % 2 ? part : fn(part))).join('');
}

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
		// Remove the page's own Svelte <script> blocks, never code inside examples.
		body = outsideFences(fm.body, (prose) =>
			prose
				.replace(/<script[\s\S]*?<\/script>\n?/g, '')
				.replace(/<span class="tag plan">planned<\/span>/g, '(planned)')
		).trim();
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
		'> Open-source (MIT) Svelte 5 engine for visual social-media content. A JSON document describes blocks (Svelte components), time (transcript words or seconds) and surfaces. Scene documents mount live in an editor; motion projects time animations by the words of a transcript and render frame by frame in headless Chromium.',
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
