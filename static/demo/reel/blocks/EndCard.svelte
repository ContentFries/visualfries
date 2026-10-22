<!--
	Kinetic end card beside a window shot: lines of heavy type whose words slam in one after
	another (the last line in the accent), then a call to action on its cue.
	props.lines: string[], props.cta (<b> = accent), props.ctaAt (a cue), props.stagger, props.from.
	Portrait: a band at props.top px, props.height px tall (below the window); landscape: the half
	of the frame opposite the window. Type sizes follow the band (container units).
-->
<script>
	import { useClip } from 'visualfries/motion';

	const clip = useClip();
	const lines = clip.props.lines ?? [];
	const stagger = clip.props.stagger ?? 0.11;
	const from = clip.props.from ?? 0.2;
	const words = lines.map((l) => l.split(' '));
	let order = 0;
	const idx = words.map((ws) => ws.map(() => order++));


	const slam = (n) => clip.p(from + n * stagger, 0.42, 'expo.out');
	const cta = $derived(clip.p(clip.props.ctaAt ?? 'end-1', 0.4, 'back.out(1.8)'));
	// Portrait: a band below the window (props.top/height); landscape: the half opposite the window.
	const box =
		clip.format.class === 'portrait'
			? `left:0;right:0;top:${clip.props.top ?? 0}px;height:${clip.props.height ?? clip.height}px`
			: `left:4%;width:52%;top:12%;height:76%`;
	const breathe = $derived(1 + 0.025 * clip.map([[0, 0], ['end', 1]]));
</script>

<div class="panel" style={box}>
	<div class="block" style:transform="scale({breathe})">
		{#each words as ws, li}
			<div class="line" class:accent={li === words.length - 1}>
				{#each ws as w, wi}
					{@const k = slam(idx[li][wi])}
					<span
						style:opacity={Math.min(1, k * 2.5)}
						style:transform="translateY({(1 - k) * 0.5}em) rotateX({(1 - k) * 70}deg) scale({1.25 -
							0.25 * k})"
						style:filter="blur({((1 - k) * 8).toFixed(2)}px)">{w}</span
					>
				{/each}
			</div>
		{/each}
		<div
			class="cta"
			style:opacity={Math.min(1, cta * 1.5)}
			style:transform="translateY({(1 - cta) * 30}px) scale({0.9 + 0.1 * cta})"
		>
			{@html clip.props.cta ?? ''}
		</div>
	</div>
</div>

<style>
	.panel {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		container-type: size;
	}
	.block {
		text-align: center;
		transform-origin: 50% 50%;
		perspective: 900px;
	}
	.line {
		font-family: var(--brand-font-heading);
		font-size: min(12cqw, 19cqh);
		line-height: 1;
		padding-bottom: 0.04em;
		text-transform: uppercase;
		color: var(--brand-text);
		white-space: nowrap;
	}
	.line.accent {
		color: var(--brand-accent);
		font-size: min(21cqw, 32cqh);
	}
	.line span {
		display: inline-block;
		margin: 0 0.12em;
		transform-origin: 50% 100%;
	}
	.cta {
		margin-top: 2cqh;
		font-family: var(--brand-font-body);
		font-size: min(5.2cqw, 8cqh);
		font-weight: 800;
		color: var(--brand-muted);
	}
	.cta :global(b) {
		color: var(--brand-accent);
	}
</style>
