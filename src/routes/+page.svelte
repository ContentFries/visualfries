<script lang="ts">
	import { onMount } from 'svelte';
	import '../site/home.css';
	import markup from '../site/home.html?raw';
	import { initHome } from '../site/home';

	let root: HTMLElement;
	onMount(() => initHome(root));

	const title = 'VisualFries: your AI video editor, motion designer and graphic designer';
	const description =
		'VisualFries is an MIT-licensed engine for social video. Your coding agent turns a raw take into one project (cut list, shots, transitions, captions, sound) and VisualFries renders the finished reel frame-exact, timed to the words of a transcript. Posts, carousels and explainers too.';
	const jsonLd = {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'SoftwareSourceCode',
				name: 'VisualFries',
				description:
					'Open-source Svelte 5 engine for social visuals: talking-head reels, static posts, carousels, explainers and kinetic type. A JSON project describes clips, timed by transcript words; blocks are Svelte components; a matte cuts the speaker out so layers can sit behind them. A program describes a whole edit in one project: a cut list over raw takes, shots (full, punch, strip, window, behind, whip), transitions, keys, sound effects, music snapped to bars and a mix normalised to -14 LUFS. Built-in blocks include word-timed captions and a speaker-depth reel. The CLI resolves and checks programs, verifies determinism, writes stills and renders MP4 or ProRes 4444 alpha inserts.',
				codeRepository: 'https://github.com/ContentFries/visualfries',
				programmingLanguage: ['TypeScript', 'Svelte'],
				license: 'https://opensource.org/licenses/MIT',
				url: 'https://visualfries.com/',
				author: { '@type': 'Organization', name: 'ContentFries' }
			},
			{
				'@type': 'FAQPage',
				mainEntity: [
					{
						'@type': 'Question',
						name: 'What is VisualFries?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'VisualFries is an MIT-licensed Svelte 5 library for programmatically creating video and image content for social media. A JSON document is the source of truth; visuals are Svelte components; text is HTML/CSS; animation is GSAP. Motion frames are designed to be deterministic, and check --determinism compares sampled frames rendered in different orders. It is the engine behind ContentFries.'
						}
					},
					{
						'@type': 'Question',
						name: 'Can VisualFries edit a raw talking-head take into a finished reel?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Yes. A program is one project with a cut list over the raw take, shots that frame the speaker, clips, transitions, captions, sound effects and music. Every timing is a phrase of the transcript, so a retake or another try re-renders without editing the project, and only the segments that changed are drawn again.'
						}
					},
					{
						'@type': 'Question',
						name: 'How are animations timed to a voiceover?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'A motion project anchors clips and cues to phrases of a word-level transcript instead of typed seconds. A new transcript re-times every clip; a phrase that no longer exists fails with a "Did you mean" suggestion.'
						}
					},
					{
						'@type': 'Question',
						name: 'Which AI agent works best with VisualFries?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'Any coding agent that can write Svelte and run a CLI works. The VisualFries team recommends Claude Opus 5.5; the examples on visualfries.com were made with it, and the homepage shows Opus 5.5 and GPT-6.1 Sol on the same three briefs.'
						}
					},
					{
						'@type': 'Question',
						name: 'What does the CLI do?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'visualfries program resolves a whole edit (cuts, shots, clips, transitions, sound) and measures every edit point; clips resolves transcript phrases to times; check runs every block or segment in seconds, verifies determinism and prints the mix; still writes a contact sheet; render writes the program as one MP4 in any format, or each clip as a ProRes 4444 alpha insert with manifest.json; matte cuts the speaker out; beats analyses music. Scene commands include validate, inspect, qa, catalog, explain and doctor.'
						}
					}
				]
			}
		]
	};
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<link rel="canonical" href="https://visualfries.com/" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content="https://visualfries.com/" />
	<meta property="og:image" content="https://visualfries.com/media/v2/explainer.jpg" />
	<meta name="twitter:card" content="summary_large_image" />
	<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
	<link rel="describedby" type="text/plain" href="/llms.txt" />
	{@html '<script type="application/ld+json">' + JSON.stringify(jsonLd) + '</' + 'script>'}
</svelte:head>

<main class="home" id="content" bind:this={root}>
	{@html markup}
</main>
