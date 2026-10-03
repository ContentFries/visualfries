<!--
	Magazine cover from one frame of a talking head: the masthead sits behind the head, cut out
	by the footage's matte, so the speaker stands in front of the title.
-->
<script>
	import { Footage, useClip } from 'visualfries/motion';

	const clip = useClip();
	const f = clip.footage.talk;
	const box = clip.subject('talk', 0, 0);
	// Scale the speaker so the shoulders overfill the cover; put the top of the head at y 250.
	const W = 1180;
	const H = Math.round((f.height / f.width) * W);
	const left = 650 - box.headX * W;
	const top = 200 - box.headY * H;
</script>

<div class="cover">
	<div class="glow"></div>
	<div class="mast display">SIGNAL</div>
	<div class="issue mono"><span>N° 05 · THE AI EDIT</span><span>OCT 2026</span></div>
	<div class="me" style:left="{left}px" style:top="{top}px" style:width="{W}px" style:height="{H}px">
		<Footage name="talk" layer="subject" class="fill" />
	</div>
	<div class="line l1"><b class="display">Edit at the speed of thought</b><span>How one take became a reel, a post and a carousel</span></div>
	<div class="line l2"><b class="display">Behind your head</b><span>The matte trick, explained</span></div>
	<div class="sticker display">ONE<br />TAKE.<small>ZERO<br />TIMELINES</small></div>
	<div class="foot">
		<span class="display">“A video editor who uses these AI tools will have a huge edge.”</span>
	</div>
</div>

<style>
	.cover { position: absolute; inset: 0; background: #ffe100; overflow: hidden; }
	.glow { position: absolute; inset: 0; background: radial-gradient(70% 50% at 50% 55%, #fff6a8 0%, rgba(255, 225, 0, 0) 70%); }
	.mast { position: absolute; left: 0; width: 100%; top: 40px; text-align: center; font-size: 318px; font-weight: 800;
		letter-spacing: -0.055em; line-height: 0.8; color: #0b0b0c; }
	.issue { position: absolute; left: 48px; right: 48px; top: 312px; display: flex; justify-content: space-between;
		font-size: 22px; font-weight: 600; letter-spacing: 0.14em; color: #0b0b0c; }
	.me { position: absolute; filter: drop-shadow(0 30px 40px rgba(60, 40, 0, 0.35)); }
	.me :global(.fill) { width: 100%; height: 100%; display: block; }
	.line { position: absolute; width: 270px; color: #0b0b0c; }
	.line b { display: block; font-size: 44px; font-weight: 800; line-height: 0.95; letter-spacing: -0.03em; }
	.line span { display: block; margin-top: 12px; font: 500 22px/1.3 Inter, sans-serif; }
	.l1 { left: 48px; top: 420px; }
	.l2 { left: 48px; top: 700px; width: 240px; }
	.l2 b { font-size: 40px; }
	.sticker { position: absolute; left: 50px; top: 930px; width: 230px; height: 230px; border-radius: 50%;
		background: #ff4d4d; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center;
		text-align: center; font-size: 50px; font-weight: 800; line-height: 0.9; letter-spacing: -0.03em; rotate: -10deg;
		box-shadow: 0 16px 40px rgba(120, 0, 0, 0.35); }
	.sticker small { display: block; margin-top: 10px; font: 700 18px/1.15 'JetBrains Mono', monospace; letter-spacing: 0.08em; }
	.foot { position: absolute; left: 0; right: 0; bottom: 0; height: 150px; background: #0b0b0c; color: #f4f3ee;
		display: flex; align-items: center; justify-content: center; padding: 0 60px; text-align: center; }
	.foot span { font-size: 40px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.05; }
</style>
