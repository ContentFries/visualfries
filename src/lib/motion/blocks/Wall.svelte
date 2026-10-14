<!--
	Built-in block "@visualfries/wall": the shot zooms out into a 3×3 wall of other clips (sneak
	peeks, a masonry with the side columns shifted) and back in. Full frame; outside the move the
	picture equals the main footage, so the clip sits seamlessly over the camera. Props:

	  main    footage shown in the centre tile (default: the project's first footage)
	  tiles   [{ footage, at, label? }] up to 8; `at` = second of that footage shown when the wall opens
	  out     moment the zoom-out starts; back: moment the zoom-in starts (lands 0.5 s later)
	  scale   how small the centre gets (default 0.335), tilt (deg, default 9), gap (px, default 90)
	  label   label on the centre tile (default none), accent (default "#c6f432")

	Tile footages need "margin": "all" (or a margin covering their `at`).
-->
<script lang="ts">
	import { useClip, type At } from '../runtime.svelte.js';
	import Footage from '../Footage.svelte';
	import { wallSlots } from '../recipes.js';

	const clip = useClip();
	const P = clip.props as Record<string, any>;
	const W = clip.width;
	const H = clip.height;
	const main: string = P.main ?? Object.keys(clip.footage)[0];
	const tiles: { footage: string; at: number; label?: string }[] = (P.tiles ?? []).slice(0, 8);
	const slots = wallSlots(W, H, P.gap ?? 90);
	const accent = P.accent ?? '#c6f432';
	const out: At = P.out ?? 'start+0.2';
	const back: At = P.back ?? 'end-0.6';
	const k = () => clip.p(out, 0.62, 'expo.inOut') * (1 - clip.p(back, 0.5, 'expo.inOut'));
	const tileIn = (i: number) => clip.p(clip.at(out) + 0.12 + i * 0.035, 0.45, 'back.out(1.5)');
</script>

<div class="wall">
	<div class="bg" style="opacity:{Math.min(1, k() * 3)}"></div>
	<div class="stage">
		<div class="cam" style="width:{W}px;height:{H}px;transform:scale({1 - (1 - (P.scale ?? 0.335)) * k()}) rotateX({(P.tilt ?? 9) * k()}deg) rotateZ({-3.5 * k()}deg) translateY({-40 * k()}px)">
			{#each tiles as t, i}
				{@const p = tileIn(i)}
				<div class="tile" style="left:{slots[i].x}px;top:{slots[i].y}px;width:{W}px;height:{H}px;opacity:{Math.min(1, p * 1.4) * Math.min(1, k() * 4)};transform:scale({0.82 + 0.18 * p})">
					<Footage name={t.footage} offset={t.at - clip.at(out)} style="position:absolute;inset:0;width:{W}px;height:{H}px" />
					{#if t.label}<div class="lab" style="color:{accent};border-color:{accent}">{t.label}</div>{/if}
				</div>
			{/each}
			<div class="tile main" style="left:0;top:0;width:{W}px;height:{H}px;box-shadow:0 0 0 {12 * Math.min(1, k() * 2.5)}px {accent}, 0 0 160px {accent}88">
				<Footage name={main} style="position:absolute;inset:0;width:{W}px;height:{H}px" />
				{#if P.label}<div class="lab top" style="background:{accent};opacity:{clip.p(clip.at(out) + 0.35, 0.3) * (1 - clip.p(back, 0.25))}">{P.label}</div>{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.wall { position: absolute; inset: 0; overflow: hidden; background: #0b1020; font-family: 'Inter Tight', system-ui, sans-serif; }
	.bg { position: absolute; inset: 0; background: radial-gradient(70% 70% at 50% 45%, #1a2550 0%, #0b1020 70%); }
	.stage { position: absolute; inset: 0; perspective: 2600px; }
	.cam { position: absolute; left: 0; top: 0; transform-origin: 50% 50%; transform-style: preserve-3d; }
	.tile { position: absolute; border-radius: 46px; overflow: hidden; background: #0b1020; box-shadow: 0 40px 120px rgba(0, 0, 0, 0.7); }
	.lab { position: absolute; left: 60px; bottom: 56px; padding: 18px 40px; border-radius: 30px; background: rgba(11, 16, 32, 0.85); border: 5px solid; font-size: 92px; font-weight: 900; letter-spacing: -0.02em; }
	.lab.top { left: auto; right: 60px; top: 56px; bottom: auto; color: #0b1020; border: none; }
</style>
