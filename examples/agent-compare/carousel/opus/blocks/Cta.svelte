<!-- Slide 5, call to action: the install command types itself into a terminal. -->
<script>
	import { useClip } from 'visualfries/motion';
	import Chrome from '../theme/Chrome.svelte';

	const clip = useClip();
	const n = clip.props.n;
	const cmd = 'npm i visualfries';
	const typed = $derived(Math.round(clip.p(0.85, 0.85, 'none') * cmd.length));
	const term = $derived(clip.p(0.5, 0.7, 'expo.out'));
	const done = $derived(clip.p(1.8, 0.45, 'back.out(2)'));
</script>

<div class="slide light">
	<h1 class="abs title head">
		<span class="mask"
			><span class="in" style:transform="translateY({(1 - clip.p(0.1, 0.8, 'expo.out')) * 110}%)"
				>One take in.</span
			></span
		>
		<span class="mask"
			><span class="in serif" style:transform="translateY({(1 - clip.p(0.24, 0.8, 'expo.out')) * 110}%)"
				>A week out.</span
			></span
		>
	</h1>

	<div class="abs term" style:opacity={Math.min(1, term * 1.5)} style:transform="translateY({(1 - term) * 80}px)">
		<div class="bar">
			<span></span><span></span><span></span>
			<em class="mono">{'~/my-channel'}</em>
		</div>
		<div class="line mono">
			<span class="pr">$</span><span class="cmd">{cmd.slice(0, typed)}</span><span class="cursor"></span>
		</div>
		<div class="ok mono" style:opacity={Math.min(1, done)} style:transform="translateY({(1 - done) * 14}px)">
			{'+ visualfries  ·  skill included for your agent'}
		</div>
	</div>

	<div class="abs foot" style:opacity={clip.p(2.0, 0.5)} style:transform="translateY({(1 - clip.p(2.0, 0.5)) * 16}px)">
		<span class="hint">Then hand your agent the transcript.</span>
		<span class="save mono">{'save this ↗'}</span>
	</div>

	<Chrome {n} />
</div>

<style>
	.title { left: 64px; top: 168px; margin: 0; font-size: 156px; }
	.in { display: block; padding-bottom: 8px; }
	.serif { font-size: 176px; font-weight: 400; letter-spacing: -0.02em; }
	.term {
		left: 64px;
		right: 64px;
		top: 640px;
		background: var(--ink);
		border-radius: 26px;
		padding: 0 0 46px;
		box-shadow: 18px 18px 0 rgba(15, 15, 13, 0.18);
	}
	.bar {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 22px 28px;
		border-bottom: 1.5px solid rgba(244, 241, 232, 0.1);
	}
	.bar span { width: 16px; height: 16px; border-radius: 50%; background: #3a3a35; }
	.bar em { margin-left: 16px; font-style: normal; font-size: 22px; color: var(--mute); }
	.line {
		padding: 50px 44px 0;
		font-size: 76px;
		font-weight: 700;
		letter-spacing: -0.02em;
		display: flex;
		align-items: center;
		white-space: pre;
	}
	.pr { color: var(--mute); margin-right: 30px; }
	.cmd { color: var(--y); }
	.cursor { display: inline-block; width: 38px; height: 78px; background: var(--y); margin-left: 8px; }
	.ok { padding: 26px 44px 0; font-size: 24px; color: #b9e6a0; }
	.foot {
		left: 64px;
		right: 64px;
		top: 1140px;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.hint { font-size: 34px; font-weight: 600; letter-spacing: -0.01em; }
	.save { font-size: 24px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
</style>
