<!--
	Speaker depth: the talking head is cut out by its matte, so type, light and a grey copy of
	the speaker can sit between the room and the speaker. Every beat is a cue on a spoken word
	(see speaker-depth.vf.json); change the phrases there to reuse the block on another video.

	Layers, back to front:
	  backdrop (gradient, light blobs, spotlight, tint, flash)
	  type     words that slam in behind the head
	  camera   room plate (fades out), grey ghost, the cut-out speaker with a rim glow
	  front    captions, vignette, grain
-->
<script>
	import { Footage, noise, useClip, useFrame, useTimeline } from 'visualfries/motion';

	const clip = useClip();

	// Footage is 1000×1080; it fills the width and stands on the bottom edge, which leaves room
	// above the head. A matte cut at the frame edge never shows a hard edge.
	const FOOT_W = 1080;
	const FOOT_H = Math.round((clip.footage.talk.height / clip.footage.talk.width) * FOOT_W);
	const FOOT_TOP = clip.height - FOOT_H;
	const FACE = { x: 570, y: FOOT_TOP + 400 };
	// Opening camera: the plate fills the frame, as in the original video.
	const OPEN_SCALE = clip.height / FOOT_H + 0.05;
	const open = { s: OPEN_SCALE, x: clip.width / 2 - FACE.x * OPEN_SCALE, y: -FOOT_TOP * OPEN_SCALE };
	const punch = (s) => ({ s, x: FACE.x - FACE.x * s, y: FACE.y - FACE.y * s });

	// Everything the timeline animates that is not an element: applied in useFrame.
	const st = {
		camS: open.s, camX: open.x, camY: open.y, shake: 0,
		plate: 1, plateBlur: 0, plateDim: 0,
		glow: 0, cold: 0, spot: 0.5, flash: 0, tint: 0,
		ghost: 0, ghostX: -120, ghostBlur: 0, chipAi: 0, chipNo: 0,
		typeS: 1
	};

	let camera, typeLayer, plateBox, ghostBox, subjectBox, spot, tint, flash, chipAi, chipNo, grain;

	useTimeline(({ tl, at, q }) => {
		const word = (id) => q(`[data-word="${id}"]`);
		const slam = (id, cue, from = 1.6) =>
			tl.fromTo(word(id), { opacity: 0, scale: from, filter: 'blur(26px)' },
				{ opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.42, ease: 'expo.out' }, at(cue));
		const hit = (cue, strength = 1) => {
			tl.fromTo(st, { flash: 0.6 * strength }, { flash: 0, duration: 0.55, ease: 'power2.out', immediateRender: false }, at(cue));
			tl.fromTo(st, { shake: strength }, { shake: 0, duration: 0.35, immediateRender: false }, at(cue));
		};

		// Ambient light drifts the whole clip.
		tl.fromTo(q('.b1'), { x: -200, y: 200 }, { x: 420, y: 520, duration: clip.duration, ease: 'none' }, 0);
		tl.fromTo(q('.b2'), { x: 600, y: 1300 }, { x: 80, y: 900, duration: clip.duration, ease: 'none' }, 0);
		tl.fromTo(q('.b3'), { x: 300, y: -300 }, { x: -100, y: 200, duration: clip.duration, ease: 'none' }, 0);

		// The room falls away and the speaker steps into the studio.
		tl.to(st, { camS: 1, camX: 0, camY: 0, duration: 1.15, ease: 'expo.inOut' }, at('fall+0.4'));
		tl.to(st, { plateBlur: 22, plateDim: 0.6, duration: 0.55, ease: 'power2.in' }, at('fall+0.4'));
		tl.to(st, { plate: 0, duration: 0.5, ease: 'power1.inOut' }, at('fall+0.58'));
		tl.to(st, { glow: 0.55, spot: 1, duration: 0.8, ease: 'power2.out' }, at('fall+0.9'));

		// VIDEO / EDITOR slide in from both sides, behind the head.
		tl.fromTo(word('video'), { opacity: 0, x: -700, filter: 'blur(30px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.5, ease: 'expo.out' }, at('video'));
		tl.fromTo(word('editor'), { opacity: 0, x: 700, filter: 'blur(30px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.5, ease: 'expo.out' }, at('editor'));
		tl.to(word('video').concat(word('editor')), { opacity: 0, scale: 0.7, filter: 'blur(20px)', duration: 0.35, ease: 'power2.in' }, at('ai-0.18'));

		// AI.
		slam('ai', 'ai');
		hit('ai', 0.9);
		tl.to(st, { glow: 1, duration: 0.3 }, at('ai'));
		tl.to(word('ai'), { scale: 1.06, duration: 1.2, ease: 'none' }, at('ai+0.42'));
		tl.to(word('ai'), { opacity: 0, y: -200, filter: 'blur(26px)', duration: 0.4, ease: 'power2.in' }, at('other-0.1'));

		// The other editor: a grey, delayed copy of the speaker, without AI.
		tl.to(st, { ghost: 0.75, ghostX: -330, duration: 0.6, ease: 'expo.out' }, at('other+0.4'));
		tl.to(st, { chipAi: 1, duration: 0.35, ease: 'back.out(2)' }, at('other+0.8'));
		tl.to(st, { chipNo: 1, ghost: 0.45, duration: 0.4, ease: 'back.out(2)' }, at('without'));

		// It blows away; OBROVSKÝ NAVRCH.
		tl.to(st, { ghost: 0, ghostX: -900, ghostBlur: 30, chipNo: 0, duration: 0.7, ease: 'power3.in' }, at('so'));
		tl.to(st, { chipAi: 0, duration: 0.3 }, at('so+0.5'));
		tl.to(st, { camS: 1.06, camX: punch(1.06).x, camY: punch(1.06).y, duration: 1.7, ease: 'sine.inOut' }, at('so+0.6'));
		slam('huge', 'huge', 1.8);
		slam('lead', 'lead', 1.8);
		hit('huge', 1.3);
		hit('lead', 0.9);
		tl.to(st, { camS: 1.14, camX: punch(1.14).x, camY: punch(1.14).y, duration: 0.5, ease: 'expo.out' }, at('huge'));
		tl.to(st, { typeS: 1.05, duration: 1, ease: 'none' }, at('huge+0.4'));

		// Mood drops to blue; ĎALEKO recedes into the distance.
		tl.to(word('huge').concat(word('lead')), { opacity: 0, filter: 'blur(30px)', scale: 1.3, duration: 0.45, ease: 'power2.in' }, at('but-0.06'));
		tl.to(st, { camS: 1, camX: 0, camY: 0, typeS: 1, duration: 1.4, ease: 'expo.inOut' }, at('but'));
		tl.to(st, { tint: 0.85, cold: 1, spot: 0.45, duration: 0.9, ease: 'power2.inOut' }, at('but'));
		[0, 1, 2].forEach((k) => {
			tl.fromTo(word(`far${k}`), { opacity: 0, scale: 1.25, y: 40 }, { opacity: 0.9 - k * 0.25, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' }, at('far') - 0.06 + k * 0.12);
			tl.to(word(`far${k}`), { scale: 0.34 - k * 0.05, y: -250 - k * 38, opacity: 0.35 - k * 0.1, filter: `blur(${2 + k * 2}px)`, duration: 1.4, ease: 'power2.out' }, at('far') + 0.27 + k * 0.12);
		});
		tl.to([0, 1, 2].flatMap((k) => word(`far${k}`)), { opacity: 0, duration: 0.4 }, at('far+1.62'));

		// AI returns as an outline; NAHRADIŤ gets struck out.
		tl.fromTo(word('ai2'), { opacity: 0, scale: 0.85 }, { opacity: 0.55, scale: 1, duration: 0.5, ease: 'expo.out' }, at('ai2'));
		tl.to(word('ai2'), { scale: 1.08, duration: 2.3, ease: 'none' }, at('ai2+0.4'));
		tl.to(word('ai2'), { opacity: 0, duration: 0.3 }, at('replace-0.26'));
		tl.to(st, { tint: 0.35, cold: 0, duration: 0.8 }, at('fully-0.24'));
		tl.fromTo(word('replace'), { opacity: 0, y: 60, filter: 'blur(20px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.35, ease: 'expo.out' }, at('replace-0.06'));
		tl.fromTo(q('.strike'), { scaleX: 0 }, { scaleX: 1, duration: 0.28, ease: 'power3.out' }, at('replace+0.26'));
		tl.fromTo(st, { shake: 0.8 }, { shake: 0, duration: 0.3, immediateRender: false }, at('replace+0.26'));
	});

	useFrame(({ frame }) => {
		const sx = (noise(frame, 1) - 0.5) * 28 * st.shake;
		const sy = (noise(frame, 2) - 0.5) * 28 * st.shake;
		camera.style.transform = `translate(${st.camX + sx}px, ${st.camY + sy}px) scale(${st.camS})`;
		typeLayer.style.transform = `translate(${sx * 0.4}px, ${sy * 0.4}px) scale(${st.typeS})`;
		plateBox.style.opacity = st.plate;
		plateBox.style.filter = `blur(${st.plateBlur}px) brightness(${1 - st.plateDim}) saturate(${1 - st.plateDim * 0.8})`;
		const rgb = st.cold > 0.5 ? '90,150,255' : '251,196,45';
		subjectBox.style.filter = st.glow > 0.01
			? `drop-shadow(0 0 ${6 + 10 * st.glow}px rgba(${rgb},${0.55 * st.glow})) drop-shadow(0 0 ${40 + 40 * st.glow}px rgba(${rgb},${0.35 * st.glow}))`
			: 'none';
		ghostBox.style.opacity = st.ghost;
		ghostBox.style.transform = `translateX(${st.ghostX}px) scale(0.84)`;
		ghostBox.style.filter = `grayscale(1) brightness(0.55) contrast(1.1) blur(${st.ghostBlur}px)`;
		spot.style.opacity = st.spot;
		tint.style.opacity = st.tint;
		flash.style.opacity = st.flash;
		for (const [el, v] of [[chipAi, st.chipAi], [chipNo, st.chipNo]]) {
			el.style.opacity = Math.min(1, v);
			el.style.transform = `scale(${0.6 + 0.4 * v})`;
		}
		drawGrain(frame);
	});

	// Film grain: a new pattern per frame, the same pattern for the same frame.
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

	// Captions: up to 3 words, a break after punctuation; the spoken word turns yellow.
	const chunks = (() => {
		const out = [];
		let cur = [];
		for (const w of clip.words.captions) {
			cur.push(w);
			const text = cur.map((x) => x.text).join(' ');
			if (/[.,?!]$/.test(w.raw) || cur.length >= 3 || text.length >= 18) {
				out.push(cur);
				cur = [];
			}
		}
		if (cur.length) out.push(cur);
		return out.map((words, i) => ({
			words,
			start: words[0].localStart,
			end: Math.min(out[i + 1]?.[0].localStart ?? clip.duration, words.at(-1).localEnd + 0.6)
		}));
	})();
	const chunk = $derived(chunks.find((c) => clip.t >= c.start && clip.t < c.end));
	const pop = $derived(chunk ? Math.min(1, (clip.t - chunk.start) / 0.12) : 0);
</script>

<div class="backdrop">
	<div class="blob b1"></div>
	<div class="blob b2"></div>
	<div class="blob b3"></div>
	<div class="spot" bind:this={spot} style:left="{FACE.x}px" style:top="{FACE.y - 154}px"></div>
</div>
<div class="tint" bind:this={tint}></div>
<div class="flash" bind:this={flash}></div>

<div class="type" bind:this={typeLayer} style:transform-origin="{FACE.x}px 1000px">
	<div class="word" data-word="video" style="top:390px;font-size:330px">VIDEO</div>
	<div class="word" data-word="editor" style="top:680px;font-size:330px">EDITOR</div>
	<div class="word gold" data-word="ai" style="top:270px;font-size:980px">AI</div>
	<div class="word gold" data-word="huge" style="top:480px;font-size:262px">OBROVSKÝ</div>
	<div class="word gold" data-word="lead" style="top:760px;font-size:340px">NAVRCH</div>
	{#each [0, 1, 2] as k}
		<div class="word outline" data-word="far{k}" style="top:520px;font-size:300px">ĎALEKO</div>
	{/each}
	<div class="word outline gold-line" data-word="ai2" style="top:270px;font-size:980px">AI</div>
	<div class="word" data-word="replace" style="top:700px;font-size:280px">NAHRADIŤ</div>
	<div class="strike"></div>
</div>

<div class="camera" bind:this={camera}>
	<div class="foot" bind:this={plateBox} style:top="{FOOT_TOP}px" style:height="{FOOT_H}px">
		<Footage name="talk" layer="plate" class="fill" />
	</div>
	<div class="foot ghost" bind:this={ghostBox} style:top="{FOOT_TOP}px" style:height="{FOOT_H}px">
		<Footage name="talk" layer="subject" offset={-0.4} class="fill" />
	</div>
	<div class="foot" bind:this={subjectBox} style:top="{FOOT_TOP}px" style:height="{FOOT_H}px">
		<Footage name="talk" layer="subject" class="fill" />
	</div>
	<div class="chip ai" bind:this={chipAi}>s AI</div>
	<div class="chip no" bind:this={chipNo}>bez AI</div>
</div>

<div class="vignette"></div>
{#if chunk}
	<div class="captions" style:opacity={pop} style:transform="translateY({(1 - pop) * 24}px) scale({0.92 + 0.08 * pop})">
		{#each chunk.words as w}
			<span
				style:color={clip.speaking(w) ? '#fbc42d' : clip.spoken(w) ? '#ffffff' : 'rgba(255,255,255,0.55)'}
				style:transform="scale({clip.speaking(w) ? 1.05 : 1})">{w.text}</span
			>
		{/each}
	</div>
{/if}
<canvas class="grain" bind:this={grain} width="540" height="960"></canvas>

<style>
	div, canvas { position: absolute; }
	.backdrop, .tint, .flash, .type, .camera, .vignette, .grain { left: 0; top: 0; width: 1080px; height: 1920px; }
	.backdrop { background: radial-gradient(120% 70% at 52% 48%, #262a37 0%, #12141b 55%, #08090c 100%); overflow: hidden; }
	.blob { border-radius: 50%; filter: blur(120px); mix-blend-mode: screen; }
	.b1 { width: 900px; height: 900px; background: #fbc42d; opacity: 0.16; }
	.b2 { width: 800px; height: 800px; background: #f43f5e; opacity: 0.12; }
	.b3 { width: 1000px; height: 1000px; background: #377cfb; opacity: 0.14; }
	.spot { width: 1500px; height: 1500px; margin: -750px 0 0 -750px; border-radius: 50%;
		background: radial-gradient(circle, rgba(255,244,214,0.55) 0%, rgba(255,214,120,0.18) 35%, rgba(0,0,0,0) 70%); }
	.tint { background: linear-gradient(180deg, #0b2a6b 0%, #071232 100%); mix-blend-mode: color; opacity: 0; }
	.flash { background: #fbc42d; mix-blend-mode: screen; opacity: 0; }
	.word { left: 0; width: 1080px; text-align: center; font-family: Anton, sans-serif; line-height: 0.86;
		white-space: nowrap; color: #f4f4f6; opacity: 0; }
	.gold { color: #fbc42d; }
	.outline { color: transparent; -webkit-text-stroke: 5px rgba(255, 255, 255, 0.9); }
	.gold-line { -webkit-text-stroke: 8px rgba(251, 196, 45, 0.85); }
	.strike { left: 40px; top: 815px; width: 1000px; height: 34px; background: #f43f5e; transform-origin: 0 50%;
		rotate: -4deg; scale: 0 1; box-shadow: 0 0 40px rgba(244, 63, 94, 0.7); }
	.camera { transform-origin: 0 0; }
	.foot { left: 0; width: 1080px; }
	.foot :global(.fill) { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
	.foot:first-child { -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 90px); }
	.ghost { opacity: 0; transform-origin: 540px 100%; }
	.chip { padding: 16px 32px; font: 900 56px/1 Inter, sans-serif; letter-spacing: 0.02em; border-radius: 999px; opacity: 0; }
	.chip.ai { left: 760px; top: 930px; background: #fbc42d; color: #131616; box-shadow: 0 10px 40px rgba(251, 196, 45, 0.45); }
	.chip.no { left: 110px; top: 870px; background: rgba(255, 255, 255, 0.12); color: #c9ced8; border: 2px solid rgba(255, 255, 255, 0.25); }
	.vignette { background: radial-gradient(110% 80% at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.65) 100%); }
	.captions { left: 60px; width: 960px; top: 1560px; text-align: center; font: 900 76px/1.05 Inter, sans-serif; color: #fff;
		text-shadow: 0 6px 28px rgba(0,0,0,0.75), 0 2px 4px rgba(0,0,0,0.6); letter-spacing: -0.01em; }
	.captions span { display: inline-block; margin: 0 16px; }
	.grain { opacity: 0.07; mix-blend-mode: overlay; }
</style>
