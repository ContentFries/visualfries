<!--
	Built-in block "@visualfries/speaker-depth": a talking head cut out by its matte, with words
	that slam in behind the head, light, an optional grey echo of the speaker and captions in
	front. Everything comes from the clip's props, so an agent only writes JSON:

	  footage   footage with a matte (default: the project's only footage)
	  words     [{ text, at, until?, style?, enter?, size?, y?, hit? }]
	            style: "solid" | "accent" | "outline" | "echo" (three receding copies) | "strike"
	            enter: "slam" | "left" | "right" | "rise"
	            size:  font size in px, used as written; default: sized to the word and shrunk until
	                   it fits the frame width in the block's font
	            y:     vertical centre, 0–1 of the clip height; default: just under the top of the
	                   head, measured from the matte, so the head covers the middle of the word
	            hit:   flash, shake and a camera punch on the face
	  intro     moment the room falls away into the studio (default "start"; false keeps the room)
	  ghost     { at, until, label?, labelOwn? }: a grey, delayed copy of the speaker beside them
	  cold      { at, until }: the mood turns blue
	  captions  <Captions> props plus `words` (selection name, default "captions"); false for none
	  accent, alt, cool, font, background

	Colours and fonts come from the project's brand: accent, primary (for `alt`), text, muted,
	surface, background, heading font (words) and body font (chips). `cool` is the mood colour of
	`cold` and stays blue unless set. `background` (behind the studio) can be keyed in a program.
-->
<script module lang="ts">
	/** Props a program's keys may animate (see docs/MOTION.md, "Keys"). */
	export const animatable = { background: 'gradient' } as const;
</script>

<script lang="ts">
	import { noise, useClip, useFrame, useTimeline, type At } from '../runtime.svelte.js';
	import Footage from '../Footage.svelte';
	import Captions from '../Captions.svelte';
	import { parseColor, toHex } from '../brand.js';
	import { outline } from '../outline.js';
	import { OUTLINE_EM, wordSize, type MeasureText } from './speaker-depth-size.js';

	type Word = {
		text: string;
		at: At;
		until?: At;
		style?: 'solid' | 'accent' | 'outline' | 'echo' | 'strike';
		enter?: 'slam' | 'left' | 'right' | 'rise';
		size?: number;
		y?: number;
		hit?: boolean;
	};

	const clip = useClip();
	const props = clip.props as Record<string, any>;
	const name: string = props.footage ?? Object.keys(clip.footage)[0];
	const footage = clip.footage[name];
	if (!footage?.subject) {
		throw new Error(
			`speaker-depth needs footage with a matte; "${name ?? '(none)'}" has none. Add "matte" to the footage.`
		);
	}
	const brand = clip.brand;
	const accent: string = props.accent ?? toHex(brand.colors.accent);
	const alt: string = props.alt ?? toHex(brand.colors.primary);
	const cool: string = props.cool ?? '#5a96ff';
	const font: string = props.font ?? brand.fonts.heading;
	const W = clip.width;
	const H = clip.height;

	// The footage fills the width and stands on the bottom edge, leaving room above the head.
	const FOOT_H = Math.round((footage.height / footage.width) * W);
	const FOOT_TOP = H - FOOT_H;
	const toStage = (b: { headX: number; headY: number } | null) =>
		b
			? { x: b.headX * W, y: FOOT_TOP + b.headY * FOOT_H }
			: { x: W / 2, y: FOOT_TOP + FOOT_H * 0.2 };
	const head0 = toStage(clip.subject(name, 0, 0.5));
	const FACE = { x: head0.x, y: head0.y + FOOT_H * 0.14 };

	// Fonts are loaded before blocks mount, so the canvas measures the real face.
	const ctx = document.createElement('canvas').getContext('2d');
	const measure: MeasureText = ctx
		? (text, px) => {
				ctx.font = `${px}px ${font}`;
				return ctx.measureText(text).width;
			}
		: null;

	const sec = (a: At) => clip.at(a);
	const words: (Word & { start: number; end: number; px: number; top: number })[] = (
		(props.words ?? []) as Word[]
	).map((w, i, all) => {
		const start = sec(w.at);
		const next = all[i + 1];
		const until = w.until !== undefined ? sec(w.until) : next ? sec(next.at) - 0.05 : clip.duration;
		// A word stays at least long enough to land and be read.
		const end = Math.min(clip.duration, Math.max(until, start + 0.7));
		const text = String(w.text);
		const px = wordSize(text, {
			size: w.size,
			width: W,
			outlined: w.style === 'outline' || w.style === 'echo',
			measure
		});
		const head = toStage(clip.subject(name, Math.round(start * clip.fps), 0.3));
		const centre = w.y !== undefined ? w.y * H : head.y + px * 0.18;
		const top = Math.max(H * 0.03, Math.min(H * 0.62, centre - px * 0.43));
		return { ...w, text, start, end, px, top };
	});

	const intro: At | false = props.intro === undefined ? 'start' : props.intro;
	const OPEN_SCALE = H / FOOT_H + 0.05;
	const rest = { s: 1, x: 0, y: 0 };
	const open =
		intro === false
			? rest
			: { s: OPEN_SCALE, x: W / 2 - FACE.x * OPEN_SCALE, y: -FOOT_TOP * OPEN_SCALE };
	const punch = (s: number) => ({ camS: s, camX: FACE.x - FACE.x * s, camY: FACE.y - FACE.y * s });

	const st = {
		camS: open.s,
		camX: open.x,
		camY: open.y,
		shake: 0,
		plate: intro === false ? 1 : 1,
		plateBlur: 0,
		plateDim: 0,
		glow: intro === false ? 0.5 : 0,
		cold: 0,
		flash: 0,
		tint: 0,
		ghost: 0,
		ghostX: -120,
		ghostBlur: 0,
		chipOwn: 0,
		chipGhost: 0
	};

	let camera: HTMLDivElement, typeLayer: HTMLDivElement, plateBox: HTMLDivElement;
	let ghostBox: HTMLDivElement | undefined,
		subjectEl: HTMLDivElement,
		tint: HTMLDivElement,
		flash: HTMLDivElement;
	let chipOwn: HTMLDivElement | undefined,
		chipGhost: HTMLDivElement | undefined,
		grain: HTMLCanvasElement;

	useTimeline(({ tl, q }) => {
		const hit = (t: number, strength = 1) => {
			tl.fromTo(
				st,
				{ flash: 0.55 * strength },
				{ flash: 0, duration: 0.55, ease: 'power2.out', immediateRender: false },
				t
			);
			tl.fromTo(st, { shake: strength }, { shake: 0, duration: 0.35, immediateRender: false }, t);
		};

		if (intro !== false) {
			const t = sec(intro) + 0.3;
			tl.to(st, { camS: 1, camX: 0, camY: 0, duration: 1.15, ease: 'expo.inOut' }, t);
			tl.to(st, { plateBlur: 22, plateDim: 0.6, duration: 0.55, ease: 'power2.in' }, t);
			tl.to(st, { plate: 0, duration: 0.5, ease: 'power1.inOut' }, t + 0.18);
			tl.to(st, { glow: 0.6, duration: 0.8, ease: 'power2.out' }, t + 0.5);
		}

		words.forEach((w, i) => {
			const els = q(`[data-w="${i}"]`);
			const enter = w.enter ?? (w.style === 'echo' ? 'rise' : 'slam');
			if (w.style === 'echo') {
				els.forEach((el, k) => {
					tl.fromTo(
						el,
						{ opacity: 0, scale: 1.25, y: 40 },
						{ opacity: 0.9 - k * 0.25, scale: 1, y: 0, duration: 0.3, ease: 'power2.out' },
						w.start - 0.06 + k * 0.12
					);
					tl.to(
						el,
						{
							scale: 0.36 - k * 0.05,
							y: -w.px * 0.65 - k * 38,
							opacity: 0.35 - k * 0.1,
							filter: `blur(${2 + k * 2}px)`,
							duration: 1.4,
							ease: 'power2.out'
						},
						w.start + 0.27 + k * 0.12
					);
				});
			} else {
				const from =
					enter === 'left'
						? { opacity: 0, x: -W * 0.65, filter: 'blur(30px)' }
						: enter === 'right'
							? { opacity: 0, x: W * 0.65, filter: 'blur(30px)' }
							: enter === 'rise'
								? { opacity: 0, y: w.px * 0.4, filter: 'blur(20px)' }
								: { opacity: 0, scale: 1.7, filter: 'blur(26px)' };
				const opacity = w.style === 'outline' ? 0.7 : 1;
				tl.fromTo(
					els,
					from,
					{
						opacity,
						x: 0,
						y: 0,
						scale: 1,
						filter: 'blur(0px)',
						duration: enter === 'slam' ? 0.42 : 0.5,
						ease: 'expo.out'
					},
					w.start - 0.04
				);
				tl.to(
					els,
					{ scale: 1.05, duration: Math.max(0.1, w.end - w.start - 0.72), ease: 'none' },
					w.start + 0.42
				);
				if (w.style === 'strike') {
					tl.fromTo(
						q(`[data-strike="${i}"]`),
						{ scaleX: 0 },
						{ scaleX: 1, duration: 0.28, ease: 'power3.out' },
						w.start + 0.32
					);
					tl.fromTo(
						st,
						{ shake: 0.8 },
						{ shake: 0, duration: 0.3, immediateRender: false },
						w.start + 0.32
					);
				}
			}
			if (w.end < clip.duration - 0.05)
				tl.to(
					els,
					{ opacity: 0, scale: 1.25, filter: 'blur(28px)', duration: 0.38, ease: 'power2.in' },
					w.end - 0.3
				);
			if (w.hit) {
				hit(w.start, 1.1);
				tl.to(st, { ...punch(1.12), duration: 0.5, ease: 'expo.out' }, w.start);
				tl.to(st, { camS: 1, camX: 0, camY: 0, duration: 1.1, ease: 'expo.inOut' }, w.end - 0.2);
			}
		});

		if (props.ghost) {
			const g = props.ghost;
			const a = sec(g.at);
			const b = g.until !== undefined ? sec(g.until) : a + 2.5;
			tl.to(st, { ghost: 0.75, ghostX: -W * 0.31, duration: 0.6, ease: 'expo.out' }, a);
			if (chipOwn) tl.to(st, { chipOwn: 1, duration: 0.35, ease: 'back.out(2)' }, a + 0.4);
			if (chipGhost)
				tl.to(st, { chipGhost: 1, ghost: 0.45, duration: 0.4, ease: 'back.out(2)' }, a + 0.8);
			tl.to(
				st,
				{
					ghost: 0,
					ghostX: -W * 0.85,
					ghostBlur: 30,
					chipGhost: 0,
					duration: 0.7,
					ease: 'power3.in'
				},
				b - 0.7
			);
			tl.to(st, { chipOwn: 0, duration: 0.3 }, b);
		}

		if (props.cold) {
			const a = sec(props.cold.at);
			const b = props.cold.until !== undefined ? sec(props.cold.until) : clip.duration;
			tl.to(st, { tint: 0.85, cold: 1, duration: 0.9, ease: 'power2.inOut' }, a);
			tl.to(st, { tint: 0.3, cold: 0, duration: 0.8 }, b);
		}
	});

	const rgba = (color: string, a: number) => {
		const c = parseColor(color);
		return c
			? `rgba(${c[0]},${c[1]},${c[2]},${a})`
			: `color-mix(in srgb, ${color} ${a * 100}%, transparent)`;
	};

	// Brand-dependent colours of the stylesheet. The neutral brand keeps the block's original
	// values, some of which are tuned shades rather than brand roles.
	const ink = toHex(brand.colors.text);
	const surface = toHex(brand.colors.surface);
	const look = brand.neutral
		? {
				background: '#08090c',
				backdrop: 'radial-gradient(120% 70% at 52% 48%, #262a37 0%, #12141b 55%, #08090c 100%)',
				word: '#f4f4f6',
				outline: 'rgba(255, 255, 255, 0.92)',
				strikeGlow: 'rgba(244, 63, 94, 0.7)',
				ownInk: '#131616',
				otherFill: 'rgba(255, 255, 255, 0.12)',
				otherInk: '#c9ced8',
				otherBorder: 'rgba(255, 255, 255, 0.25)',
				chipFont: 'Inter, sans-serif'
			}
		: {
				background: brand.colors.background,
				backdrop: `radial-gradient(120% 70% at 52% 48%, color-mix(in srgb, ${surface} 88%, ${ink}) 0%, ${surface} 55%, ${toHex(brand.colors.background)} 100%)`,
				word: ink,
				outline: rgba(ink, 0.92),
				strikeGlow: rgba(alt, 0.7),
				ownInk: toHex(brand.colors.onAccent),
				otherFill: rgba(ink, 0.12),
				otherInk: toHex(brand.colors.muted),
				otherBorder: rgba(ink, 0.25),
				chipFont: brand.fonts.body
			};

	useFrame(({ frame }) => {
		const sx = (noise(frame, 1) - 0.5) * 28 * st.shake;
		const sy = (noise(frame, 2) - 0.5) * 28 * st.shake;
		camera.style.transform = `translate(${st.camX + sx}px, ${st.camY + sy}px) scale(${st.camS})`;
		typeLayer.style.transform = `translate(${sx * 0.4}px, ${sy * 0.4}px)`;
		plateBox.style.opacity = String(st.plate);
		plateBox.style.filter = `blur(${st.plateBlur}px) brightness(${1 - st.plateDim}) saturate(${1 - st.plateDim * 0.8})`;
		const light = st.cold > 0.5 ? cool : accent;
		subjectEl.style.filter =
			st.glow > 0.01
				? `drop-shadow(0 0 ${6 + 10 * st.glow}px ${rgba(light, 0.55 * st.glow)}) drop-shadow(0 0 ${40 + 40 * st.glow}px ${rgba(light, 0.35 * st.glow)})`
				: 'none';
		if (ghostBox) {
			ghostBox.style.opacity = String(st.ghost);
			ghostBox.style.transform = `translateX(${st.ghostX}px) scale(0.84)`;
			ghostBox.style.filter = `grayscale(1) brightness(0.55) contrast(1.1) blur(${st.ghostBlur}px)`;
		}
		tint.style.opacity = String(st.tint);
		flash.style.opacity = String(st.flash);
		for (const [el, v] of [
			[chipOwn, st.chipOwn],
			[chipGhost, st.chipGhost]
		] as const) {
			if (!el) continue;
			el.style.opacity = String(Math.min(1, v));
			el.style.transform = `scale(${0.6 + 0.4 * v})`;
		}
		drawGrain(frame);
	});

	// Film grain: a new pattern per frame, the same pattern for the same frame.
	function drawGrain(frame: number) {
		const ctx = grain.getContext('2d')!;
		const img = ctx.createImageData(grain.width, grain.height);
		let s = ((frame + 1) * 2654435761) >>> 0;
		for (let i = 0; i < img.data.length; i += 4) {
			s = (s * 1664525 + 1013904223) >>> 0;
			img.data[i] = img.data[i + 1] = img.data[i + 2] = (s / 4294967296) * 255;
			img.data[i + 3] = 255;
		}
		ctx.putImageData(img, 0, 0);
	}

	const captions =
		props.captions === false
			? null
			: { preset: 'bold', y: 0.82, accent, ...(props.captions ?? {}) };
	const captionWords = captions ? clip.words[captions.words ?? 'captions'] : null;
	const { words: _key, ...captionProps } = captions ?? {};
</script>

<div
	class="vf-sd"
	style:--accent={accent}
	style:--alt={alt}
	style:--sd-background={look.background}
	style:--sd-backdrop={look.backdrop}
	style:--sd-word={look.word}
	style:--sd-strike-glow={look.strikeGlow}
	style:--sd-own-ink={look.ownInk}
	style:--sd-other-fill={look.otherFill}
	style:--sd-other-ink={look.otherInk}
	style:--sd-other-border={look.otherBorder}
	style:--sd-chip-font={look.chipFont}
	style:font-family={font}
>
	<div class="layer backdrop" style:background={props.background}>
		<div class="blob" style:background={accent} style="left:-10%;top:10%;opacity:.16"></div>
		<div class="blob" style:background={alt} style="left:40%;top:62%;opacity:.12"></div>
		<div class="blob" style:background={cool} style="left:20%;top:-12%;opacity:.14"></div>
		<div class="spot" style:left="{FACE.x}px" style:top="{FACE.y - 150}px"></div>
	</div>
	<div
		class="layer tint"
		bind:this={tint}
		style:background="linear-gradient(180deg, {rgba(cool, 0.9)}, #071232)"
	></div>
	<div class="layer flash" bind:this={flash} style:background={accent}></div>

	<div class="layer" bind:this={typeLayer}>
		{#each words as w, i}
			{#each w.style === 'echo' ? [0, 1, 2] : [0] as k}
				<div
					class="word {w.style ?? 'solid'}"
					data-w={i}
					style:top="{w.top}px"
					style:font-size="{w.px}px"
					style:z-index={3 - k}
				>
					{#if w.style === 'outline' || w.style === 'echo'}
						<span class="ink" use:outline={{ width: `${OUTLINE_EM}em`, color: look.outline }}
							>{w.text}</span
						>
					{:else}
						{w.text}
					{/if}
				</div>
			{/each}
			{#if w.style === 'strike'}
				<div
					class="strike"
					data-strike={i}
					style:top="{w.top + w.px * 0.4}px"
					style:height="{Math.max(12, w.px * 0.11)}px"
					style:background={alt}
				></div>
			{/if}
		{/each}
	</div>

	<div class="layer camera" bind:this={camera}>
		<div class="foot plate" bind:this={plateBox} style:top="{FOOT_TOP}px" style:height="{FOOT_H}px">
			<Footage {name} layer="plate" class="vf-sd-fill" />
		</div>
		{#if props.ghost}
			<div
				class="foot ghost"
				bind:this={ghostBox}
				style:top="{FOOT_TOP}px"
				style:height="{FOOT_H}px"
			>
				<Footage {name} layer="subject" offset={-0.4} class="vf-sd-fill" />
			</div>
		{/if}
		<div class="foot" bind:this={subjectEl} style:top="{FOOT_TOP}px" style:height="{FOOT_H}px">
			<Footage {name} layer="subject" class="vf-sd-fill" />
		</div>
		{#if props.ghost?.labelOwn}
			<div
				class="chip own"
				bind:this={chipOwn}
				style:left="{W * 0.66}px"
				style:top="{FACE.y + 120}px"
			>
				{props.ghost.labelOwn}
			</div>
		{/if}
		{#if props.ghost?.label}
			<div
				class="chip other"
				bind:this={chipGhost}
				style:left="{W * 0.08}px"
				style:top="{FACE.y + 60}px"
			>
				{props.ghost.label}
			</div>
		{/if}
	</div>

	<div class="layer vignette"></div>
	{#if captions && captionWords}
		<Captions words={captionWords} {...captionProps} />
	{/if}
	<canvas class="layer grain" bind:this={grain} width={Math.round(W / 2)} height={Math.round(H / 2)}
	></canvas>
</div>

<style>
	.vf-sd {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: var(--sd-background);
	}
	.layer {
		position: absolute;
		inset: 0;
	}
	.backdrop {
		background: var(--sd-backdrop);
		overflow: hidden;
	}
	.blob {
		position: absolute;
		width: 85%;
		height: 48%;
		border-radius: 50%;
		filter: blur(120px);
		mix-blend-mode: screen;
	}
	.spot {
		position: absolute;
		width: 1500px;
		height: 1500px;
		margin: -750px 0 0 -750px;
		border-radius: 50%;
		background: radial-gradient(
			circle,
			rgba(255, 244, 214, 0.5) 0%,
			rgba(255, 214, 120, 0.16) 35%,
			rgba(0, 0, 0, 0) 70%
		);
	}
	.tint {
		mix-blend-mode: color;
		opacity: 0;
	}
	.flash {
		mix-blend-mode: screen;
		opacity: 0;
	}
	.word {
		position: absolute;
		left: 0;
		width: 100%;
		text-align: center;
		line-height: 0.86;
		white-space: nowrap;
		color: var(--sd-word);
		opacity: 0;
		text-transform: uppercase;
	}
	.word.accent {
		color: var(--accent);
	}
	/* Hollow words: the outline follows the letters' outer edge, never a font's inner contours. */
	.ink {
		display: inline-block;
	}
	.strike {
		position: absolute;
		left: 4%;
		width: 92%;
		transform-origin: 0 50%;
		rotate: -4deg;
		scale: 0 1;
		box-shadow: 0 0 40px var(--sd-strike-glow);
	}
	.camera {
		transform-origin: 0 0;
	}
	.foot {
		position: absolute;
		left: 0;
		width: 100%;
	}
	.foot :global(.vf-sd-fill) {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		height: 100%;
	}
	.plate {
		-webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 90px);
	}
	.ghost {
		opacity: 0;
		transform-origin: 50% 100%;
	}
	.chip {
		position: absolute;
		padding: 16px 32px;
		font: 900 52px/1 var(--sd-chip-font);
		letter-spacing: 0.02em;
		border-radius: 999px;
		opacity: 0;
		white-space: nowrap;
	}
	.chip.own {
		background: var(--accent);
		color: var(--sd-own-ink);
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
	}
	.chip.other {
		background: var(--sd-other-fill);
		color: var(--sd-other-ink);
		border: 2px solid var(--sd-other-border);
	}
	.vignette {
		background: radial-gradient(
			110% 80% at 50% 50%,
			rgba(0, 0, 0, 0) 55%,
			rgba(0, 0, 0, 0.65) 100%
		);
	}
	.grain {
		width: 100%;
		height: 100%;
		opacity: 0.07;
		mix-blend-mode: overlay;
	}
</style>
