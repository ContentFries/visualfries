<!-- Slide 2, step 1: record once. The take plays in a viewfinder with a running timecode. -->
<script>
	import { Footage, useClip } from 'visualfries/motion';
	import Chrome from '../theme/Chrome.svelte';

	const clip = useClip();
	const n = clip.props.n;

	const head = $derived(clip.p(0.15, 0.8, 'expo.out'));
	const view = $derived(clip.p(0.45, 0.9, 'expo.inOut'));
	const corners = $derived(clip.p(1.05, 0.6, 'back.out(1.6)'));

	// Shown a second early so the last frame lands on open eyes.
	const OFFSET = -1;
	// Timecode of the footage frame on screen.
	const tc = $derived.by(() => {
		const f = clip.programStartFrame + clip.frame + OFFSET * clip.fps;
		const s = Math.floor(f / clip.fps);
		const pad = (v) => String(v).padStart(2, '0');
		return `00:00:${pad(s)}:${pad(f % clip.fps)}`;
	});
</script>

<div class="slide dark">
	<div class="abs step kicker" style:opacity={clip.p(0, 0.4)}>
		<span class="num">01</span>{'Step one'}
	</div>

	<h1 class="abs title head">
		<span class="mask"><span class="in" style:transform="translateY({(1 - head) * 110}%)">Record</span></span>
		<span class="mask"
			><span class="in" style:transform="translateY({(1 - clip.p(0.27, 0.8, 'expo.out')) * 110}%)"
				><span class="serif once">once.</span></span
			></span
		>
	</h1>

	<p class="abs sub" style:opacity={clip.p(0.7, 0.6)} style:transform="translateY({(1 - clip.p(0.7, 0.6)) * 20}px)">
		One talking-head take. No retakes per platform, no separate script for every format.
	</p>

	<div class="abs finder" style:clip-path="inset({(1 - view) * 50}% {(1 - view) * 50}% round 22px)">
		<Footage name="talk" layer="plate" offset={OFFSET} class="plate" />
		<div class="hud mono" style:opacity={clip.p(1.0, 0.4)}>
			<span class="rec"><span class="dot"></span>REC</span>
			<span>{tc}</span>
		</div>
		<div class="hud bottom mono" style:opacity={clip.p(1.15, 0.4)}>
			<span>1000×1080 · 30 fps</span><span>take 01</span>
		</div>
	</div>
	{#each ['tl', 'tr', 'bl', 'br'] as c}
		<div class="abs corner {c}" style:opacity={Math.min(1, corners)} style:--k={2 - corners}></div>
	{/each}

	<Chrome {n} dark={true} />
</div>

<style>
	.step { left: 64px; top: 150px; display: flex; align-items: center; gap: 16px; color: var(--y); }
	.num {
		background: var(--y);
		color: var(--ink);
		padding: 4px 10px;
		border-radius: 4px;
	}
	.title { left: 64px; top: 200px; margin: 0; font-size: 150px; display: flex; gap: 32px; align-items: baseline; }
	.in { display: block; }
	.once { color: var(--y); font-size: 168px; letter-spacing: -0.02em; font-weight: 400; }
	.sub {
		left: 64px;
		top: 392px;
		width: 860px;
		margin: 0;
		font-size: 34px;
		line-height: 1.35;
		color: var(--mute);
	}
	.finder {
		left: 64px;
		top: 540px;
		width: 952px;
		height: 680px;
		overflow: hidden;
		background: var(--ink2);
	}
	.finder :global(.plate) {
		position: absolute;
		left: 0;
		top: -40px;
		width: 952px;
		height: auto;
	}
	.hud {
		position: absolute;
		left: 28px;
		right: 28px;
		top: 24px;
		display: flex;
		justify-content: space-between;
		font-size: 24px;
		font-weight: 700;
		color: #fff;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5);
	}
	.hud.bottom { top: auto; bottom: 24px; font-weight: 500; opacity: 0.9; }
	.rec { display: flex; align-items: center; gap: 10px; }
	.dot { width: 16px; height: 16px; border-radius: 50%; background: var(--y); }
	.corner {
		width: 56px;
		height: 56px;
		border: 0 solid var(--y);
		transform: scale(var(--k));
	}
	.tl { left: 44px; top: 520px; border-top-width: 6px; border-left-width: 6px; transform-origin: 0 0; }
	.tr { right: 44px; top: 520px; border-top-width: 6px; border-right-width: 6px; transform-origin: 100% 0; }
	.bl { left: 44px; top: 1184px; border-bottom-width: 6px; border-left-width: 6px; transform-origin: 0 100%; }
	.br { right: 44px; top: 1184px; border-bottom-width: 6px; border-right-width: 6px; transform-origin: 100% 100%; }
</style>
