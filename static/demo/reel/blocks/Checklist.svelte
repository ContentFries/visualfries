<!--
	Fills a strip shot's "panel" slot: a title and items that tick on their cues.
	props.title and items[].text may use <b> for the accent; props.items: [{ text, at }].
	The content fades out before the clip ends (props.leaveAt, default "end-0.62"): end the clip
	when the slot has slid away, and the panel leaves empty instead of under the captions.
-->
<script>
	import { useClip } from 'visualfries/motion';

	const clip = useClip();
	const items = clip.props.items ?? [];
	const title = clip.props.title ?? '';

	const enter = (at, d = 0.42) => clip.p(at, d, 'expo.out');
	const tick = (at) => clip.p(at, 0.28, 'back.out(2.2)');
	// The panel arrives with the strip; its title follows a beat later.
	const head = $derived(enter(0.18, 0.5));
	// Content leaves before the panel slides away, so captions never sit on a list.
	const leave = $derived(clip.out(clip.props.leaveAt ?? 'end-0.62', 0.2));
</script>

<div class="panel">
	<div class="inner" style:opacity={leave}>
		<div
			class="title"
			style:opacity={head}
			style:transform="translateY({(1 - head) * 40}px)"
		>
			{@html title}
		</div>
		<div class="list">
			{#each items as item, i}
				{@const k = enter(item.at)}
				{@const c = tick(item.at + '+0.12')}
				<div
					class="li"
					class:on={k > 0.01}
					style:opacity={Math.min(1, k * 1.6)}
					style:transform="translateX({(1 - k) * 140}px) rotate({(1 - k) * 2}deg)"
				>
					<div class="ck" style:transform="scale({0.4 + 0.6 * c})" style:opacity={c}>
						<svg viewBox="0 0 24 24"
							><path
								d="M5 12.5l4.2 4.2L19 7"
								pathLength="1"
								style:stroke-dashoffset={1 - clip.p(item.at + '+0.16', 0.3, 'power2.out')}
							/></svg
						>
					</div>
					<span>{@html item.text}</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.panel {
		position: absolute;
		inset: 0;
		background: var(--brand-background);
		border-top: 6px solid var(--brand-accent);
		overflow: hidden;
		font-family: var(--brand-font-body);
		color: var(--brand-text);
	}
	.inner {
		position: absolute;
		left: 64px;
		right: 64px;
		top: 90px;
	}
	.title {
		font-size: 96px;
		font-weight: 900;
		letter-spacing: -0.02em;
		margin-bottom: 40px;
	}
	.title :global(b) {
		color: var(--brand-accent);
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 30px;
	}
	.li {
		display: flex;
		align-items: center;
		gap: 26px;
		padding: 26px 32px;
		border-radius: var(--brand-radius);
		background: var(--brand-surface);
		border: 4px solid color-mix(in oklab, var(--brand-muted) 30%, transparent);
		font-size: 64px;
		font-weight: 800;
		line-height: 1.08;
	}
	.li :global(b) {
		color: var(--brand-accent);
	}
	.ck {
		width: 80px;
		height: 80px;
		flex: none;
		border-radius: 18px;
		background: var(--brand-accent);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ck svg {
		width: 56px;
		height: 56px;
	}
	.ck path {
		fill: none;
		stroke: var(--brand-on-accent);
		stroke-width: 3.4;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 1;
	}
</style>
