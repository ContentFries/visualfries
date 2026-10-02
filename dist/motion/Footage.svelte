<!--
	Draws one frame of a project footage per video frame.
	layer="plate": the original picture. layer="subject": only the subject, cut out by the
	footage's matte (transparent elsewhere). `offset` shifts time in seconds (negative = earlier),
	e.g. a delayed echo of the speaker. Size and position it like an <img>.
-->
<script lang="ts">
	import { useClip, useFrame } from './runtime.svelte.js';
	import { footageFrameUrl, type FootageLayer } from './footage.js';

	let {
		name,
		layer = 'plate',
		offset = 0,
		class: className = '',
		style = ''
	}: {
		name: string;
		layer?: FootageLayer;
		offset?: number;
		class?: string;
		style?: string;
	} = $props();

	const clip = useClip();
	const footage = clip.footage[name];
	if (!footage) {
		throw new Error(
			`Unknown footage "${name}". Footage: ${Object.keys(clip.footage).join(', ') || 'none (add "footage" to the project)'}`
		);
	}
	if (layer === 'subject' && !footage.subject) {
		throw new Error(
			`Footage "${name}" has no matte, so it has no subject layer. Add "matte" to it.`
		);
	}

	let img: HTMLImageElement;
	useFrame(({ frame }) => {
		const src = footageFrameUrl(
			footage,
			clip.programStartFrame + frame + Math.round(offset * clip.fps),
			layer
		);
		if (img.src === src) return;
		img.src = src;
		return img.decode();
	});
</script>

<img
	bind:this={img}
	alt=""
	draggable="false"
	class={className}
	width={footage.width}
	height={footage.height}
	{style}
/>
