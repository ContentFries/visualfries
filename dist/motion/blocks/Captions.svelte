<!--
	Built-in block "@visualfries/captions": captions over footage, configured from the clip's
	props. Every prop of <Captions> works, plus:
	  words     name of the clip's `words` selection to caption (default "captions")
	  footage   footage to show full-bleed behind the captions (optional)
	  background  CSS background when there is no footage
-->
<script lang="ts">
	import { useClip } from '../runtime.svelte.js';
	import Captions from '../Captions.svelte';
	import Footage from '../Footage.svelte';

	const clip = useClip();
	const {
		words: key = 'captions',
		footage,
		background,
		...options
	} = clip.props as Record<string, any>;
	const words = clip.words[key];
	if (!words) {
		throw new Error(
			`Clip "${clip.id}" has no words "${key}". Add "words": { "${key}": "clip" } to the clip.`
		);
	}
</script>

<div class="vf-cap-stage" style:background>
	{#if footage}
		<Footage name={footage} class="vf-cap-plate" />
	{/if}
	<Captions {words} {...options} />
</div>

<style>
	.vf-cap-stage {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
	.vf-cap-stage :global(.vf-cap-plate) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		-o-object-fit: cover;
		   object-fit: cover;
	}
</style>
