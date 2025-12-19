<script lang="ts">
	import InteractiveExample from '../InteractiveExample.svelte';
	
	// Import all examples
	import example01 from '$lib/examples/01_basic_text.json';
	import example02 from '$lib/examples/02_animated_text.json';
	import example03 from '$lib/examples/03_video_background.json';
	import example04 from '$lib/examples/04_real_subtitles.json';
</script>

<svelte:head>
	<title>Live Examples | VisualFries Docs</title>
</svelte:head>

<section class="examples-page">
	<div class="hero">
		<h1>Live <span class="gradient">Examples</span></h1>
		<p class="subtitle">A step-by-step progression through VisualFries features.</p>
	</div>

	<div class="examples-container">
		<InteractiveExample 
			sceneData={example01 as any} 
			title="01. Basic Scene" 
			description="A simple start with a black rectangle background and centered text."
		/>

		<InteractiveExample 
			sceneData={example02 as any} 
			title="02. Basic Animation" 
			description="Same scene, but with a GSAP-powered scale and fade entry."
		/>

		<InteractiveExample 
			sceneData={example03 as any} 
			title="03. Video Background" 
			description="Adding a MP4 video background using the VIDEO component."
		/>

		<InteractiveExample 
			sceneData={example04 as any} 
			title="04. Real Subtitles" 
			description="The pro way: using the SUBTITLES component with word-by-word highlighting."
		/>
	</div>
</section>

<style>
	.examples-page {
		padding: 3rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.hero {
		text-align: center;
		margin-bottom: 5rem;
	}

	.hero h1 {
		font-size: 3.5rem;
		font-weight: 900;
		letter-spacing: -2px;
		margin: 0 0 1rem;
	}

	.gradient {
		background: linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.subtitle {
		color: #888;
		font-size: 1.1rem;
		margin: 0;
	}

	.examples-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
</style>
