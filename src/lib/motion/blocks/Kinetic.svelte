<!--
	Built-in block "@visualfries/kinetic": kinetic typography from spoken words. Phrase by phrase,
	each word flips in on its own syllable, the phrase plane swings in 3D, punch phrases get
	extruded letters, and a phrase can slam, explode into letters or fall off the frame.
	Bind the words: "words": { "kinetic": "clip" } (or { from, until }). Props:

	  phrases  [{ w: [first, last], x, y, size?, width?, color?, extrude?, side?, fx? }]
	           w: word indexes (inclusive) counted from the word that starts with `first`
	           x, y: 0–1 of the clip (centre of the phrase box, top edge)
	           fx: "flip" (default) | "slam" | "explode" | "drop" | "frames" (a frame counter under it)
	           side: 1 | -1, which way the plane swings in
	  first    text of the first word to count from (default: the first bound word)
	  boom     seconds after the "explode" phrase starts when its letters fly (default 0.6)
	  dropAt   moment the "drop" phrase falls (default "end-0.35")
	  words    selection name (default "kinetic"), font (default "Anton, Impact, sans-serif")
	  colors   { w, g, o } overrides for "w" (default), "g", "o" phrase colours

	For words BEHIND the speaker over the original video, render the clip with "alpha": true and
	"holdout": "<footage with matte>".
-->
<script lang="ts">
	import { noise, useClip, type At } from '../runtime.svelte.js';
	import { extrude, phraseWords } from '../recipes.js';

	type Phrase = {
		w: [number, number];
		x: number;
		y: number;
		size?: number;
		width?: number;
		color?: 'w' | 'g' | 'o';
		extrude?: boolean;
		side?: number;
		fx?: 'flip' | 'slam' | 'explode' | 'drop' | 'frames';
	};
	const clip = useClip();
	const P = clip.props as Record<string, any>;
	const W = clip.width;
	const H = clip.height;
	const phrases: Phrase[] = P.phrases ?? [];
	const colors = { w: '#eef2ff', g: '#c6f432', o: '#ff5c7a', ...(P.colors ?? {}) };
	const font = P.font ?? 'Anton, Impact, sans-serif';
	const words = clip.words[P.words ?? 'kinetic'] ?? [];
	const groups = phraseWords(words, phrases.map((p) => p.w), P.first);
	const starts = groups.map((g) => (g.length ? g[0].localStart : Infinity));
	const dropAt: At = P.dropAt ?? 'end-0.35';
	const clean = (t: string) => t.replace(/[,.!?;:]+$/, '');
</script>

<div class="kin" style="font-family:{font}">
	{#each phrases as ph, pi}
		{@const t0 = starts[pi]}
		{@const next = starts[pi + 1] ?? Infinity}
		{@const ein = clip.p(t0 - 0.06, 0.45, 'expo.out')}
		{@const eout = ph.fx === 'drop' ? 0 : clip.p(next - 0.08, 0.22, 'power2.in')}
		{@const col = colors[ph.color ?? 'w']}
		{#if clip.t > t0 - 0.1 && eout < 1}
			<div
				class="ph"
				style="left:{ph.x * W}px;top:{ph.y * H}px;width:{ph.width ?? 760}px;font-size:{ph.size ?? 140}px;color:{col};{ph.extrude ? `text-shadow:${extrude(col)};` : ''}opacity:{1 - eout};transform:translate(-50%,0) perspective(1100px) rotateY({(ph.side ?? 1) * (26 * (1 - ein) + 7)}deg) rotateX({70 * eout}deg) translateY({-60 * eout}px){ph.fx === 'slam' ? ` scale(${2.3 - 1.3 * clip.p(t0, 0.3, 'expo.out')})` : ''};{ph.fx === 'slam' ? `translate:${(noise(clip.frame, 9) - 0.5) * 26 * clip.out(t0 + 0.06, 0.4)}px 0` : ''}"
			>
				{#each groups[pi] as w, wi}
					{@const e = clip.p(w.localStart - 0.05, 0.34, 'back.out(1.7)')}
					{@const lt = clip.t - (t0 + (P.boom ?? 0.6))}
					{@const dt = ph.fx === 'drop' ? clip.t - (clip.at(dropAt) + wi * 0.05) : -1}
					<span
						class="kw"
						style="opacity:{Math.min(1, e * 1.6)};transform:rotateX({-100 * (1 - e)}deg) translateZ({-200 * (1 - e)}px){dt > 0 ? ` translateY(${900 * dt * dt + 120 * dt}px) rotate(${(noise(wi, 4) - 0.5) * 140 * dt}deg)` : ''}"
					>
						{#if ph.fx === 'explode' && lt > 0}
							{#each clean(w.text).split('') as ch, ci}
								{@const a = noise(pi * 31 + wi * 7 + ci, 2) * Math.PI * 2}
								{@const v = 700 + noise(ci, wi + 3) * 900}
								<span class="kch" style="transform:translate({Math.cos(a) * v * lt}px,{Math.sin(a) * v * lt + 900 * lt * lt}px) rotate({(noise(ci, 8) - 0.5) * 720 * lt}deg) scale({1 + 0.6 * lt});opacity:{Math.max(0, 1 - lt * 1.4)}">{ch}</span>
							{/each}
						{:else}{clean(w.text)}{/if}
					</span>{' '}
				{/each}
				{#if ph.fx === 'frames'}
					<div class="fc" style="color:{colors.g}">f{String(clip.frame).padStart(5, '0')}</div>
				{/if}
			</div>
		{/if}
		{#if ph.fx === 'explode'}
			{@const bt = clip.t - (t0 + (P.boom ?? 0.6))}
			{#if bt > 0 && bt < 0.5}
				<div class="flash" style="background:radial-gradient(40% 40% at {ph.x * 100}% {ph.y * 100 + 8}%, rgba(255,240,200,{0.8 * (1 - bt * 2)}), rgba(255,92,122,{0.35 * (1 - bt * 2)}) 50%, rgba(0,0,0,0) 75%)"></div>
			{/if}
		{/if}
	{/each}
</div>

<style>
	.kin { position: absolute; inset: 0; overflow: hidden; }
	.ph { position: absolute; display: flex; flex-wrap: wrap; justify-content: center; column-gap: 0.22em; line-height: 0.95; text-transform: uppercase; text-align: center; transform-style: preserve-3d; }
	.kw { display: inline-block; transform-origin: 50% 70%; backface-visibility: hidden; }
	.kch { display: inline-block; }
	.fc { width: 100%; margin-top: 18px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 40px; text-shadow: none; letter-spacing: 0.04em; }
	.flash { position: absolute; inset: 0; }
</style>
