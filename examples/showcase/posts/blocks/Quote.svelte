<!-- Quote post: a serif pull quote with a highlighter on the key words and the speaker, cut out, in the corner. -->
<script>
	import { Footage, useClip } from 'visualfries/motion';
	const clip = useClip();
	const f = clip.footage.talk;
	const box = clip.subject('talk', 0, 0);
	const W = 760;
	const H = Math.round((f.height / f.width) * W);
</script>

<div class="q">
	<div class="mark display">“</div>
	<p class="text">
		Everything you see here was <mark>fully edited</mark> by <em>an AI agent.</em>
	</p>
	<div class="by">
		<b class="display">Lukas</b>
		<span class="mono">MADE WITH VISUALFRIES</span>
	</div>
	<div class="me" style:left="{1080 - W * 0.78 - box.x * W * 0}px" style:top="{1350 - H + 40}px" style:width="{W}px" style:height="{H}px">
		<Footage name="talk" layer="subject" class="fill" />
	</div>
</div>

<style>
	.q { position: absolute; inset: 0; background: #f4f1e8; overflow: hidden; }
	.mark { position: absolute; left: 56px; top: -30px; font-size: 420px; font-weight: 800; color: #ffe100; line-height: 1;
		-webkit-text-stroke: 3px #0b0b0c; }
	.text { position: absolute; left: 72px; right: 72px; top: 250px; margin: 0; font-family: 'Instrument Serif', serif;
		font-style: italic; font-size: 104px; line-height: 1.02; letter-spacing: -0.02em; color: #0b0b0c; }
	mark { background: linear-gradient(transparent 55%, #ffe100 55%, #ffe100 92%, transparent 92%); color: inherit; padding: 0 4px; }
	em { font-style: normal; font-family: Bricolage, sans-serif; font-weight: 800; letter-spacing: -0.04em; white-space: nowrap; }
	.by { position: absolute; left: 76px; top: 1040px; }
	.by b { display: block; font-size: 56px; font-weight: 800; letter-spacing: -0.03em; color: #0b0b0c; }
	.by span { display: block; margin-top: 8px; font-size: 20px; letter-spacing: 0.16em; color: #5b5c63; }
	.me { position: absolute; filter: drop-shadow(-20px 20px 0 #ffe100); }
	.me :global(.fill) { width: 100%; height: 100%; display: block; }
</style>
