<!--
	Stat post, 1080×1350. Works as a still (last frame) and as a 4 s video: everything is in by ~3 s.

	Layers, back to front:
	  backdrop   dark gradient, spec grid, yellow glow behind the head
	  type       ONE TAKE BECOMES, the giant 13 (behind the head)
	  speaker    cut-out speaker with a yellow rim light, fading into the dark at the bottom
	  front      FINISHED ASSETS slab, the 1 + 5 + 1 + 1 + 5 breakdown, kicker, grain
-->
<script>
	import { Footage, noise, useClip, useFrame, useTimeline } from 'visualfries/motion';

	const clip = useClip();
	const items = clip.props.items;

	// Footage 1000×1080, drawn 900 wide on the right (cut by the frame edge), chin above the slab.
	const FW = 900;
	const FH = Math.round((clip.footage.talk.height / clip.footage.talk.width) * FW);
	const FL = 350;
	const FT = 372;
	const HEAD_X = FL + 0.49 * FW;

	const st = { glow: 0, flash: 0, shake: 0, rise: 140, blur: 18, fade: 0, count: 1, numS: 1 };

	let speaker, flash, num, typeLayer, grain;

	useTimeline(({ tl, at, q }) => {
		// Speaker rises out of the dark.
		tl.to(st, { rise: 0, blur: 0, fade: 1, duration: 0.9, ease: 'expo.out' }, at('speaker'));
		tl.to(st, { glow: 1, duration: 0.8, ease: 'power2.out' }, at('speaker+0.4'));
		tl.fromTo(q('.halo'), { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.2, ease: 'power2.out' }, at('speaker'));

		// Kicker and headline.
		tl.fromTo(q('.kick'), { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out' }, at('head'));
		tl.fromTo(q('.hw'), { yPercent: 110 }, { yPercent: 0, duration: 0.6, stagger: 0.09, ease: 'expo.out' }, at('head'));

		// The number counts up behind the head, then slams.
		tl.fromTo(num, { opacity: 0, scale: 0.7, filter: 'blur(24px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.4, ease: 'power3.out' }, at('count'));
		tl.fromTo(st, { count: 1 }, { count: 13, duration: at('slam') - at('count'), ease: 'power2.in' }, at('count'));
		tl.fromTo(st, { numS: 1.22 }, { numS: 1, duration: 0.5, ease: 'expo.out', immediateRender: false }, at('slam'));
		tl.fromTo(st, { flash: 0.55 }, { flash: 0, duration: 0.6, ease: 'power2.out', immediateRender: false }, at('slam'));
		tl.fromTo(st, { shake: 1 }, { shake: 0, duration: 0.4, immediateRender: false }, at('slam'));

		// FINISHED ASSETS slab wipes in.
		tl.fromTo(q('.slab'), { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: 'expo.out' }, at('tail'));
		tl.fromTo(q('.slab-text'), { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.45, ease: 'expo.out' }, at('tail+0.12'));

		// Breakdown.
		tl.fromTo(q('.rule'), { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'expo.inOut' }, at('grid-0.1'));
		tl.fromTo(q('.cell'), { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.09, ease: 'back.out(1.6)' }, at('grid'));
		tl.fromTo(q('.plus'), { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.3, stagger: 0.09, ease: 'back.out(2)' }, at('grid+0.2'));

		// Last touch: a shine passes the slab.
		tl.fromTo(q('.shine'), { xPercent: -120 }, { xPercent: 720, duration: 0.7, ease: 'power2.inOut' }, at('brand-0.1'));
	});

	useFrame(({ frame }) => {
		const sx = (noise(frame, 1) - 0.5) * 22 * st.shake;
		const sy = (noise(frame, 2) - 0.5) * 22 * st.shake;
		typeLayer.style.transform = `translate(${sx}px, ${sy}px)`;
		num.textContent = String(Math.round(st.count));
		num.style.scale = String(st.numS);
		flash.style.opacity = st.flash;
		speaker.style.transform = `translate(${sx * 0.35}px, ${st.rise + sy * 0.35}px)`;
		speaker.style.opacity = st.fade;
		const g = st.glow;
		speaker.style.filter =
			`blur(${st.blur}px) ` +
			(g > 0.01
				? `drop-shadow(0 0 ${3 + 3 * g}px rgba(255,225,0,${0.9 * g})) drop-shadow(0 0 ${30 + 20 * g}px rgba(255,225,0,${0.3 * g}))`
				: '');
		drawGrain(frame);
	});

	function drawGrain(frame) {
		const ctx = grain.getContext('2d');
		const img = ctx.createImageData(grain.width, grain.height);
		let s = ((frame + 1) * 2654435761) >>> 0;
		for (let i = 0; i < img.data.length; i += 4) {
			s = (s * 1664525 + 1013904223) >>> 0;
			img.data[i] = img.data[i + 1] = img.data[i + 2] = (s / 4294967296) * 255;
			img.data[i + 3] = 255;
		}
		ctx.putImageData(img, 0, 0);
	}
</script>

<div class="backdrop">
	<div class="gridlines"></div>
	<div class="halo" style:left="{HEAD_X}px" style:top="{FT + 260}px"></div>
</div>
<div class="flash" bind:this={flash}></div>

<div class="type" bind:this={typeLayer}>
	<div class="headline">
		<span class="mask"><span class="hw">One</span></span>
		<span class="mask"><span class="hw">take</span></span>
		<span class="mask"><span class="hw y">becomes</span></span>
	</div>
	<div class="num" bind:this={num}>13</div>
</div>

<div class="speaker" bind:this={speaker} style:left="{FL}px" style:top="{FT}px" style:width="{FW}px" style:height="{FH}px">
	<Footage name="talk" layer="subject" class="fill" />
</div>
<div class="floor"></div>

<div class="slab-wrap">
	<div class="slab"><div class="shine"></div></div>
	<div class="slab-text">Finished assets.</div>
</div>

<div class="breakdown">
	<div class="rule"></div>
	{#each items as it, i}
		<div class="cell" style:left="{i * 192}px">
			<div class="n">{it.n}</div>
			<div class="l">{it.label}</div>
		</div>
		{#if i < items.length - 1}
			<div class="plus" style:left="{(i + 1) * 192 - 14}px">+</div>
		{/if}
	{/each}
</div>

<div class="kick k-left"><span class="dot"></span>VisualFries</div>

<canvas class="grain" bind:this={grain} width="540" height="675"></canvas>

<style>
	div, canvas { position: absolute; }
	.backdrop, .flash, .type, .grain, .floor { left: 0; top: 0; width: 1080px; height: 1350px; }
	.backdrop { background: radial-gradient(90% 70% at 50% 45%, #1c1c1f 0%, #0e0e10 55%, #070708 100%); overflow: hidden; }
	.gridlines { inset: 0; opacity: 0.5;
		background-image: linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
		background-size: 60px 60px;
		-webkit-mask-image: radial-gradient(70% 60% at 50% 45%, #000 20%, transparent 80%); }
	.halo { width: 1100px; height: 1100px; margin: -550px 0 0 -550px; border-radius: 50%;
		background: radial-gradient(circle, rgba(255,225,0,0.20) 0%, rgba(255,225,0,0.06) 40%, rgba(0,0,0,0) 68%); }
	.flash { background: #ffe100; mix-blend-mode: screen; opacity: 0; }

	.headline { left: 0; top: 92px; width: 1080px; text-align: center; font: 128px/1 Anton, sans-serif;
		text-transform: uppercase; color: #f5f5f2; letter-spacing: 0.005em; white-space: nowrap; }
	.mask { position: relative; display: inline-block; overflow: hidden; padding: 0 2px; vertical-align: top; }
	.hw { display: inline-block; }
	.y { color: #ffe100; }
	.num { left: 40px; top: 214px; text-align: left; font: 800px/1 Anton, sans-serif; color: #ffe100;
		letter-spacing: -0.02em; transform-origin: 300px 420px; opacity: 0;
		text-shadow: 0 0 80px rgba(255, 225, 0, 0.25); }

	.speaker { transform-origin: 50% 100%; }
	.speaker :global(.fill) { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
	.floor { background: linear-gradient(180deg, rgba(10,10,11,0) 0px, rgba(10,10,11,0) 960px, rgba(10,10,11,0.92) 1130px, #0a0a0b 1190px); }

	.slab-wrap { left: 60px; top: 968px; width: 960px; height: 140px; rotate: -2.5deg; }
	.slab { inset: 0; background: #ffe100; transform-origin: 0 50%; overflow: hidden;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55); }
	.shine { top: -20px; left: 0; width: 160px; height: 200px; rotate: 18deg;
		background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0) 100%); }
	.slab-text { left: 0; top: 0; width: 960px; height: 140px; display: flex; align-items: center; justify-content: center;
		font: 116px/1 Anton, sans-serif; text-transform: uppercase; color: #0a0a0b; white-space: nowrap; }

	.breakdown { left: 60px; top: 1146px; width: 960px; height: 190px; }
	.rule { left: 0; top: 0; width: 960px; height: 2px; background: rgba(255, 225, 0, 0.55); transform-origin: 0 50%; }
	.cell { top: 22px; width: 192px; text-align: center; }
	.cell .n { position: relative; font: 100px/1 Anton, sans-serif; color: #ffe100; }
	.cell .l { position: relative; margin-top: 10px; font: 800 23px/1.15 Inter, sans-serif; color: #f5f5f2;
		text-transform: uppercase; letter-spacing: 0.06em; padding: 0 10px; }
	.plus { top: 48px; width: 28px; text-align: center; font: 300 44px/1 Inter, sans-serif; color: rgba(255, 255, 255, 0.4); }

	.kick { top: 40px; font: 700 24px/1 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.14em;
		color: rgba(245, 245, 242, 0.6); white-space: nowrap; }
	.k-left { left: 60px; color: #ffe100; display: flex; align-items: center; gap: 12px; }
	.k-left .dot { position: relative; width: 14px; height: 14px; background: #ffe100; }
	.grain { opacity: 0.06; mix-blend-mode: overlay; pointer-events: none; }
</style>
