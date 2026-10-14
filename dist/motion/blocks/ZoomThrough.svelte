<!--
	Built-in block "@visualfries/zoom-through": a transition across a cut in the footage — the
	outgoing shot rushes forward with echo trails and blur, a flash on the cut, the incoming shot
	settles back. Full frame on the footage itself; place the clip so it straddles the cut and give
	it "props": { "snap": false } for placement. Props:

	  footage  (default: the project's first footage), cut: moment of the cut (required)
	  out      seconds of the outgoing rush (default 0.24), in: of the settle (default 0.42)
	  color    light leak colour (default "#c6f432"), flash (default "#f4ffd6")
-->
<script lang="ts">
	import { useClip } from '../runtime.svelte.js';
	import Footage from '../Footage.svelte';

	const clip = useClip();
	const P = clip.props as Record<string, any>;
	const W = clip.width;
	const H = clip.height;
	const name: string = P.footage ?? Object.keys(clip.footage)[0];
	const c = () => clip.at(P.cut);
	const a = () => (clip.t < c() ? clip.p(c() - (P.out ?? 0.24), P.out ?? 0.24, 'power3.in') : 0);
	const b = () => (clip.t >= c() ? 1 - clip.p(c(), P.in ?? 0.42, 'expo.out') : 0);
	const m = () => Math.max(a(), b());
</script>

<div class="zt">
	<div class="abs" style="transform:scale({1 + 0.55 * a() + 0.35 * b()}) rotate({(a() - b()) * 2.5}deg);filter:blur({22 * m()}px) saturate({1 + m()})">
		<Footage {name} style="position:absolute;inset:0;width:{W}px;height:{H}px" />
	</div>
	{#each [0.12, 0.24, 0.36] as e}
		<div class="abs" style="opacity:{0.32 * m()};transform:scale({1 + (0.55 * a() + 0.35 * b()) * (1 + e * 2)});filter:blur({30 * m()}px);mix-blend-mode:screen">
			<Footage {name} offset={a() > 0 ? -e * 0.25 : e * 0.25} style="position:absolute;inset:0;width:{W}px;height:{H}px" />
		</div>
	{/each}
	<div class="abs" style="opacity:{m()};background:radial-gradient(60% 80% at {30 + 40 * a() + 30 * (1 - b())}% 50%, {P.color ?? '#c6f432'}88, transparent 70%)"></div>
	<div class="abs" style="background:{P.flash ?? '#f4ffd6'};opacity:{Math.max(0, 1 - Math.abs(clip.t - c()) / 0.09) * 0.85}"></div>
</div>

<style>
	.zt { position: absolute; inset: 0; overflow: hidden; background: #000; }
	.abs { position: absolute; inset: 0; }
</style>
