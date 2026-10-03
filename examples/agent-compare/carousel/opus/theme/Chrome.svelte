<!-- Shared frame: wordmark, page counter and progress bar. The bar fills on entrance. -->
<script>
	import { useClip } from 'visualfries/motion';
	let { n, dark = false, barDark = dark } = $props();
	const clip = useClip();
	const fg = dark ? 'var(--paper)' : 'var(--ink)';
	const accent = dark ? 'var(--y)' : 'var(--ink)';
</script>

<div class="chrome" style:color={fg} style:opacity={clip.p(0, 0.35)}>
	<div class="brand">
		<span class="dot" style:background={accent}></span>
		<span>VisualFries</span>
	</div>
	<div class="count mono">{String(n).padStart(2, '0')}<span class="of">{' / 05'}</span></div>
</div>
<div class="bar">
	{#each [1, 2, 3, 4, 5] as i}
		<div class="seg" style:background={barDark ? 'rgba(244,241,232,0.18)' : 'rgba(15,15,13,0.18)'}>
			<div
				class="fill"
				style:background={barDark ? 'var(--y)' : 'var(--ink)'}
				style:transform="scaleX({i < n ? 1 : i === n ? clip.p(0.1, 1.2, 'power2.inOut') : 0})"
			></div>
		</div>
	{/each}
</div>

<style>
	.chrome {
		position: absolute;
		left: 64px;
		right: 64px;
		top: 56px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		z-index: 20;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 14px;
		font-family: 'Bricolage', sans-serif;
		font-weight: 800;
		font-size: 32px;
		letter-spacing: -0.02em;
	}
	.dot { width: 18px; height: 18px; border-radius: 50%; }
	.count { font-size: 26px; font-weight: 700; letter-spacing: 0.06em; }
	.of { opacity: 0.45; }
	.bar {
		position: absolute;
		left: 64px;
		right: 64px;
		bottom: 52px;
		display: flex;
		gap: 10px;
		z-index: 20;
	}
	.seg { flex: 1; height: 6px; border-radius: 3px; overflow: hidden; }
	.fill { width: 100%; height: 100%; transform-origin: left center; }
</style>
