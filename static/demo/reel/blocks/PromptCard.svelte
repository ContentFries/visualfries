<!--
	Full-screen card for a whip shot's "card" slot: a prompt types itself, then tiles flip in on
	their cues while the whole card drifts in perspective, so the frame never stands still.
	props.prompt, props.typeFrom / typeFor (clip seconds), props.tiles: [{ kicker, name, at }].
	Content stays above the caption lane; landscape frames get a narrower, shorter stack.
-->
<script>
	import { useClip } from 'visualfries/motion';

	const clip = useClip();
	const prompt = clip.props.prompt ?? '';
	const tiles = clip.props.tiles ?? [];
	const typeFrom = clip.props.typeFrom ?? 0.25;
	const typeFor = clip.props.typeFor ?? 0.8;

	const drift = $derived(clip.map([[0, 0], ['end', 1]], 'none'));
	const shown = $derived(
		Math.round(prompt.length * Math.min(1, Math.max(0, (clip.t - typeFrom) / typeFor)))
	);
	const caret = $derived(Math.floor(clip.t * 3) % 2 === 0);
	const flip = (at) => clip.p(at, 0.5, 'back.out(1.6)');
	const glow = (at) => clip.map([[at, 0], [at + '+0.08', 1], [at + '+0.5', 0.25]]);
</script>

<div class="card">
	<div class="grid" style:transform="translateY({-drift * 60}px)"></div>
	<div
		class="stage"
		style:transform="perspective(1800px) rotateY({-9 + 14 * drift}deg) rotateX({4 -
			3 * drift}deg) scale({0.97 + 0.05 * drift})"
	>
		<div class="term">
			<div class="dots"><i></i><i></i><i></i></div>
			<div class="line">
				<span class="ps">&gt;</span>
				<span>{prompt.slice(0, shown)}</span><span class="caret" style:opacity={caret ? 1 : 0}
				></span>
			</div>
		</div>
		{#each tiles as tile, i}
			{@const k = flip(tile.at)}
			<div
				class="tile"
				style:opacity={Math.min(1, k * 3)}
				style:transform="rotateX({(1 - k) * -80}deg) translateY({(1 - k) * 60}px)"
				style:box-shadow="0 0 {80 * glow(tile.at)}px color-mix(in oklab, var(--brand-accent) {Math.round(
					55 * glow(tile.at)
				)}%, transparent), 0 30px 80px color-mix(in oklab, black 55%, transparent)"
			>
				<div class="k">{tile.kicker}</div>
				<div class="t">{tile.name}</div>
			</div>
			{#if i + 1 < tiles.length}
				<div class="plus" style:opacity={clip.p(tiles[i + 1].at + '-0.25', 0.3)}>+</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	.card {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: radial-gradient(
			ellipse at 50% 30%,
			color-mix(in oklab, var(--brand-surface) 70%, var(--brand-primary)) 0%,
			var(--brand-background) 70%
		);
		font-family: var(--brand-font-body);
		color: var(--brand-text);
	}
	.grid {
		position: absolute;
		inset: -10% -10% -20%;
		background-image:
			linear-gradient(color-mix(in oklab, var(--brand-muted) 9%, transparent) 2px, transparent 2px),
			linear-gradient(90deg, color-mix(in oklab, var(--brand-muted) 9%, transparent) 2px, transparent 2px);
		background-size: 90px 90px;
		mask-image: radial-gradient(ellipse at 50% 40%, black 30%, transparent 75%);
	}
	.stage {
		position: absolute;
		left: 90px;
		right: 90px;
		top: 300px;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 26px;
		transform-style: preserve-3d;
	}
	:global([data-format='landscape']) .stage {
		left: 22%;
		right: 22%;
		top: 70px;
		gap: 16px;
	}
	:global([data-format='landscape']) .tile .t {
		font-size: 92px;
	}
	:global([data-format='landscape']) .tile {
		padding: 18px 36px 22px;
	}
	:global([data-format='landscape']) .term {
		font-size: 42px;
		padding: 16px 30px 22px;
	}
	:global([data-format='landscape']) .plus {
		font-size: 80px;
	}
	.term {
		border-radius: var(--brand-radius);
		background: color-mix(in oklab, var(--brand-background) 70%, black);
		border: 3px solid var(--brand-surface);
		padding: 26px 36px 36px;
		font-family: var(--brand-font-mono);
		font-size: 54px;
		font-weight: 700;
	}
	.dots {
		display: flex;
		gap: 12px;
		margin-bottom: 18px;
	}
	.dots i {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--brand-surface);
	}
	.line {
		white-space: nowrap;
		overflow: hidden;
	}
	.ps {
		color: var(--brand-accent);
		margin-right: 18px;
	}
	.caret {
		display: inline-block;
		width: 30px;
		height: 64px;
		margin-left: 4px;
		vertical-align: -6px;
		background: var(--brand-accent);
	}
	.tile {
		padding: 30px 40px 34px;
		border-radius: var(--brand-radius);
		background: var(--brand-surface);
		border: 5px solid var(--brand-accent);
		transform-origin: 50% 0%;
	}
	.tile .k {
		font-family: var(--brand-font-mono);
		font-size: 40px;
		font-weight: 700;
		color: var(--brand-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.tile .t {
		font-size: 150px;
		font-weight: 900;
		letter-spacing: -0.04em;
		color: var(--brand-accent);
		line-height: 1.02;
		margin-top: 6px;
		padding-bottom: 0.08em;
	}
	.plus {
		align-self: center;
		font-family: var(--brand-font-heading);
		font-size: 120px;
		line-height: 0.8;
		margin: -14px 0;
		color: var(--brand-text);
	}
</style>
