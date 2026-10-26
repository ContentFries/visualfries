<!--
	Built-in block "@visualfries/end-card": the card that points to the full video, after an
	excerpt (its `end`) or as any clip. The picture under it dims, the lines land one by one and
	the handle rises below them, all inside the safe zone, in the brand's colours and fonts, at any
	frame size (16:9, 9:16, 4:5 …).
	  lines    one string per line (default ["Full video", "on YouTube"]); `accent` is in the
	           brand's primary colour
	  accent   index of that line (default the last; -1: none)
	  handle   "@channel" under the lines (optional)
	  image    a round picture beside the handle: a URL or { "file": … } (default: the brand's
	           mark logo, if it has one; false: none)
	  dim      0–1, how dark the picture under the card gets (default 0.8)
-->
<script lang="ts">
	import { useClip, useReady } from '../runtime.svelte.js';

	const clip = useClip();
	const props = clip.props as {
		lines?: unknown[];
		accent?: number;
		handle?: string;
		image?: string | false;
		dim?: number;
	};
	const lines = Array.isArray(props.lines) ? props.lines.map(String) : ['Full video', 'on YouTube'];
	const accent = typeof props.accent === 'number' ? props.accent : lines.length - 1;
	const logo = clip.brand.logo.mark;
	const image =
		props.image === false
			? null
			: typeof props.image === 'string'
				? props.image
				: (logo.dark ?? logo.light);
	const dim = typeof props.dim === 'number' ? Math.max(0, Math.min(1, props.dim)) : 0.8;
	// A first size from the longest line's characters (all lines together at most 60 % of the
	// safe height), then measured once after mount (fonts are loaded by then) and scaled down
	// until the widest line fits the safe width.
	const chars = Math.max(4, ...lines.map((l) => [...l].length));
	let box = $state<HTMLDivElement>();
	let stack = $state<HTMLDivElement>();
	let fit = $state(1);
	$effect(() => {
		if (box && stack && stack.offsetWidth > box.clientWidth)
			fit = box.clientWidth / stack.offsetWidth;
	});
	if (image) {
		const img = new Image();
		img.src = image;
		useReady(img.decode());
	}

	/** When line `i` lands, in clip seconds. */
	const lands = (i: number) => 0.15 + i * 0.18;
	const shade = $derived(clip.p(0, 0.35, 'power2.out'));
	const line = (i: number) => clip.p(lands(i), 0.42, 'back.out(1.8)');
	const foot = $derived(clip.p(lands(lines.length) + 0.05, 0.45, 'expo.out'));
	const drift = $derived(
		clip.map(
			[
				[0, 0],
				['end', 1]
			],
			'none'
		)
	);
</script>

<div class="vf-end-shade" style:opacity={shade * dim}></div>
<div class="vf-end-safe" bind:this={box} style:--chars={chars} style:--lines={lines.length}>
	<div
		class="vf-end-stack"
		bind:this={stack}
		style:--fit={fit}
		style:transform="scale({1 + drift * 0.03})"
	>
		{#each lines as text, i (i)}
			{@const k = line(i)}
			<div
				class="vf-end-line"
				class:accent={i === accent}
				style:opacity={Math.min(1, k * 2.5)}
				style:transform="translateY({((1 - k) * 0.35).toFixed(4)}em) scale({1.25 - 0.25 * k})"
			>
				{text}
			</div>
		{/each}
		{#if props.handle || image}
			<div
				class="vf-end-foot"
				style:opacity={foot}
				style:transform="translateY({((1 - foot) * 0.6).toFixed(4)}em)"
			>
				{#if image}<img src={image} alt="" />{/if}
				{#if props.handle}<span>{props.handle}</span>{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.vf-end-shade {
		position: absolute;
		inset: 0;
		background: radial-gradient(
			ellipse at 50% 45%,
			color-mix(in srgb, var(--brand-background) 70%, transparent),
			var(--brand-background)
		);
	}
	.vf-end-safe {
		position: absolute;
		top: var(--safe-top);
		right: var(--safe-right);
		bottom: var(--safe-bottom);
		left: var(--safe-left);
		container-type: size;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.vf-end-stack {
		display: flex;
		flex-direction: column;
		align-items: center;
		font-family: var(--brand-font-heading);
		width: max-content;
		font-size: calc(
			var(--fit) * min(calc(100cqw / (var(--chars) * 0.5)), calc(60cqh / var(--lines)), 20cqw)
		);
	}
	.vf-end-line {
		font-weight: 900;
		line-height: 1.02;
		letter-spacing: -0.03em;
		white-space: nowrap;
		color: var(--brand-text);
		text-shadow: 0 0.08em 0.3em rgb(0 0 0 / 0.5);
	}
	.vf-end-line.accent {
		color: var(--brand-primary);
	}
	.vf-end-foot {
		margin-top: 0.35em;
		display: flex;
		align-items: center;
		gap: 0.4em;
		font-family: var(--brand-font-body);
		font-size: 0.42em;
		font-weight: 700;
		color: var(--brand-text);
		white-space: nowrap;
	}
	.vf-end-foot img {
		width: 1.6em;
		height: 1.6em;
		border-radius: 50%;
		object-fit: cover;
	}
</style>
