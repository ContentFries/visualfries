<!--
	A huge word behind the speaker's head: a clip with "layer": "behind" and "slot": "word".
	props.items: [{ text, at, accent? }]: each word slams in on its cue and holds until the next.
	props.y: vertical centre inside the slot (0–1, default 0.36); lower it and the head covers
	more of the word. Words fit 94 % of the frame width and 40 % of its height, so accents and
	descenders keep their room in landscape too.
-->
<script>
	import { onMount } from 'svelte';
	import { useClip } from 'visualfries/motion';

	const clip = useClip();
	const items = clip.props.items ?? [];
	const y = clip.props.y ?? 0.36;
	let els = $state([]);
	let fit = $state(items.map(() => 1));

	onMount(() => {
		// Fonts are loaded before blocks mount, so the words can be measured here.
		fit = els.map((el) => {
			const w = el.scrollWidth || 1;
			const h = el.scrollHeight || 1;
			// Wide frames: keep the word (and its diacritics) inside the frame's height too.
			return Math.min(1, (clip.width * 0.94) / w, (clip.height * 0.4) / h);
		});
	});

	const start = (i) => clip.at(items[i].at);
	const end = (i) => (i + 1 < items.length ? start(i + 1) : clip.duration);

	function style(i) {
		const t = clip.t;
		const s = start(i);
		const e = end(i);
		if (t < s || t >= e + (i + 1 < items.length ? 0.08 : 0)) return 'opacity:0';
		const k = clip.p(s, 0.32, 'expo.out');
		const last = i + 1 >= items.length;
		const gone = last ? clip.out('end-0.22', 0.22, 'power2.in') : 1;
		const sc = (1.55 - 0.55 * k) * (0.92 + 0.08 * gone) * fit[i];
		const blur = (1 - k) * 18;
		return `opacity:${Math.min(1, k * 2.2) * gone};transform:translate(-50%,-50%) scale(${sc});filter:blur(${blur.toFixed(2)}px)`;
	}
</script>

<div class="slot">
	{#each items as item, i}
		<div
			class="word"
			class:accent={item.accent !== false}
			bind:this={els[i]}
			style="top:{y * 100}%;{style(i)}"
		>
			{item.text}
		</div>
	{/each}
</div>

<style>
	.slot {
		position: absolute;
		inset: 0;
		overflow: visible;
	}
	.word {
		position: absolute;
		left: 50%;
		white-space: nowrap;
		font-family: var(--brand-font-heading);
		font-size: 560px;
		line-height: 0.86;
		padding: 0.06em 0.04em 0.1em;
		letter-spacing: 0.005em;
		text-transform: uppercase;
		color: var(--brand-text);
		transform-origin: 50% 50%;
	}
	.word.accent {
		color: var(--brand-accent);
	}
</style>
