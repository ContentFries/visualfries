<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
	const words = clip.props.quote.split(' ');
	// Font size follows the surface, so the same block works at 4:5, 9:16, 1:1 and 16:9.
	const size = Math.round(clip.width / 11);
</script>

<figure style:font-size="{size}px">
	<i class="mark" style:transform="rotate({45 + clip.p('reveal', 0.5) * 360}deg)"></i>
	<blockquote>
		{#each words as word, i}
			{@const last = i === words.length - 1}
			{@const p = clip.p(`reveal+${i * 0.12}`, 0.5)}
			<span
				class:last
				style:color={last && clip.after('hit') ? 'var(--accent)' : null}
				style:opacity={p}
				style:transform="translateY({(1 - p) * 0.3}em)"
				>{word}{#if last}<u style:transform="scaleX({clip.p('hit', 0.4)})"></u>{/if}</span
			>{' '}
		{/each}
	</blockquote>
	<figcaption style:opacity={clip.p('by')}>— {clip.props.by}</figcaption>
</figure>

<style>
	figure {
		position: absolute;
		inset: 0;
		margin: 0;
		padding: 8%;
		display: grid;
		align-content: center;
		gap: 0.4em;
		color: var(--ink);
		font-family: Newsreader, serif;
	}
	.mark {
		position: absolute;
		top: 6%;
		left: 6%;
		width: 0.4em;
		height: 0.4em;
		border-radius: 0.1em;
		background: var(--accent);
	}
	blockquote {
		margin: 0;
		font-weight: 500;
		line-height: 1.1;
		letter-spacing: -0.01em;
	}
	span {
		display: inline-block;
		position: relative;
	}
	.last {
		font-style: italic;
	}
	u {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0.02em;
		height: 0.06em;
		background: var(--accent);
		transform-origin: left;
	}
	figcaption {
		font: 500 0.42em monospace;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--muted);
	}
</style>
