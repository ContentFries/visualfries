<script lang="ts">
	import { onMount } from 'svelte';
	import '../site/home.css';
	import markup from '../site/home.html?raw';
	import { initHome } from '../site/home';

	let root: HTMLElement;
	onMount(() => initHome(root));

	const title = 'VisualFries — one document, every surface';
	const description =
		'VisualFries is an open-source Svelte 5 engine for social video and stills. One JSON document describes blocks, time and surfaces; it mounts live in an editor and renders frame-exact on a server.';
	const jsonLd = {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'SoftwareSourceCode',
				name: 'VisualFries',
				description:
					'Open-source Svelte 5 library and headless engine for visual social-media content. One JSON document describes blocks (Svelte components), time (transcript words or seconds) and surfaces; it mounts live in an editor and renders deterministically on a server.',
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
							text: 'VisualFries is an MIT-licensed Svelte 5 library for programmatically creating video and image content for social media. A JSON document is the source of truth; visuals are Svelte components; text is HTML/CSS; animation is GSAP; every frame renders deterministically. It is the engine behind ContentFries.'
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
						name: 'What does the CLI do?',
						acceptedAnswer: {
							'@type': 'Answer',
							text: 'visualfries clips resolves transcript phrases to times, check runs every block in seconds and can verify determinism, still writes a contact sheet, and render writes MP4 or ProRes 4444 alpha plus manifest.json. Scene commands include validate, inspect, qa, catalog, explain and doctor.'
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
	<meta property="og:image" content="https://visualfries.com/media/editable-poster.jpg" />
	<meta name="twitter:card" content="summary_large_image" />
	<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
	{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
</svelte:head>

<main class="home" bind:this={root}>
	{@html markup}
</main>
