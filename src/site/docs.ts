/**
 * The docs map. The order here is the reading order: it drives the section bar, the side
 * navigation, previous/next links, llms.txt and llms-full.txt.
 */
export type SectionKey =
	| 'start'
	| 'document'
	| 'blocks'
	| 'time'
	| 'surfaces'
	| 'render'
	| 'scenes'
	| 'agents';

export const sections: { key: SectionKey; label: string; number?: string }[] = [
	{ key: 'start', label: 'Start' },
	{ key: 'document', label: 'Document', number: '01' },
	{ key: 'blocks', label: 'Blocks', number: '02' },
	{ key: 'time', label: 'Time', number: '03' },
	{ key: 'surfaces', label: 'Surfaces', number: '04' },
	{ key: 'render', label: 'Render', number: '05' },
	{ key: 'scenes', label: 'Scenes' },
	{ key: 'agents', label: 'Agents' }
];

export type DocPage = { slug: string; title: string; section: SectionKey; planned?: boolean };

export const pages: DocPage[] = [
	{ slug: '', title: 'What is VisualFries', section: 'start' },
	{ slug: 'install', title: 'Install and doctor', section: 'start' },
	{ slug: 'quickstart', title: 'Quickstart: a motion project', section: 'start' },
	{ slug: 'when-to-use', title: 'When to use VisualFries', section: 'start' },
	{ slug: 'troubleshooting', title: 'Troubleshooting', section: 'start' },

	{ slug: 'project-file', title: 'The project file (.vf.json)', section: 'document' },
	{ slug: 'scene-json', title: 'Scene JSON', section: 'document' },

	{ slug: 'blocks', title: 'Motion blocks', section: 'blocks' },
	{ slug: 'clip-api', title: 'The clip object', section: 'blocks' },
	{ slug: 'determinism', title: 'Determinism rules', section: 'blocks' },

	{ slug: 'time-and-cues', title: 'Time and cues', section: 'time' },
	{ slug: 'retakes', title: 'Re-takes and a new voiceover', section: 'time' },
	{ slug: 'transcripts', title: 'Transcripts', section: 'time' },

	{ slug: 'surfaces', title: 'Sizes, alpha and formats', section: 'surfaces' },
	{ slug: 'footage', title: 'Footage, mattes and speaker depth', section: 'surfaces' },
	{ slug: 'captions', title: 'Captions', section: 'surfaces' },
	{
		slug: 'stills',
		title: 'Stills, carousels, AI backgrounds',
		section: 'surfaces',
		planned: true
	},

	{ slug: 'cli', title: 'CLI: clips, check, still, render', section: 'render' },
	{ slug: 'rendering', title: 'How rendering works', section: 'render' },

	{ slug: 'scenes', title: 'Scenes in an app', section: 'scenes' },
	{ slug: 'composer', title: 'Composer API', section: 'scenes' },
	{ slug: 'components', title: 'Scene components', section: 'scenes' },
	{ slug: 'fonts', title: 'Fonts', section: 'scenes' },
	{ slug: 'scene-cli', title: 'Scene CLI and captions', section: 'scenes' },
	{ slug: 'examples', title: 'Live examples', section: 'scenes' },

	{ slug: 'agents', title: 'VisualFries for agents', section: 'agents' }
];

export const pageUrl = (slug: string) => (slug ? `/docs/${slug}` : '/docs');

export function findPage(pathname: string) {
	const slug = pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '');
	const index = pages.findIndex((p) => p.slug === slug);
	return { page: pages[index], prev: pages[index - 1], next: pages[index + 1], index };
}

export function sectionOf(key: SectionKey) {
	return sections.find((s) => s.key === key)!;
}

export function sectionLabel(key: SectionKey) {
	const s = sectionOf(key);
	return s.number ? `${s.number} ${s.label}` : s.label;
}
