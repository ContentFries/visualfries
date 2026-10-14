<!--
	Built-in block "@visualfries/arrows": arrows that draw on at a cue and point from A to B, with
	an optional label that pops at the tail. Use over a screen recording, a screenshot or the
	speaker (alpha clip). Props:

	  arrows  [{ at, until?, from: [x, y], to: [x, y], bend?, color?, width?, label?, hand? }]
	          px in clip coordinates; bend: sideways curve (fraction of the length, ± = side);
	          hand: true for a slightly wobbly, hand-drawn line
	  rings   [{ at, until?, x, y, w, h, color? }]: a highlight ring that pops around a rect
	  dim     true: darken everything outside the rings (spotlight)
-->
<script lang="ts">
	import { noise, useClip, type At } from '../runtime.svelte.js';
	import { arrowPath } from '../recipes.js';

	type Arrow = { at: At; until?: At; from: [number, number]; to: [number, number]; bend?: number; color?: string; width?: number; label?: string; hand?: boolean };
	type Ring = { at: At; until?: At; x: number; y: number; w: number; h: number; color?: string };
	const clip = useClip();
	const P = clip.props as Record<string, any>;
	const arrows: Arrow[] = P.arrows ?? [];
	const rings: Ring[] = P.rings ?? [];
	const geo = arrows.map((a) => arrowPath(a.from, a.to, a.bend ?? 0.2));
	const fade = (until?: At) => (until === undefined ? 1 : clip.out(until, 0.25, 'power2.in'));
	const dimIn = () => (P.dim ? Math.max(0, ...rings.map((r) => clip.p(r.at, 0.35) * fade(r.until))) : 0);
</script>

<svg class="arr" viewBox="0 0 {clip.width} {clip.height}">
	{#if P.dim}
		<defs>
			<mask id="vf-arrows-spot">
				<rect width="100%" height="100%" fill="white" />
				{#each rings as r}<rect x={r.x - 10} y={r.y - 10} width={r.w + 20} height={r.h + 20} rx="18" fill="black" opacity={clip.p(r.at, 0.35) * fade(r.until)} />{/each}
			</mask>
		</defs>
		<rect width="100%" height="100%" fill="rgba(5,8,18,0.62)" mask="url(#vf-arrows-spot)" opacity={dimIn()} />
	{/if}
	{#each rings as r}
		{@const q = clip.p(r.at, 0.35, 'back.out(1.8)') * fade(r.until)}
		<rect x={r.x} y={r.y} width={r.w} height={r.h} rx="16" fill="none" stroke={r.color ?? '#c6f432'} stroke-width="7" opacity={q} transform="translate({r.x + r.w / 2} {r.y + r.h / 2}) scale({0.85 + 0.15 * q}) translate({-(r.x + r.w / 2)} {-(r.y + r.h / 2)})" />
	{/each}
	{#each arrows as a, i}
		{@const g = geo[i]}
		{@const draw = clip.p(a.at, 0.55, 'power2.inOut')}
		{@const head = clip.p(clip.at(a.at) + 0.45, 0.25, 'back.out(2)')}
		{@const o = fade(a.until)}
		{@const wob = a.hand ? (noise(clip.frame >> 1, i) - 0.5) * 3 : 0}
		{#if draw > 0}
			<g opacity={o} transform="translate({wob} {-wob})">
				<path d={g.d} fill="none" stroke={a.color ?? '#c6f432'} stroke-width={a.width ?? 9} stroke-linecap="round" stroke-dasharray={g.length} stroke-dashoffset={g.length * (1 - draw)} />
				<path d="M -34 -20 L 0 0 L -34 20" fill="none" stroke={a.color ?? '#c6f432'} stroke-width={a.width ?? 9} stroke-linecap="round" stroke-linejoin="round" transform="translate({a.to[0]} {a.to[1]}) rotate({g.angle}) scale({head})" />
				{#if a.label}
					<g transform="translate({a.from[0]} {a.from[1]}) scale({clip.p(a.at, 0.3, 'back.out(1.8)')})">
						<rect x={-a.label.length * 13 - 22} y="-36" width={a.label.length * 26 + 44} height="72" rx="20" fill={a.color ?? '#c6f432'} />
						<text text-anchor="middle" y="14" font-size="42" font-weight="900" fill="#0b1020" font-family="Inter Tight, system-ui, sans-serif">{a.label}</text>
					</g>
				{/if}
			</g>
		{/if}
	{/each}
</svg>

<style>
	.arr { position: absolute; inset: 0; width: 100%; height: 100%; }
</style>
