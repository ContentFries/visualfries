<!-- Slide 3, step 2: the agent reads the word transcript and writes a block from it. -->
<script>
	import { useClip } from 'visualfries/motion';
	import Chrome from '../theme/Chrome.svelte';

	const clip = useClip();
	const n = clip.props.n;
	const words = clip.words.line;
	const hot = (w) => /huge|edge/i.test(w.text);

	const code = [
		[['c', '// blocks/Hook.svelte  ← written by your agent']],
		[['k', 'cues'], ['p', ': { '], ['s', 'edge'], ['p', ': '], ['y', '"huge edge"'], ['p', ' }']],
		[['k', 'tl'], ['p', '.from(q('], ['y', "'.word'"], ['p', '), '], ['s', '{ scale: 1.6 }'], ['p', ', at('], ['y', "'edge'"], ['p', '))']]
	];
	const lens = code.map((l) => l.reduce((a, [, t]) => a + t.length, 0));
	const total = lens.reduce((a, b) => a + b, 0);
	// Characters typed so far, frame-exact.
	const typed = $derived(Math.round(clip.p(1.15, 1.25, 'none') * total));
	const visible = (li, si) => {
		let before = lens.slice(0, li).reduce((a, b) => a + b, 0);
		before += code[li].slice(0, si).reduce((a, [, t]) => a + t.length, 0);
		return Math.max(0, Math.min(code[li][si][1].length, typed - before));
	};
	const lineDone = (li) => typed >= lens.slice(0, li + 1).reduce((a, b) => a + b, 0);
	const cursorLine = $derived(code.findIndex((_, li) => !lineDone(li)));
</script>

<div class="slide light">
	<div class="abs step kicker" style:opacity={clip.p(0, 0.4)}>
		<span class="num">02</span>{'Step two'}
	</div>

	<h1 class="abs title head">
		<span class="mask"
			><span class="in" style:transform="translateY({(1 - clip.p(0.12, 0.8, 'expo.out')) * 110}%)"
				>Your agent reads</span
			></span
		>
		<span class="mask"
			><span class="in" style:transform="translateY({(1 - clip.p(0.22, 0.8, 'expo.out')) * 110}%)"
				>the transcript</span
			></span
		>
		<span class="mask"
			><span class="in serif" style:transform="translateY({(1 - clip.p(0.32, 0.8, 'expo.out')) * 110}%)"
				>and writes the blocks.</span
			></span
		>
	</h1>

	<div class="abs card transcript" style:opacity={clip.p(0.5, 0.4)} style:transform="translateY({(1 - clip.p(0.5, 0.7, 'expo.out')) * 60}px)">
		<div class="label mono">{'talk.transcript.json'}</div>
		<div class="chips">
			{#each words as w, i}
				{@const on = clip.p(0.6 + i * 0.06, 0.35, 'back.out(2)')}
				<div
					class="chip mono"
					class:hot={hot(w)}
					style:opacity={Math.min(1, on)}
					style:transform="translateY({(1 - on) * 18}px)"
				>
					<span class="w">{w.text}</span>
					<span class="t">{w.start.toFixed(2)}s</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="abs arrow mono" style:opacity={clip.p(1.0, 0.3)}>{'↓  agent'}</div>

	<div class="abs card codecard" style:opacity={clip.p(0.95, 0.35)} style:transform="translateY({(1 - clip.p(0.95, 0.6, 'expo.out')) * 60}px)">
		{#each code as line, li}
			<div class="code mono">
				{#each line as [kind, text], si}<span class={kind}>{text.slice(0, visible(li, si))}</span>{/each}{#if li === cursorLine || (cursorLine === -1 && li === code.length - 1)}<span
						class="cursor"
						></span>{/if}
			</div>
		{/each}
	</div>

	<Chrome {n} />
</div>

<style>
	.step { left: 64px; top: 150px; display: flex; align-items: center; gap: 16px; color: var(--ink); }
	.num { background: var(--ink); color: var(--y); padding: 4px 10px; border-radius: 4px; }
	.title { left: 64px; top: 200px; margin: 0; font-size: 104px; }
	.in { display: block; padding-bottom: 6px; }
	.serif { font-size: 112px; font-weight: 400; letter-spacing: -0.02em; }
	.card { left: 64px; right: 64px; border-radius: 22px; background: var(--ink); color: var(--paper); }
	.transcript { top: 590px; padding: 28px 30px 32px; }
	.label { font-size: 22px; color: var(--mute); letter-spacing: 0.04em; margin-bottom: 18px; }
	.chips { display: flex; flex-wrap: wrap; gap: 10px; }
	.chip {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px 13px;
		border-radius: 10px;
		background: var(--ink2);
		border: 1.5px solid rgba(244, 241, 232, 0.12);
	}
	.chip .w { font-size: 33px; font-weight: 700; }
	.chip .t { font-size: 20px; color: var(--mute); }
	.chip.hot { background: var(--y); color: var(--ink); border-color: var(--y); }
	.chip.hot .t { color: rgba(15, 15, 13, 0.6); }
	.arrow { left: 0; right: 0; top: 852px; text-align: center; font-size: 26px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
	.codecard { top: 908px; padding: 30px 32px; }
	.code { font-size: 28px; line-height: 1.6; white-space: pre; }
	.c { color: var(--mute); }
	.k { color: var(--paper); font-weight: 700; }
	.p { color: #c9c5b8; }
	.s { color: #9fd0ff; }
	.y { color: var(--y); }
	.cursor { display: inline-block; width: 14px; height: 30px; background: var(--y); vertical-align: -5px; margin-left: 2px; }
</style>
