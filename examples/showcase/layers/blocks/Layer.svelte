<!-- One layer of the speaker-depth look, for the exploded layer stack on the homepage. -->
<script>
	import { useClip, Footage, Captions } from 'visualfries/motion';
	const clip = useClip();
	const layer = clip.props.layer;
	const W = clip.width;
	const H = clip.height;
	const FOOT_H = Math.round((1080 / 1000) * W);
	const FOOT_TOP = H - FOOT_H;
	const b = clip.subject('talk', 0, 0.3);
	const head = { x: b.headX * W, y: FOOT_TOP + b.headY * FOOT_H };
</script>

{#if layer === 'backdrop'}
	<div class="fill" style:background="radial-gradient(85% 45% at {head.x}px {head.y}px, #9a8650 0%, #4a4636 30%, #1a1c22 65%, #0b0c10 100%)"></div>
{:else if layer === 'type'}
	<div class="huge" style:top="{head.y - 190}px">HUGE</div>
{:else if layer === 'subject'}
	<div class="foot" style:top="{FOOT_TOP}px" style:height="{FOOT_H}px"><Footage name="talk" layer="subject" /></div>
{:else}
	<Captions words={clip.words.captions} preset="bold" y={0.7} emphasis={['huge']} hold={2} />
{/if}

<style>
	.fill { position: absolute; inset: 0; }
	.foot { position: absolute; left: 0; width: 100%; }
	.foot :global(*) { width: 100%; height: 100%; }
	.huge { position: absolute; left: 0; width: 100%; text-align: center; font: 400 400px/1 Anton, sans-serif; color: #fbc42d; letter-spacing: 0.01em; }
</style>
