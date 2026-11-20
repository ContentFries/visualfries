<!--
	Draws one frame of a project footage per video frame.
	layer="plate": the original picture. layer="subject": only the subject, cut out by the
	footage's matte (transparent elsewhere). layer="clean": the picture with the subject removed
	(the footage's "clean" plate). `offset` shifts time in seconds (negative = earlier),
	e.g. a delayed echo of the speaker. Size and position it like an <img>. In the live player,
	which has no extracted frames, it is a <canvas> the proxy video's frame is drawn into.
	With a cut list, `name` draws that source while the program shows it (an error elsewhere) and
	`program` draws whatever the program shows; `offset` then shifts inside the source.
-->
<script lang="ts">
	import { useClip, useFrame } from './runtime.svelte.js';
	import { footageFrameAt, type FootageFrame, type FootageLayer } from './footage.js';

	let {
		name,
		program = false,
		layer = 'plate',
		offset = 0,
		class: className = '',
		style = ''
	}: {
		name?: string;
		program?: boolean;
		layer?: FootageLayer;
		offset?: number;
		class?: string;
		style?: string;
	} = $props();

	const clip = useClip();
	if (program === !!name) {
		throw new Error('<Footage> needs either name="…" (one source) or program (the cut list).');
	}
	const footage = name ? clip.footage[name] : null;
	if (name && !footage) {
		throw new Error(
			`Unknown footage "${name}". Footage: ${Object.keys(clip.footage).join(', ') || 'none (add "footage" to the project)'}`
		);
	}
	if (footage && layer === 'subject' && !footage.subject) {
		throw new Error(
			`Footage "${name}" has no matte, so it has no subject layer. Add "matte" to it.`
		);
	}
	if (footage && layer === 'clean' && !footage.clean) {
		throw new Error(
			`Footage "${name}" has no clean plate. Add "clean": true to it (it needs a matte).`
		);
	}
	// The image takes the size of the source it shows; a cut to another source resizes it.
	const first = footage ?? Object.values(clip.footage)[0];
	let sized = first;
	const live = !!first?.picture;

	let img = $state<HTMLImageElement>();
	let canvas = $state<HTMLCanvasElement>();
	/** Live: the frame the canvas shows, and the newest frame asked for. */
	let painted = '';
	let asked = 0;

	/** Live: draws the frame from its proxy, unless a newer frame was asked for meanwhile. */
	async function paint(shown: FootageFrame) {
		const key = `${shown.source}:${shown.frame}`;
		if (key === painted) return;
		const ask = ++asked;
		const picture = await shown.footage.picture!(shown.frame, layer);
		if (ask !== asked) return;
		const el = canvas!;
		const { width, height } = shown.footage;
		if (el.width !== width || el.height !== height) [el.width, el.height] = [width, height];
		const ctx = el.getContext('2d')!;
		ctx.clearRect(0, 0, width, height);
		ctx.drawImage(picture, 0, 0, width, height);
		painted = key;
	}

	useFrame(({ frame }) => {
		const shown = footageFrameAt(
			clip.footage,
			clip.footageMap,
			name ?? null,
			clip.programStartFrame + frame,
			layer,
			Math.round(offset * clip.fps)
		);
		if (live) return paint(shown);
		const el = img!;
		if (el.src === shown.url) return;
		if (shown.footage !== sized) {
			sized = shown.footage;
			el.setAttribute('width', String(sized.width));
			el.setAttribute('height', String(sized.height));
		}
		el.src = shown.url;
		return el.decode();
	});
</script>

{#if live}
	<canvas bind:this={canvas} class={className} width={first?.width} height={first?.height} {style}
	></canvas>
{:else}
	<img
		bind:this={img}
		alt=""
		draggable="false"
		class={className}
		width={first?.width}
		height={first?.height}
		{style}
	/>
{/if}
