<!--
	Every move here is one `use:motion` line timed to a spoken word. The clip's
	`props.energy` ("calm", "balanced", "punchy") changes all default durations and distances.
-->
<script>
	import { motion } from 'visualfries/motion';
</script>

<div class="frame">
	<h1 use:motion={{ enter: 'pop', at: 'title', exit: 'drop', emphasis: { move: 'punch', at: 'go' } }}>
		Motion
	</h1>
	<p
		class="sub"
		use:motion={{
			enter: 'rise',
			split: 'chars',
			at: 'line',
			exit: 'fade',
			emphasis: { move: 'underline', at: 'line.end' }
		}}
	>
		in one line
	</p>

	<div class="row">
		<span class="tile" use:motion={{ enter: 'pop', at: 'pop', exit: 'scale' }}>pop</span>
		<span class="tile" use:motion={{ enter: 'rise', at: 'rise', exit: 'rise' }}>rise</span>
		<span class="tile" use:motion={{ enter: 'slide', at: 'slide', exit: 'slide' }}>slide</span>
	</div>

	<p class="typed" use:motion={{ enter: 'typewriter', at: 'type', exit: 'typewriter' }}>
		type it out, word by word
	</p>

	<div class="pair">
		<svg viewBox="0 0 420 220" use:motion={{ enter: 'draw', at: 'draw', exit: 'draw' }}>
			<path d="M20 40 C 120 200, 280 210, 380 120" />
			<path d="M330 112 L384 116 L362 166" />
		</svg>
		<span class="count" use:motion={{ count: 12400, at: 'count', enter: 'blur-in', exit: 'blur-in' }}
			>0</span
		>
	</div>

	<div class="row">
		<span
			class="word"
			use:motion={{ enter: 'spring', at: 'shake-0.3', emphasis: { move: 'shake', at: 'shake' }, exit: 'pop' }}
			>shake</span
		>
		<span
			class="word mark"
			use:motion={{
				enter: 'reveal',
				at: 'highlight-0.3',
				emphasis: { move: 'highlight', at: 'highlight', color: '#e5336d' },
				exit: 'reveal'
			}}>highlight</span
		>
	</div>
</div>

<style>
	.frame {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 70px;
		padding: 0 80px;
		color: #f5f1e8;
		font-family: Anton, sans-serif;
		text-transform: uppercase;
		--brand-accent: #ffcf3a;
	}
	h1 {
		margin: 0;
		font-size: 260px;
		line-height: 0.9;
		font-weight: 400;
	}
	.sub {
		margin: -40px 0 0;
		font: italic 500 92px Newsreader, serif;
		text-transform: none;
	}
	.row {
		display: flex;
		gap: 36px;
	}
	.tile {
		padding: 14px 34px 6px;
		border-radius: 18px;
		background: var(--brand-accent);
		color: #111114;
		font-size: 96px;
	}
	.typed {
		margin: 0;
		font: 500 64px Newsreader, serif;
		text-transform: none;
	}
	.pair {
		display: flex;
		align-items: center;
		gap: 30px;
	}
	svg {
		width: 420px;
		height: 220px;
		fill: none;
		stroke: var(--brand-accent);
		stroke-width: 14;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.count {
		font-size: 150px;
		min-width: 420px;
	}
	.word {
		font-size: 120px;
		padding: 0 10px;
	}
</style>
