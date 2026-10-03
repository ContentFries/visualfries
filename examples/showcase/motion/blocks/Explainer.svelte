<!--
	16:9 explainer, 12 s: how one prompt becomes a reel. Four nodes light up in turn (prompt →
	project → blocks → render), a packet travels along the wire, and the output fans out into
	three formats.
-->
<script>
	import { useClip, useTimeline } from 'visualfries/motion';
	const clip = useClip();

	const nodes = [
		{ x: 250, label: 'You say', title: 'A prompt', body: '“Make a reel from this take. Put HUGE behind my head.”' },
		{ x: 710, label: 'Agent writes', title: 'project.vf.json', body: 'footage · matte · cues on spoken words' },
		{ x: 1170, label: 'Agent writes', title: 'Svelte blocks', body: 'type, light, captions as components' },
		{ x: 1630, label: 'VisualFries', title: 'Renders', body: 'frame-exact MP4, posts, carousels' }
	];
	const beats = [1.0, 3.2, 5.4, 7.6];
	const wire = $derived(clip.map([[0.6, 0], [beats[3] + 0.4, 1]], 'power1.inOut'));
	const active = $derived(clip.step(...beats));
	const fan = $derived(clip.p(9.0, 0.9, 'expo.out'));

	useTimeline(({ tl, q }) => {
		tl.from(q('.title-row > *'), { y: 40, opacity: 0, stagger: 0.12, duration: 0.7, ease: 'expo.out' }, 0.1);
		nodes.forEach((_, i) => {
			tl.from(q(`.node[data-i="${i}"]`), { y: 60, opacity: 0, scale: 0.92, duration: 0.6, ease: 'back.out(1.6)' }, beats[i] - 0.35);
		});
		tl.to(q('.title-row'), { opacity: 0, y: -30, duration: 0.5, ease: 'power2.in' }, 11.2);
	});
</script>

<div class="ex">
	<div class="grid"></div>
	<div class="title-row">
		<span class="eyebrow mono"><i></i>HOW IT WORKS</span>
		<h1 class="display">One prompt. <em>Every format.</em></h1>
	</div>

	<svg class="wire" viewBox="0 0 1920 1080" width="1920" height="1080">
		<line x1="250" y1="720" x2="1630" y2="720" stroke="#25272e" stroke-width="6" stroke-linecap="round" />
		<line x1="250" y1="720" x2={250 + 1380 * wire} y2="720" stroke="#ffe100" stroke-width="6" stroke-linecap="round" />
		<circle cx={250 + 1380 * wire} cy="720" r="16" fill="#ffe100" opacity={wire > 0 && wire < 1 ? 1 : 0} />
	</svg>

	{#each nodes as n, i}
		<div class="node" class:on={active >= i} data-i={i} style:left="{n.x - 190}px">
			<span class="lab mono">{String(i + 1).padStart(2, '0')} · {n.label}</span>
			<b class="display">{n.title}</b>
			<p>{n.body}</p>
			<span class="dot"></span>
		</div>
	{/each}

	{#each [['9:16', 'Reel', 220, 390], ['4:5', 'Post', 270, 338], ['1:1', 'Carousel', 300, 300]] as [ratio, name, w, h], i}
		<div
			class="out"
			style:width="{w * 0.62}px"
			style:height="{h * 0.62}px"
			style:left="{960 - (w * 0.62) / 2 + (i - 1) * 300 * fan}px"
			style:top="{800 + (1 - fan) * 40}px"
			style:opacity={fan}
			style:rotate="{(i - 1) * 6 * fan}deg"
		>
			<span class="display">{name}</span><small class="mono">{ratio}</small>
		</div>
	{/each}
</div>

<style>
	.display { font-family: 'Bricolage', sans-serif; }
	.mono { font-family: 'JetBrains Mono', monospace; }
	.ex { position: absolute; inset: 0; background: #09090b; color: #f4f3ee; overflow: hidden; }
	.grid { position: absolute; inset: 0; background-image: linear-gradient(#141518 1px, transparent 1px), linear-gradient(90deg, #141518 1px, transparent 1px);
		background-size: 80px 80px; mask-image: radial-gradient(70% 70% at 50% 55%, #000, transparent); }
	.title-row { position: absolute; left: 120px; top: 100px; }
	.eyebrow { display: flex; align-items: center; gap: 16px; font-size: 22px; letter-spacing: 0.16em; color: #8b8d96; }
	.eyebrow i { width: 34px; height: 3px; background: #ffe100; }
	h1 { margin: 18px 0 0; font-size: 110px; font-weight: 800; letter-spacing: -0.045em; line-height: 0.95; }
	h1 em { font-style: normal; color: #ffe100; }
	.wire { position: absolute; left: 0; top: 0; }
	.node { position: absolute; top: 450px; width: 380px; height: 140px; padding: 0; }
	.node .lab { display: block; font-size: 20px; letter-spacing: 0.12em; color: #8b8d96; text-transform: uppercase; }
	.node b { display: block; margin-top: 10px; font-size: 50px; font-weight: 800; letter-spacing: -0.03em; color: #5b5c63; transition: none; }
	.node p { margin: 10px 0 0; font: 400 26px/1.35 Inter, sans-serif; color: #5b5c63; }
	.node .dot { position: absolute; left: 172px; top: 252px; width: 36px; height: 36px; border-radius: 50%; background: #141518; border: 4px solid #25272e; }
	.node.on b { color: #f4f3ee; }
	.node.on p { color: #c9c9c2; }
	.node.on .lab { color: #ffe100; }
	.node.on .dot { background: #ffe100; border-color: #ffe100; box-shadow: 0 0 40px rgba(255, 225, 0, 0.7); }
	.out { position: absolute; border-radius: 18px; background: #ffe100; color: #0b0b0c; display: flex; flex-direction: column; align-items: center;
		justify-content: center; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); }
	.out span { font-size: 34px; font-weight: 800; letter-spacing: -0.03em; }
	.out small { margin-top: 6px; font-size: 18px; letter-spacing: 0.1em; }
</style>
