<!-- Five-slide carousel: "One take, a week of content". Slide number comes from props.n. -->
<script>
	import { Footage, useClip } from 'visualfries/motion';
	const clip = useClip();
	const n = clip.props.n;
	const f = clip.footage.talk;
	const box = clip.subject('talk', 0, 0);
	const W = 900;
	const H = Math.round((f.height / f.width) * W);
	const steps = [
		null,
		{ k: '01', t: 'Record once.', b: 'Talk to the camera once. No script, no B-roll, no second take.', icon: 'rec' },
		{ k: '02', t: 'Your agent reads the words.', b: 'The transcript times everything: cuts, captions, the word that slams in behind your head.', icon: 'words' },
		{ k: '03', t: 'VisualFries renders the week.', b: 'Reels, quote posts, stat posts and this carousel, from the same take and the same brand.', icon: 'stack' }
	];
</script>

<div class="slide" class:dark={n !== 1 && n !== 5}>
	<div class="dots">{#each [1, 2, 3, 4, 5] as d}<i class:on={d === n}></i>{/each}</div>

	{#if n === 1}
		<div class="big display">ONE<br />TAKE.</div>
		<div class="me" style:left="{560 - box.headX * W}px" style:top="{520 - box.headY * H}px" style:width="{W}px" style:height="{H}px">
			<Footage name="talk" layer="subject" class="fill" />
		</div>
		<div class="sub display">A week of content.<br /><span>Swipe →</span></div>
	{:else if n === 5}
		<div class="end display">Your AI editor,<br />motion designer<br />and graphic designer.</div>
		<div class="pill mono">npm i visualfries</div>
		<div class="url display">visualfries.com</div>
	{:else}
		{@const s = steps[n - 1]}
		<div class="k mono">{s.k} / 03</div>
		<div class="t display">{s.t}</div>
		<p class="b">{s.b}</p>
		<div class="art {s.icon}">
			{#if s.icon === 'rec'}
				<div class="phone"><div class="me2"><Footage name="talk" layer="subject" class="fill" /></div><span class="recdot"></span></div>
			{:else if s.icon === 'words'}
				{#each ['Anyway,', 'a', 'video', 'editor', 'who', 'uses', 'these', 'AI', 'tools'] as w, i}
					<span class="wd" class:hot={w === 'AI'}>{w}<small class="mono">{(0.1 + i * 0.36).toFixed(2)}s</small></span>
				{/each}
			{:else}
				<div class="card c1"></div><div class="card c2"></div><div class="card c3"><b class="display">13</b></div>
			{/if}
		</div>
		<div class="swipe mono">SWIPE →</div>
	{/if}
</div>

<style>
	.slide { position: absolute; inset: 0; background: #ffe100; color: #0b0b0c; overflow: hidden; }
	.slide.dark { background: #09090b; color: #f4f3ee; }
	.dots { position: absolute; left: 72px; top: 72px; display: flex; gap: 10px; z-index: 5; }
	.dots i { width: 44px; height: 8px; border-radius: 999px; background: currentColor; opacity: 0.25; }
	.dots i.on { opacity: 1; }
	.dark .dots i.on { background: #ffe100; }
	.big { position: absolute; left: 0; width: 100%; top: 140px; text-align: center; font-size: 330px; font-weight: 800; letter-spacing: -0.06em; line-height: 0.82; }
	.me { position: absolute; }
	.me :global(.fill), .me2 :global(.fill) { width: 100%; height: 100%; display: block; }
	.sub { position: absolute; left: 0; right: 0; bottom: 0; height: 220px; background: #0b0b0c; color: #f4f3ee; display: flex; flex-direction: column;
		align-items: center; justify-content: center; font-size: 66px; font-weight: 800; letter-spacing: -0.03em; line-height: 1; }
	.sub span { margin-top: 14px; font-size: 30px; color: #ffe100; letter-spacing: 0; }
	.k { position: absolute; left: 72px; top: 150px; font-size: 26px; letter-spacing: 0.16em; color: #ffe100; }
	.t { position: absolute; left: 72px; right: 72px; top: 200px; font-size: 104px; font-weight: 800; line-height: 0.95; letter-spacing: -0.045em; }
	.b { position: absolute; left: 72px; right: 140px; top: 470px; margin: 0; font: 400 36px/1.35 Inter, sans-serif; color: #c9c9c2; }
	.art { position: absolute; left: 72px; right: 72px; top: 720px; height: 470px; }
	.phone { position: absolute; left: 300px; top: 0; width: 280px; height: 470px; border-radius: 40px; background: #1a1b20; border: 3px solid #2b2d34; overflow: hidden; }
	.me2 { position: absolute; left: -60px; bottom: -10px; width: 400px; height: 432px; }
	.recdot { position: absolute; right: 22px; top: 22px; width: 22px; height: 22px; border-radius: 50%; background: #ff4d4d; box-shadow: 0 0 20px #ff4d4d; }
	.words { display: flex; flex-wrap: wrap; gap: 16px; align-content: flex-start; }
	.wd { display: inline-flex; flex-direction: column; padding: 14px 20px; border-radius: 16px; background: #141518; border: 1px solid #25272e;
		font: 700 44px/1 Bricolage, sans-serif; letter-spacing: -0.02em; }
	.wd small { margin-top: 8px; font-size: 16px; color: #8b8d96; letter-spacing: 0.06em; }
	.wd.hot { background: #ffe100; color: #0b0b0c; border-color: #ffe100; }
	.wd.hot small { color: #3d3500; }
	.card { position: absolute; width: 300px; height: 375px; border-radius: 22px; }
	.c1 { left: 120px; top: 70px; background: #f4f1e8; rotate: -10deg; }
	.c2 { left: 330px; top: 30px; background: #3d6cff; rotate: 4deg; }
	.c3 { left: 540px; top: 60px; background: #ffe100; rotate: 12deg; display: flex; align-items: center; justify-content: center; }
	.c3 b { font-size: 140px; font-weight: 800; color: #0b0b0c; letter-spacing: -0.06em; }
	.swipe { position: absolute; right: 72px; bottom: 64px; font-size: 22px; letter-spacing: 0.16em; color: #8b8d96; }
	.end { position: absolute; left: 72px; right: 72px; top: 260px; font-size: 104px; font-weight: 800; line-height: 0.96; letter-spacing: -0.045em; }
	.pill { position: absolute; left: 72px; top: 760px; padding: 26px 40px; border-radius: 999px; background: #0b0b0c; color: #ffe100; font-size: 40px; }
	.url { position: absolute; left: 72px; bottom: 80px; font-size: 52px; font-weight: 800; letter-spacing: -0.03em; }
</style>
