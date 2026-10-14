<!--
	Built-in block "@visualfries/screen": a real screen recording (or a screenshot) in a browser
	window, with a camera that glides to the part being talked about on each cue, and notes beside
	it. Props:

	  footage  footage of the recording, or image: an asset URL/class for a still
	  size     [w, h] of the source in px (default: footage size)
	  window   { x, y, w } in clip px (default { x: 120, y: 250, w: 1240 }), url: text in the bar
	  cams     [{ at, r: [x, y, w, h] }] source rects to glide to (eased 0.8 s)
	  still    moment from which a still image (`image`) replaces the footage (recordings that
	           wander off into private screens)
	  notes    [{ at, until?, text, y }] cards to the right of the window (HTML allowed)
	  accent   (default "#c6f432")
-->
<script lang="ts">
	import { useClip, type At } from '../runtime.svelte.js';
	import Footage from '../Footage.svelte';
	import { cameraAt, type Rect } from '../recipes.js';

	const clip = useClip();
	const P = clip.props as Record<string, any>;
	const f = P.footage ? clip.footage[P.footage] : null;
	const [SW, SH]: [number, number] = P.size ?? (f ? [f.width, f.height] : [1920, 1080]);
	const win = { x: 120, y: 250, w: 1240, ...(P.window ?? {}) };
	const WH = Math.round((win.w * SH) / SW);
	const cams: { at: At; r: Rect }[] = P.cams ?? [];
	const accent = P.accent ?? '#c6f432';
	const cam = () => cameraAt(cams.map((c) => ({ e: clip.p(c.at, 0.8, 'expo.inOut'), r: c.r })), SW, SH, win.w, WH);
	const showStill = () => P.image && (P.still === undefined || clip.after(P.still));
</script>

<div class="scr" style="left:{win.x}px;top:{win.y}px;width:{win.w}px;opacity:{Math.min(1, clip.p(0.05, 0.4) * 1.5)};transform:translateY({(1 - clip.p(0.05, 0.5, 'power3.out')) * 40}px)">
	<div class="bar"><i></i><i></i><i></i><span>{P.url ?? ''}</span></div>
	<div class="view" style="height:{WH}px">
		<div class="cont" style="width:{SW}px;height:{SH}px;transform:translate({cam().tx}px,{cam().ty}px) scale({cam().s})">
			{#if showStill()}
				{#if String(P.image).includes('/') || String(P.image).startsWith('data:')}
					<img src={P.image} alt="" style="position:absolute;inset:0;width:100%;height:100%" />
				{:else}
					<div class={P.image} style="position:absolute;inset:0;background-size:100% 100%"></div>
				{/if}
			{:else if P.footage}
				<Footage name={P.footage} style="position:absolute;inset:0;width:{SW}px;height:{SH}px" />
			{/if}
		</div>
	</div>
</div>
{#each P.notes ?? [] as n}
	<div class="note" style="left:{win.x + win.w + 50}px;top:{n.y}px;border-color:{accent};opacity:{Math.min(1, clip.p(n.at, 0.15) * 1.6) * (n.until ? 1 - clip.p(n.until, 0.25) : 1)};transform:translateY({(1 - clip.p(n.at, 0.4, 'back.out(1.5)')) * 24}px)">{@html n.text}</div>
{/each}

<style>
	.scr { position: absolute; border-radius: 22px; overflow: hidden; background: #111; box-shadow: 0 40px 110px rgba(0, 0, 0, 0.65); outline: 4px solid #2a355c; }
	.bar { height: 40px; background: #1f2937; display: flex; align-items: center; gap: 8px; padding-left: 16px; }
	.bar i { width: 13px; height: 13px; border-radius: 7px; background: #4b5563; display: block; }
	.bar span { margin-left: 16px; font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 20px; color: #9ca3af; }
	.view { position: relative; overflow: hidden; background: #1a1714; }
	.cont { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
	.note { position: absolute; width: 420px; padding: 18px 26px; border-radius: 22px; background: #131a33; border: 4px solid; color: #eef2ff; font-family: 'Inter Tight', system-ui, sans-serif; font-size: 40px; font-weight: 900; line-height: 1.1; }
</style>
