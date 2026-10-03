<!-- Slide 1, the hook: ONE TAKE slams in behind the speaker's head, the promise lands below. -->
<script>
	import { onMount } from 'svelte';
	import { Footage, useClip } from 'visualfries/motion';
	import Chrome from '../theme/Chrome.svelte';

	const clip = useClip();
	const n = clip.props.n;

	// Fit ONE TAKE to the slide width once fonts are in.
	let big;
	let size = $state(300);
	onMount(() => {
		size = Math.floor(300 * (952 / big.scrollWidth));
	});

	const speak = $derived(clip.p(0, 0.9, 'expo.out'));
	const slam = $derived(clip.p(0.35, 0.55, 'expo.out'));
	const box = $derived(clip.p(0.95, 0.6, 'expo.inOut'));
	const line = $derived(clip.p(1.25, 0.7, 'expo.out'));
	const nudge = $derived(clip.p(1.7, 0.5, 'back.out(2)'));
</script>

<div class="slide light">
	<div class="abs kicker-wrap">
		<span class="mask"
			><span class="kick head" style:transform="translateY({(1 - clip.p(0.1, 0.7, 'expo.out')) * 110}%)"
				>How to turn</span
			></span
		>
	</div>

	<div
		class="abs big"
		bind:this={big}
		style:font-size="{size}px"
		style:opacity={Math.min(1, slam * 1.4)}
		style:transform="translateX(-50%) scale({1.35 - 0.35 * slam})"
		style:filter="blur({(1 - slam) * 24}px)"
	>
		ONE TAKE
	</div>

	<div class="abs speaker" style:transform="translateY({(1 - speak) * 260}px)" style:opacity={speak}>
		<Footage name="talk" layer="subject" class="foot" />
	</div>

	<div class="abs tag mono" style:opacity={clip.p(0.8, 0.4)}>
		<span class="rec"></span>{'talking head · 1 take'}
	</div>

	<div class="abs promise" style:clip-path="inset({(1 - box) * 100}% 0 0 0)">
		<div class="mask">
			<div class="line serif" style:transform="translateY({(1 - line) * 105}%)">
				into a week of content.
			</div>
		</div>
		<div class="swipe mono" style:opacity={nudge} style:transform="translateX({(1 - nudge) * -40}px)">
			{'swipe →'}
		</div>
	</div>

	<Chrome {n} barDark={true} />
</div>

<style>
	.kicker-wrap { left: 64px; top: 150px; }
	.kick { display: block; font-size: 92px; }
	.big {
		left: 50%;
		top: 250px;
		font-family: 'Anton', sans-serif;
		line-height: 1;
		white-space: nowrap;
		color: var(--ink);
		letter-spacing: -0.01em;
		transform-origin: 50% 60%;
	}
	.speaker {
		left: -50px;
		top: 395px;
		width: 1000px;
		/* The footage is cropped at the right shoulder; feather that edge before the band covers it. */
		-webkit-mask-image: linear-gradient(to right, #000 88%, transparent 100%);
		mask-image: linear-gradient(to right, #000 88%, transparent 100%);
	}
	.speaker :global(.foot) { display: block; width: 1000px; height: auto; }
	.tag {
		right: 64px;
		top: 610px;
		display: flex;
		align-items: center;
		gap: 12px;
		font-size: 22px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: var(--ink);
		color: var(--y);
		padding: 10px 16px;
		border-radius: 6px;
	}
	.rec { width: 12px; height: 12px; border-radius: 50%; background: var(--y); }
	.promise {
		left: 0;
		right: 0;
		top: 1060px;
		bottom: 0;
		background: var(--ink);
		padding: 54px 64px 0;
	}
	.line { font-size: 112px; line-height: 1.05; color: var(--y); white-space: nowrap; }
	.swipe {
		margin-top: 18px;
		font-size: 24px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--paper);
		opacity: 0.8;
	}
</style>
