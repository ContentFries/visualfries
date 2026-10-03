<!-- 1:1 kinetic type, 8 s: three roles slam in, each flips to black, and they resolve into one line. -->
<script>
	import { useClip, useTimeline, noise } from 'visualfries/motion';
	const clip = useClip();
	const roles = ['VIDEO EDITOR', 'MOTION DESIGNER', 'GRAPHIC DESIGNER'];
	const shake = $derived(clip.map([[0, 0], [5.9, 0], [6.0, 1], [6.5, 0]]));
	const sx = $derived((noise(clip.frame, 1) - 0.5) * 30 * shake);
	const sy = $derived((noise(clip.frame, 2) - 0.5) * 30 * shake);

	useTimeline(({ tl, q }) => {
		roles.forEach((_, i) => {
			const t = 0.3 + i * 1.5;
			tl.fromTo(q(`[data-r="${i}"]`), { x: i % 2 ? 1100 : -1100, skewX: i % 2 ? -20 : 20 }, { x: 0, skewX: 0, duration: 0.6, ease: 'expo.out' }, t);
			tl.fromTo(q(`[data-s="${i}"]`), { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: 'power3.out' }, t + 0.9);
			tl.to(q(`[data-r="${i}"]`), { color: '#ffe100', duration: 0.15 }, t + 1.0);
		});
		tl.from(q('.lead'), { y: -30, opacity: 0, duration: 0.5, ease: 'expo.out' }, 0);
		tl.to(q('.lead'), { opacity: 0, duration: 0.3 }, 5.3);
		tl.to(q('.role'), { y: -40, opacity: 0, stagger: 0.06, duration: 0.4, ease: 'power2.in' }, 5.3);
		tl.fromTo(q('.one'), { scale: 3, opacity: 0, filter: 'blur(30px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.5, ease: 'expo.out' }, 5.9);
		tl.fromTo(q('.sub'), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out' }, 6.5);
	});
</script>

<div class="k" style:transform="translate({sx}px, {sy}px)">
	<div class="lead mono">YOUR AI</div>
	<div class="roles">
		{#each roles as r, i}
			<div class="role display" data-r={i}><span class="strike" data-s={i}></span>{r}</div>
		{/each}
	</div>
	<div class="one display">ONE<br />PROMPT.</div>
	<div class="sub mono">VISUALFRIES · OPEN SOURCE</div>
</div>

<style>
	.display { font-family: 'Bricolage', sans-serif; }
	.mono { font-family: 'JetBrains Mono', monospace; }
	.k { position: absolute; inset: 0; background: #ffe100; color: #0b0b0c; overflow: hidden; }
	.lead { position: absolute; left: 0; width: 100%; top: 250px; text-align: center; font-size: 34px; letter-spacing: 0.3em; }
	.roles { position: absolute; left: 0; right: 0; top: 340px; display: grid; gap: 30px; }
	.role { position: relative; isolation: isolate; justify-self: center; font-size: 92px; font-weight: 800; letter-spacing: -0.035em; padding: 0 6px; line-height: 0.95; white-space: nowrap; }
	.strike { position: absolute; z-index: -1; left: -24px; right: -24px; top: -6px; bottom: -10px; background: #0b0b0c; transform-origin: 0 50%; }
	.one { position: absolute; left: 0; width: 100%; top: 300px; text-align: center; font-size: 230px; font-weight: 800; letter-spacing: -0.06em;
		line-height: 0.85; opacity: 0; }
	.sub { position: absolute; left: 0; width: 100%; bottom: 120px; text-align: center; font-size: 28px; letter-spacing: 0.2em; opacity: 0; }
</style>
