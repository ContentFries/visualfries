<script lang="ts">
	import DocsArticle from '../../../site/DocsArticle.svelte';
	import InteractiveExample from '../InteractiveExample.svelte';
	import example01 from '$lib/examples/01_basic_text.json';
	import example02 from '$lib/examples/02_animated_text.json';
	import example03 from '$lib/examples/03_video_background.json';
	import example04 from '$lib/examples/04_real_subtitles.json';

	import { page } from '$app/state';

	// The examples ship with a public sample video that is no longer reachable; the site
	// serves its own clip. Scene URLs must be absolute, so build it from the page origin.
	const REMOTE =
		'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
	const clip = $derived(new URL('/media/workflow.mp4', page.url).href);
	const local = <T,>(scene: T): T => JSON.parse(JSON.stringify(scene).replaceAll(REMOTE, clip));
	const video = $derived(local(example03));
	const subtitles = $derived(local(example04));
</script>

<DocsArticle
	title="Live examples"
	description="Scene JSON examples mounted live in the browser with the real VisualFries engine."
	updated="2026-09-27"
>
	<p>
		These scenes run in your browser with <code>createSceneBuilder</code>, the same engine
		ContentFries uses. Each example shows its JSON next to the running scene.
	</p>
	<div class="examples">
		<InteractiveExample
			sceneData={example01 as any}
			title="01 · Basic scene"
			description="A rectangle background and centered text."
		/>
		<InteractiveExample
			sceneData={example02 as any}
			title="02 · Animated text"
			description="The same scene with a GSAP scale and fade entry."
		/>
		<InteractiveExample
			sceneData={video as any}
			title="03 · Video background"
			description="An MP4 background through the VIDEO component."
		/>
		<InteractiveExample
			sceneData={subtitles as any}
			title="04 · Word-timed subtitles"
			description="The SUBTITLES component with word-by-word highlighting."
		/>
	</div>
</DocsArticle>

<style>
	.examples {
		display: grid;
		gap: 28px;
		margin-top: 28px;
	}
</style>
