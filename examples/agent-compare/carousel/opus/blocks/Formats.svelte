<!-- Slide 4, step 3: one take, rendered to every aspect ratio. Each frame shows the real footage. -->
<script>
	import { Footage, useClip } from 'visualfries/motion';
	import Chrome from '../theme/Chrome.svelte';

	const clip = useClip();
	const n = clip.props.n;
	// Row one: the three tall formats spread across the 952 px column; row two: 16:9.
	const H = 350;
	const row = [
		{ r: '9:16', w: Math.round((H * 9) / 16), h: H, use: 'Reels · Shorts' },
		{ r: '4:5', w: Math.round((H * 4) / 5), h: H, use: 'Feed post' },
		{ r: '1:1', w: H, h: H, use: 'Square' }
	];
	const gap = (952 - row.reduce((a, f) => a + f.w, 0)) / 2;
	let x = 64;
	const formats = [
		...row.map((f) => {
			const out = { ...f, x, y: 496 };
			x += f.w + gap;
			return out;
		}),
		{ r: '16:9', w: 528, h: 297, use: 'YouTube · LinkedIn', x: 64, y: 956, side: true }
	];
</script>

<div class="slide dark">
	<div class="abs step kicker" style:opacity={clip.p(0, 0.4)}>
		<span class="num">03</span>{'Step three'}
	</div>

	<h1 class="abs title head">
		<span class="mask"
			><span class="in" style:transform="translateY({(1 - clip.p(0.12, 0.8, 'expo.out')) * 110}%)"
				>VisualFries renders</span
			></span
		>
		<span class="mask"
			><span class="in serif" style:transform="translateY({(1 - clip.p(0.24, 0.8, 'expo.out')) * 110}%)"
				>every format.</span
			></span
		>
	</h1>

	<div class="abs grid">
		{#each formats as f, i}
			{@const pop = clip.p(0.55 + i * 0.16, 0.6, 'back.out(1.5)')}
			{@const lab = clip.p(0.8 + i * 0.16, 0.4)}
			<div class="cell" class:side={f.side} style:left="{f.x}px" style:top="{f.y}px">
				<div
					class="frame"
					style:width="{f.w}px"
					style:height="{f.h}px"
					style:opacity={Math.min(1, pop * 1.5)}
					style:transform="scale({0.6 + 0.4 * pop})"
				>
					<Footage name="talk" layer="plate" class="fit" />
					<div class="cap" style:font-size="{Math.round(Math.min(f.w, f.h) * 0.13)}px">a huge edge.</div>
				</div>
				<div class="label" style:opacity={lab} style:transform="translateY({(1 - lab) * 12}px)">
					<span class="r mono">{f.r}</span>
					<span class="use">{f.use}</span>
				</div>
			</div>
		{/each}
	</div>

	<Chrome {n} dark={true} />
</div>

<style>
	.step { left: 64px; top: 150px; display: flex; align-items: center; gap: 16px; color: var(--y); }
	.num { background: var(--y); color: var(--ink); padding: 4px 10px; border-radius: 4px; }
	.title { left: 64px; top: 200px; margin: 0; font-size: 112px; }
	.in { display: block; padding-bottom: 6px; }
	.serif { color: var(--y); font-size: 124px; font-weight: 400; letter-spacing: -0.02em; }
	.grid { inset: 0; }
	.cell { position: absolute; display: flex; flex-direction: column; }
	.cell.side { flex-direction: row; align-items: flex-end; gap: 32px; }
	.frame {
		position: relative;
		overflow: hidden;
		border-radius: 14px;
		outline: 3px solid var(--y);
		outline-offset: 0;
		transform-origin: 0 100%;
		background: var(--ink2);
	}
	.frame :global(.fit) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: 58% 30%;
	}
	.cap {
		position: absolute;
		left: 50%;
		bottom: 9%;
		transform: translateX(-50%);
		font-family: 'Anton', sans-serif;
		text-transform: uppercase;
		white-space: nowrap;
		color: var(--ink);
		background: var(--y);
		padding: 0.08em 0.3em;
		line-height: 1.1;
	}
	.label { display: flex; flex-direction: column; gap: 4px; margin-top: 16px; }
	.side .label { margin: 0 0 4px; }
	.r { font-size: 34px; font-weight: 800; color: var(--y); line-height: 1; }
	.use { font-size: 22px; color: var(--mute); font-weight: 500; white-space: nowrap; }
	.side .r { font-size: 64px; }
	.side .use { font-size: 26px; }
</style>
