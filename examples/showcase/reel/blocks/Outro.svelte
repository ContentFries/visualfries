<!-- 9:16 end card, 4 s: "Everything you see in this video was fully edited by an AI agent." slammed in line by line. -->
<script>
	import { useClip, useTimeline } from 'visualfries/motion';
	const clip = useClip();
	const lines = [
		{ t: 'EVERYTHING', at: 0.15 },
		{ t: 'YOU SEE IN', at: 0.45 },
		{ t: 'THIS VIDEO', at: 0.75 },
		{ t: 'WAS FULLY', at: 1.1 },
		{ t: 'EDITED BY', at: 1.4 },
		{ t: 'AN AI AGENT.', at: 1.85, accent: true }
	];
	const glow = $derived(clip.p(1.85, 0.8, 'power2.out'));

	useTimeline(({ tl, q }) => {
		lines.forEach((l, i) => {
			tl.fromTo(
				q(`[data-l="${i}"]`),
				{ scale: 1.6, opacity: 0, filter: 'blur(18px)' },
				{ scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.32, ease: 'expo.out' },
				l.at
			);
		});
		tl.fromTo(q('.foot'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out' }, 2.5);
	});
</script>

<div class="o" style:--glow={glow}>
	<div class="stack">
		{#each lines as l, i}
			<div class="line" class:accent={l.accent} data-l={i}>{l.t}</div>
		{/each}
	</div>
	<div class="foot">made with visualfries</div>
</div>

<style>
	.o {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(70% 40% at 50% 62%, rgba(251, 196, 45, calc(0.22 * var(--glow))), transparent 70%),
			#08090c;
		color: #fff;
		overflow: hidden;
	}
	.stack {
		position: absolute;
		left: 0;
		right: 0;
		top: 50%;
		transform: translateY(-54%);
		display: grid;
		justify-items: center;
		gap: 6px;
	}
	.line {
		font: 400 158px/0.98 Anton, sans-serif;
		letter-spacing: 0.005em;
		white-space: nowrap;
	}
	.line.accent {
		color: #fbc42d;
		font-size: 168px;
		margin-top: 18px;
	}
	.foot {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 150px;
		text-align: center;
		font: 600 34px Inter, sans-serif;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.6);
	}
</style>
