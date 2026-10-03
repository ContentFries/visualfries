<!--
	Word-timed captions with presets. Words come from a clip's `words` selection
	(e.g. `clip.words.captions`); the spoken word is highlighted as it is said.

	Presets:
	  bold     heavy uppercase with an outline; the spoken word jumps and takes the accent
	  karaoke  sentence case; a fill sweeps through each word as it is said
	  pill     the spoken word sits on an accent pill
	  punch    one word at a time, huge, slammed in
	  neon     glowing type; spoken words light up

	Place it anywhere in a block: it covers the clip and centres the lines at `y` (0–1).
-->
<script lang="ts" module>
	export type CaptionPreset = 'bold' | 'karaoke' | 'pill' | 'punch' | 'neon';
</script>

<script lang="ts">
	import { useClip } from './runtime.svelte.js';
	import type { MotionWordRef } from './resolve.js';

	let {
		words,
		preset = 'bold',
		y = 0.75,
		width = 0.86,
		size,
		font = 'Inter, system-ui, sans-serif',
		weight,
		color = '#ffffff',
		accent = '#fbc42d',
		maxWords,
		maxChars,
		emphasis = [],
		uppercase,
		hold = 0.5
	}: {
		/** The words to caption, e.g. `clip.words.captions`. */
		words: MotionWordRef[];
		preset?: CaptionPreset;
		/** Vertical centre of the lines, as a fraction of the clip height. */
		y?: number;
		/** Line width, as a fraction of the clip width. */
		width?: number;
		/** Font size in px; defaults to a size that suits the preset and the clip width. */
		size?: number;
		font?: string;
		weight?: number;
		color?: string;
		accent?: string;
		/** Words per caption (default 3; punch shows one). */
		maxWords?: number;
		/** Characters per caption before it breaks (default 18). */
		maxChars?: number;
		/** Words that always take the accent and grow, e.g. ["free", "never"]. */
		emphasis?: string[];
		uppercase?: boolean;
		/** Seconds a caption stays after its last word when nobody speaks. */
		hold?: number;
	} = $props();

	const clip = useClip();

	const per = maxWords ?? (preset === 'punch' ? 1 : 3);
	const chars = maxChars ?? 18;
	const upper = uppercase ?? (preset === 'bold' || preset === 'punch' || preset === 'pill');
	const px =
		size ??
		Math.round(
			clip.width * { bold: 0.088, karaoke: 0.072, pill: 0.078, punch: 0.16, neon: 0.08 }[preset]
		);
	const fontWeight = weight ?? (preset === 'karaoke' ? 800 : 900);
	const strong = new Set(emphasis.map(norm));

	function norm(text: string) {
		return text.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
	}

	// Captions break after punctuation, a pause, or `per` words / `chars` characters.
	type Chunk = { words: MotionWordRef[]; start: number; end: number };
	const chunks: Chunk[] = (() => {
		const out: MotionWordRef[][] = [];
		let cur: MotionWordRef[] = [];
		words.forEach((w, i) => {
			cur.push(w);
			const next = words[i + 1];
			const text = cur.map((x) => x.text).join(' ');
			const pause = next ? next.localStart - w.localEnd > 0.45 : true;
			if (/[.,?!;:]$/.test(w.raw ?? w.text) || pause || cur.length >= per || text.length >= chars) {
				out.push(cur);
				cur = [];
			}
		});
		if (cur.length) out.push(cur);
		return out.map((ws, i) => ({
			words: ws,
			start: ws[0].localStart,
			end: Math.min(out[i + 1]?.[0].localStart ?? clip.duration, ws.at(-1)!.localEnd + hold)
		}));
	})();

	const chunk = $derived(chunks.find((c) => clip.t >= c.start && clip.t < c.end));
	const age = $derived(chunk ? clip.t - chunk.start : 0);
	const pop = $derived(Math.min(1, age / 0.14));

	function easeOutBack(x: number) {
		const c = 1.9;
		return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
	}

	/** 0 before the word, 0→1 while it is said, 1 after. */
	function progress(w: MotionWordRef) {
		const d = Math.max(0.08, w.localEnd - w.localStart);
		return Math.min(1, Math.max(0, (clip.t - w.localStart) / d));
	}

	function wordStyle(w: MotionWordRef): string {
		const p = progress(w);
		const on = clip.t >= w.localStart && clip.t < w.localEnd + 0.04;
		const said = clip.t >= w.localStart;
		const em = strong.has(norm(w.text));
		const hit = Math.min(1, Math.max(0, (clip.t - w.localStart) / 0.16));
		switch (preset) {
			case 'bold': {
				const s = on ? 1 + 0.14 * easeOutBack(hit) - 0.06 * hit : 1;
				return `color:${on || em ? accent : color};transform:scale(${(em ? 1.12 : 1) * s}) rotate(${on ? -2 * (1 - hit) : 0}deg)`;
			}
			case 'karaoke': {
				const fill = em ? accent : color;
				return `background-image:linear-gradient(90deg, ${fill} ${p * 100}%, ${dim(color, 0.38)} ${p * 100}%);-webkit-background-clip:text;background-clip:text;color:transparent;transform:translateY(${said ? 0 : 6}px)`;
			}
			case 'pill': {
				const k = on ? easeOutBack(hit) : 0;
				return `--k:${k};color:${on ? '#111' : em ? accent : color}`;
			}
			case 'punch': {
				const k = easeOutBack(hit);
				const rot = (((w.localStart * 7.3) % 1) - 0.5) * 6;
				return `color:${em ? accent : color};transform:scale(${1.5 - 0.5 * k}) rotate(${rot * (1 - hit * 0.6)}deg);filter:blur(${(1 - hit) * 10}px);opacity:${hit}`;
			}
			case 'neon': {
				const glow = on ? 1 : said ? 0.55 : 0.18;
				const c = on || em ? accent : color;
				return `color:${dim(c, 0.35 + 0.65 * glow)};text-shadow:0 0 ${8 + 30 * glow}px ${dim(c, glow)}, 0 0 ${60 * glow}px ${dim(accent, 0.6 * glow)}`;
			}
		}
	}

	function dim(hex: string, a: number) {
		const m = /^#?([0-9a-f]{6})$/i.exec(hex);
		if (!m) return hex;
		const n = parseInt(m[1], 16);
		return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`;
	}
</script>

{#if chunk}
	<div
		class="vf-captions vf-captions--{preset}"
		style:top="{y * 100}%"
		style:left="{((1 - width) / 2) * 100}%"
		style:width="{width * 100}%"
		style:font-family={font}
		style:font-weight={fontWeight}
		style:font-size="{px}px"
		style:text-transform={upper ? 'uppercase' : 'none'}
		style:--accent={accent}
		style:opacity={preset === 'punch' ? 1 : pop}
		style:transform="translateY(-50%) translateY({preset === 'punch' ? 0 : (1 - pop) * 0.3 * px}px)
		scale({preset === 'punch' ? 1 : 0.9 + 0.1 * pop})"
	>
		{#each chunk.words as w (w.localStart)}
			<span class="w" style={wordStyle(w)}>{w.text}</span>
		{/each}
	</div>
{/if}

<style>
	.vf-captions {
		position: absolute;
		z-index: 10;
		text-align: center;
		line-height: 1.08;
		letter-spacing: -0.01em;
		pointer-events: none;
	}
	.w {
		display: inline-block;
		margin: 0 0.2em;
		transform-origin: 50% 60%;
	}
	.vf-captions--bold .w {
		-webkit-text-stroke: 0.09em #000;
		paint-order: stroke fill;
		text-shadow: 0 0.08em 0.25em rgba(0, 0, 0, 0.55);
	}
	.vf-captions--karaoke .w {
		filter: drop-shadow(0 0.06em 0.2em rgba(0, 0, 0, 0.6));
	}
	.vf-captions--pill .w {
		position: relative;
		isolation: isolate;
		padding: 0.06em 0.2em 0.1em;
		text-shadow: 0 0.06em 0.22em rgba(0, 0, 0, 0.5);
	}
	.vf-captions--pill .w::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		border-radius: 0.24em;
		background: var(--accent);
		transform: scale(var(--k)) rotate(calc((1 - var(--k)) * -6deg));
		box-shadow: 0 0.12em 0.4em rgba(0, 0, 0, 0.35);
	}
	.vf-captions--punch {
		line-height: 0.95;
	}
	.vf-captions--punch .w {
		-webkit-text-stroke: 0.05em #000;
		paint-order: stroke fill;
		text-shadow: 0 0.06em 0.3em rgba(0, 0, 0, 0.6);
	}
</style>
