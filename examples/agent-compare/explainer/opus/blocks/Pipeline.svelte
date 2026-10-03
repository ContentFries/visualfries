<!--
	How VisualFries turns a project into an MP4, in four panels:
	01 project JSON → 02 Svelte blocks → 03 frames on a timeline → 04 encoded MP4.
	Each panel enters on its cue (see project.vf.json); arrows carry a packet into the next one.
-->
<script>
	import { useClip, clamp } from 'visualfries/motion';

	const clip = useClip();

	const Y = '#ffe100';
	const W = 362;
	const GAP = 90;
	const LEFT = 100;
	const TOP = 290;
	const H = 520;
	const STAGES = ['json', 'blocks', 'frames', 'mp4'];
	const xOf = (i) => LEFT + i * (W + GAP);

	const panels = [
		{ num: '01', tag: 'project.vf.json', label: 'Project JSON', sub: 'One document describes the video' },
		{ num: '02', tag: 'blocks/', label: 'Svelte blocks', sub: 'Every clip is a component' },
		{ num: '03', tag: 'timeline · 30 fps', label: 'Frames on a timeline', sub: 'Each frame is seeked by time' },
		{ num: '04', tag: 'out/', label: 'Encoded MP4', sub: 'ffmpeg writes the finished file' }
	];

	// Panel entrance and "active" highlight.
	const enter = (i) => clip.p(STAGES[i], 0.7, 'expo.out');
	const active = (i) => {
		const on = clip.p(STAGES[i], 0.35);
		const off = i < 3 ? clip.p(STAGES[i + 1], 0.45) : 0;
		const outro = clip.p('outro', 0.6) * 0.55;
		return Math.max(on * (1 - off), i < 3 ? outro * clip.p(STAGES[i + 1]) : 0);
	};

	// Arrow i sits between panel i and i+1; it draws, then a packet travels across it.
	const arrowDraw = (i) => clip.p(`${STAGES[i + 1]}-0.75`, 0.45, 'expo.out');
	const packetX = (i) =>
		clip.map([[`${STAGES[i + 1]}-0.5`, 0], [`${STAGES[i + 1]}-0.05`, 1]], 'power2.inOut');
	const packetOn = (i) => clip.between(`${STAGES[i + 1]}-0.5`, `${STAGES[i + 1]}+0.05`);

	// ---- 01 JSON -------------------------------------------------------------------------
	// Each line: indent, key, value, trailing punctuation, and which tokens are strings/numbers.
	const json = [
		[0, '{'],
		[1, '"size"', '[1920, 1080]', ','],
		[1, '"fps"', '30', ','],
		[1, '"clips"', '['],
		[2, '{'],
		[3, '"id"', '"intro"', ','],
		[3, '"block"', '"Title.svelte"', ',', true],
		[3, '"from"', '0', ','],
		[3, '"until"', '4'],
		[2, '}'],
		[1, ']'],
		[0, '}']
	];
	const lineIn = (i) => clip.p(`json+${0.2 + i * 0.09}`, 0.35, 'power3.out');
	const blockGlow = () => clip.p('json+1.9', 0.4) * (1 - clip.p('mp4', 0.5) * 0.6);

	// ---- 02 Blocks -----------------------------------------------------------------------
	const blocks = [
		{ tag: '<Title />', file: 'Title.svelte', kind: 'title' },
		{ tag: '<Chart />', file: 'Chart.svelte', kind: 'chart' },
		{ tag: '<Captions />', file: 'Captions.svelte', kind: 'captions' }
	];
	const cardIn = (i) => clip.p(`blocks+${0.15 + i * 0.16}`, 0.6, 'back.out(1.6)');
	const bars = [0.45, 0.8, 0.6, 1];
	const barGrow = (i) => clip.p(`blocks+${0.7 + i * 0.08}`, 0.5, 'expo.out');

	// ---- 03 Frames -----------------------------------------------------------------------
	// Playhead sweeps the 12-second program while this stage is on.
	const play = () => clip.map([['frames+0.35', 0], ['mp4-0.2', 1]], 'power1.inOut');
	const frameNo = () => Math.round(play() * 360);
	const THUMBS = 6;
	const thumbOn = (i) => clamp((play() * THUMBS - i) * 3);
	// A tiny composed frame at program progress f (0..1): title in, chart grows, caption last.
	const fTitle = (f) => clamp(f / 0.25);
	const fChart = (f) => clamp((f - 0.2) / 0.35);
	const fCap = (f) => clamp((f - 0.55) / 0.2);
	const tracks = [
		{ name: 'Title', from: 0, to: 1 },
		{ name: 'Chart', from: 0.2, to: 1 },
		{ name: 'Captions', from: 0.55, to: 1 }
	];

	// ---- 04 MP4 --------------------------------------------------------------------------
	const enc = () => clip.map([['mp4+0.3', 0], ['done', 1]], 'power1.inOut');
	const doneIn = () => clip.p('done', 0.5, 'back.out(2.2)');
	const specIn = (i) => clip.p(`done+${0.15 + i * 0.1}`, 0.45, 'power3.out');
	const specs = [
		['size', '1920 × 1080'],
		['rate', '30 fps · 12.0 s'],
		['codec', 'H.264 · yuv420p']
	];
</script>

<div class="stage">
	<div class="grid"></div>

	<!-- Header -->
	<div class="header" style:opacity={clip.p(0.05, 0.6)} style:transform="translateY({(1 - clip.p(0.05, 0.8, 'expo.out')) * -24}px)">
		<div class="kicker"><span class="dot"></span>VISUALFRIES · RENDER PIPELINE</div>
		<h1>From a JSON document <span class="y">to a finished MP4</span></h1>
	</div>

	<!-- Empty slots: the whole pipeline is visible before it fills -->
	{#each panels as pnl, i}
		<div
			class="slot"
			style:left="{xOf(i)}px"
			style:top="{TOP}px"
			style:opacity={clip.p(0.15 + i * 0.12, 0.5) * (1 - clamp(enter(i) * 2))}
		>
			<span>{pnl.num}</span>
		</div>
	{/each}

	<!-- Arrows -->
	{#each [0, 1, 2] as i}
		<div class="arrow" style:left="{xOf(i) + W + 12}px" style:top="{TOP + H / 2}px">
			<div class="shaft" style:transform="scaleX({arrowDraw(i)})"></div>
			<div class="head" style:opacity={clamp(arrowDraw(i) * 3 - 2)}></div>
			{#if packetOn(i)}
				<div class="packet" style:left="{packetX(i) * (GAP - 36)}px"></div>
			{/if}
		</div>
	{/each}

	<!-- Panels -->
	{#each panels as pnl, i}
		<div
			class="panel"
			style:left="{xOf(i)}px"
			style:top="{TOP}px"
			style:opacity={clamp(enter(i) * 1.6)}
			style:transform="translateY({(1 - enter(i)) * 40}px) scale({0.96 + 0.04 * enter(i)})"
		>
			<div class="ring" style:opacity={active(i)}></div>
			<div class="ptag"><span>{pnl.tag}</span><span class="led" style:background={active(i) > 0.5 ? Y : '#3a3a42'}></span></div>

			{#if i === 0}
				<div class="code">
					{#each json as [ind, a, b, c, hot], li}
						<div
							class="line"
							class:hot
							style:opacity={lineIn(li)}
							style:transform="translateX({(1 - lineIn(li)) * -14}px)"
						>
							{#if hot}<div class="hl" style:opacity={blockGlow()}></div>{/if}
							<span class="ln">{String(li + 1).padStart(2, '0')}</span>
							<span style:padding-left="{ind * 12}px">
								{#if b !== undefined}
									<span class="k">{a}</span><span class="p">{': '}</span><span class={b.startsWith('"') ? 's' : 'n'}>{b}</span><span class="p">{c ?? ''}</span>
								{:else}
									<span class="p">{a}</span>
								{/if}
							</span>
						</div>
					{/each}
				</div>
				<div class="foot" style:opacity={clip.p('json+1.5', 0.5)}>12 lines · validated</div>
			{/if}

			{#if i === 1}
				<div class="cards">
					{#each blocks as b, bi}
						<div
							class="card"
							style:opacity={clamp(cardIn(bi) * 1.5)}
							style:transform="translateX({(1 - cardIn(bi)) * -60}px)"
						>
							<div class="ctext">
								<div class="ctag">{b.tag}</div>
								<div class="cfile">{b.file}</div>
							</div>
							<div class="mini">
								{#if b.kind === 'title'}
									<div class="tbar" style:width="{70 * clip.p(`blocks+${0.6}`, 0.6, 'expo.out')}%"></div>
									<div class="tbar thin" style:width="{48 * clip.p(`blocks+${0.75}`, 0.6, 'expo.out')}%"></div>
								{:else if b.kind === 'chart'}
									<div class="chart">
										{#each bars as h, k}
											<div class="bar" style:height="{h * 100 * barGrow(k)}%"></div>
										{/each}
									</div>
								{:else}
									<div class="pill" style:transform="scale({clip.p('blocks+1.0', 0.5, 'back.out(2)')})">
										<span class="w on">hello</span><span class="w">world</span>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
				<div class="foot" style:opacity={clip.p('blocks+1.2', 0.5)}>{'import … from \'visualfries/motion\''}</div>
			{/if}

			{#if i === 2}
				{@const f = play()}
				<div class="frame">
					<div class="ft" style:opacity={fTitle(f)} style:transform="translateY({(1 - fTitle(f)) * 10}px)">
						<div class="tbar" style:width="62%"></div>
						<div class="tbar thin" style:width="40%"></div>
					</div>
					<div class="fchart">
						{#each bars as h}
							<div class="bar" style:height="{h * 100 * fChart(f)}%"></div>
						{/each}
					</div>
					<div class="fcap" style:opacity={fCap(f)} style:transform="scale({0.8 + 0.2 * fCap(f)})">
						<span class="w on">hello</span><span class="w">world</span>
					</div>
				</div>
				<div class="counter">
					<span>frame <b>{String(frameNo()).padStart(3, '0')}</b> / 360</span>
					<span>{(f * 12).toFixed(2)} s</span>
				</div>
				<div class="tl">
					<div class="ruler">
						{#each Array(25) as _, k}
							<div class="tick" class:major={k % 6 === 0} style:left="{(k / 24) * 100}%"></div>
						{/each}
						{#each [0, 4, 8, 12] as s}
							<div class="tlab" class:t0={s === 0} style:left="{(s / 12) * 100}%">{s}s</div>
						{/each}
					</div>
					{#each tracks as tr}
						<div class="track">
							<div class="seg" style:left="{tr.from * 100}%" style:width="{(tr.to - tr.from) * 100}%">{tr.name}</div>
						</div>
					{/each}
					<div class="strip">
						{#each Array(THUMBS) as _, k}
							{@const tf = (k + 0.5) / THUMBS}
							<div class="thumb" style:opacity={0.15 + 0.85 * thumbOn(k)} style:transform="translateY({(1 - thumbOn(k)) * 6}px)">
								<div class="tt" style:width="{50 * fTitle(tf)}%"></div>
								<div class="tc">
									{#each bars as h}
										<div style:height="{h * 100 * fChart(tf)}%"></div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
					<div class="playhead" style:left="{f * 100}%"></div>
				</div>
			{/if}

			{#if i === 3}
				<div class="file" style:transform="scale({0.9 + 0.1 * clip.p('done', 0.4, 'back.out(3)')})">
					<div class="fold"></div>
					<div class="fbody">
						<div class="flabel">MP4</div>
						<div class="play" style:opacity={doneIn()} style:transform="scale({doneIn()})"></div>
					</div>
					<div class="check" style:opacity={clamp(doneIn() * 2)} style:transform="scale({doneIn()})">
						<svg viewBox="0 0 24 24" width="30" height="30"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#0b0b0d" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
					</div>
				</div>
				<div class="fname">out/out.mp4</div>
				<div class="prog">
					<div class="fill" style:width="{enc() * 100}%"></div>
				</div>
				<div class="pmeta">
					<span>{enc() < 1 ? 'encoding' : 'done'}</span>
					<span><b>{Math.round(enc() * 100)}</b>%</span>
				</div>
				<div class="specs">
					{#each specs as [k, v], si}
						<div class="spec" style:opacity={specIn(si)} style:transform="translateY({(1 - specIn(si)) * 10}px)">
							<span class="sk">{k}</span><span class="sv">{v}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Caption under the panel -->
		<div
			class="cap"
			style:left="{xOf(i)}px"
			style:opacity={clip.p(`${STAGES[i]}+0.2`, 0.5)}
			style:transform="translateY({(1 - clip.p(`${STAGES[i]}+0.2`, 0.7, 'expo.out')) * 16}px)"
		>
			<div class="num" style:color={active(i) > 0.5 ? Y : '#6d6d76'}>{pnl.num}</div>
			<div>
				<div class="label">{pnl.label}</div>
				<div class="sub">{pnl.sub}</div>
			</div>
		</div>
	{/each}

	<!-- Outro -->
	<div class="outro" style:opacity={clip.p('outro', 0.6)} style:transform="translateY({(1 - clip.p('outro', 0.8, 'expo.out')) * 20}px)">
		Same JSON in, <span class="y">same pixels out</span>, every render.
	</div>
</div>

<style>
	.stage {
		position: absolute; inset: 0; width: 1920px; height: 1080px; overflow: hidden;
		background: radial-gradient(90% 80% at 50% 40%, #16161a 0%, #0b0b0d 70%);
		color: #f2f2f0; font-family: Inter, sans-serif;
	}
	.grid {
		position: absolute; inset: 0;
		background-image: linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
		background-size: 48px 48px;
		-webkit-mask-image: radial-gradient(80% 70% at 50% 50%, #000 30%, transparent 100%);
	}
	.y { color: #ffe100; }
	.header { position: absolute; left: 100px; top: 84px; }
	.kicker {
		font: 600 20px/1 'JetBrains Mono', monospace; letter-spacing: 0.18em; color: #ffe100;
		display: flex; align-items: center; gap: 14px;
	}
	.dot { width: 10px; height: 10px; background: #ffe100; border-radius: 2px; }
	h1 { margin: 22px 0 0; font: 700 68px/1.05 Bricolage, sans-serif; letter-spacing: -0.02em; }

	.slot {
		position: absolute; width: 362px; height: 520px; box-sizing: border-box; border: 2px dashed #2c2c33; border-radius: 18px;
		display: flex; align-items: center; justify-content: center;
		font: 700 96px/1 'JetBrains Mono', monospace; color: #1f1f25;
	}
	.arrow { position: absolute; width: 66px; height: 0; }
	.shaft { position: absolute; left: 0; top: -2px; width: 56px; height: 4px; background: #ffe100; transform-origin: 0 50%; border-radius: 2px; }
	.head {
		position: absolute; left: 52px; top: -9px; width: 0; height: 0;
		border-left: 14px solid #ffe100; border-top: 9px solid transparent; border-bottom: 9px solid transparent;
	}
	.packet {
		position: absolute; top: -9px; width: 18px; height: 18px; border-radius: 4px; background: #fff7b0;
		box-shadow: 0 0 18px 6px rgba(255, 225, 0, 0.55);
	}

	.panel {
		position: absolute; width: 362px; height: 520px; box-sizing: border-box; padding: 22px 24px;
		background: linear-gradient(180deg, #17171b 0%, #121215 100%);
		border: 1.5px solid #2a2a31; border-radius: 18px; transform-origin: 50% 60%;
	}
	.ring {
		position: absolute; inset: -1.5px; border-radius: 18px; border: 2.5px solid #ffe100;
		box-shadow: 0 0 46px rgba(255, 225, 0, 0.18), inset 0 0 30px rgba(255, 225, 0, 0.05);
	}
	.ptag {
		display: flex; justify-content: space-between; align-items: center;
		font: 500 15px/1 'JetBrains Mono', monospace; color: #8a8a93; padding-bottom: 14px;
		border-bottom: 1px solid #26262c; margin-bottom: 16px;
	}
	.led { width: 9px; height: 9px; border-radius: 50%; }
	.foot {
		position: absolute; left: 24px; right: 24px; bottom: 18px;
		font: 500 13.5px/1 'JetBrains Mono', monospace; color: #6d6d76; white-space: nowrap;
	}

	/* 01 */
	.code { font: 500 16px/1 'JetBrains Mono', monospace; }
	.line { position: relative; height: 31px; display: flex; align-items: center; white-space: pre; }
	.hl { position: absolute; left: -10px; right: -10px; top: 0; bottom: 0; background: rgba(255, 225, 0, 0.16); border-left: 3px solid #ffe100; border-radius: 3px; }
	.ln { position: relative; flex: 0 0 26px; width: 26px; color: #4a4a52; font-size: 13px; }
	.line > span { position: relative; }
	.k { color: #b9b9c2; }
	.p { color: #6d6d76; }
	.s { color: #fff3a0; }
	.n { color: #ffe100; }
	.hot .k, .hot .s { color: #ffffff; font-weight: 700; }

	/* 02 */
	.cards { display: flex; flex-direction: column; gap: 16px; }
	.card {
		height: 118px; box-sizing: border-box; padding: 0 16px 0 18px; display: flex; align-items: center; justify-content: space-between;
		background: #1c1c21; border: 1px solid #2e2e36; border-left: 4px solid #ffe100; border-radius: 12px;
	}
	.ctag { font: 700 21px/1 'JetBrains Mono', monospace; color: #ffe100; }
	.cfile { margin-top: 10px; font: 500 15px/1 Inter, sans-serif; color: #8a8a93; }
	.mini {
		position: relative; width: 112px; height: 64px; box-sizing: border-box; padding: 12px;
		background: #0e0e10; border: 1px solid #2a2a31; border-radius: 6px; overflow: hidden;
	}
	.tbar { height: 9px; border-radius: 2px; background: #f2f2f0; margin-bottom: 7px; }
	.tbar.thin { height: 6px; background: #6d6d76; }
	.chart { position: absolute; left: 14px; right: 14px; bottom: 10px; top: 10px; display: flex; align-items: flex-end; gap: 7px; }
	.bar { flex: 1; background: #ffe100; border-radius: 2px 2px 0 0; }
	.pill {
		position: absolute; left: 10px; right: 10px; top: 20px; height: 24px; border-radius: 12px; background: #f2f2f0;
		display: flex; align-items: center; justify-content: center; gap: 5px; font: 800 11px/1 Inter, sans-serif; color: #0b0b0d;
	}
	.w.on { background: #ffe100; padding: 2px 4px; border-radius: 4px; }

	/* 03 */
	.frame {
		position: relative; height: 176px; border-radius: 8px; background: #0b0b0d; border: 1px solid #2e2e36; overflow: hidden;
	}
	.ft { position: absolute; left: 20px; top: 20px; width: 160px; }
	.ft .tbar { height: 14px; margin-bottom: 9px; }
	.ft .tbar.thin { height: 8px; }
	.fchart { position: absolute; right: 22px; top: 22px; bottom: 54px; width: 110px; display: flex; align-items: flex-end; gap: 8px; }
	.fcap {
		position: absolute; left: 50%; bottom: 14px; margin-left: -70px; width: 140px; height: 28px; border-radius: 14px; background: #f2f2f0;
		display: flex; align-items: center; justify-content: center; gap: 6px; font: 800 13px/1 Inter, sans-serif; color: #0b0b0d;
	}
	.counter {
		display: flex; justify-content: space-between; margin: 12px 0 16px;
		font: 500 15px/1 'JetBrains Mono', monospace; color: #8a8a93;
	}
	.counter b { color: #ffe100; font-weight: 700; }
	.tl { position: relative; }
	.ruler { position: relative; height: 30px; border-bottom: 1px solid #34343c; margin-bottom: 8px; }
	.tick { position: absolute; bottom: 0; width: 1px; height: 6px; background: #44444c; }
	.tick.major { height: 12px; background: #77777f; }
	.tlab { position: absolute; top: 0; transform: translateX(-50%); font: 500 12px/1 'JetBrains Mono', monospace; color: #6d6d76; }
	.tlab.t0 { transform: none; }
	.track { position: relative; height: 22px; margin-bottom: 6px; background: #18181c; border-radius: 4px; }
	.seg {
		position: absolute; top: 0; bottom: 0; box-sizing: border-box; padding-left: 8px; border-radius: 4px;
		background: #2b2a1c; border: 1px solid #6b6100; color: #ffe100; font: 600 12px/20px Inter, sans-serif; white-space: nowrap;
	}
	.strip { display: flex; gap: 6px; margin-top: 10px; }
	.thumb { position: relative; flex: 1; height: 30px; background: #0b0b0d; border: 1px solid #3a3a42; border-radius: 3px; overflow: hidden; }
	.tt { position: absolute; left: 4px; top: 5px; height: 4px; background: #f2f2f0; }
	.tc { position: absolute; right: 4px; bottom: 4px; width: 18px; height: 16px; display: flex; align-items: flex-end; gap: 1px; }
	.tc div { flex: 1; background: #ffe100; }
	.playhead {
		position: absolute; top: -6px; bottom: -6px; width: 2px; margin-left: -1px; background: #ffe100;
		box-shadow: 0 0 12px rgba(255, 225, 0, 0.8);
	}
	.playhead::before {
		content: ''; position: absolute; top: 0; left: -6px; width: 0; height: 0;
		border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 9px solid #ffe100;
	}

	/* 04 */
	.file { position: relative; width: 150px; height: 188px; margin: 12px auto 0; }
	.fbody {
		position: absolute; inset: 0; background: #1f1f25; border: 2px solid #3a3a42; border-radius: 12px;
		clip-path: polygon(0 0, 72% 0, 100% 22%, 100% 100%, 0 100%);
	}
	.fold {
		position: absolute; right: 0; top: 0; width: 42px; height: 42px; z-index: 1;
		background: linear-gradient(225deg, transparent 50%, #3a3a42 50%); border-bottom-left-radius: 8px;
	}
	.flabel {
		position: absolute; left: 0; right: 0; bottom: 22px; text-align: center;
		font: 800 34px/1 Bricolage, sans-serif; color: #ffe100; letter-spacing: 0.02em;
	}
	.play {
		position: absolute; left: 58px; top: 58px; width: 0; height: 0;
		border-left: 38px solid #f2f2f0; border-top: 23px solid transparent; border-bottom: 23px solid transparent;
	}
	.check {
		position: absolute; right: -20px; bottom: -14px; width: 52px; height: 52px; border-radius: 50%; background: #ffe100;
		display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(255, 225, 0, 0.5); z-index: 2;
	}
	.fname { margin-top: 22px; text-align: center; font: 600 19px/1 'JetBrains Mono', monospace; color: #f2f2f0; }
	.prog { margin-top: 20px; height: 10px; border-radius: 5px; background: #26262c; overflow: hidden; }
	.fill { height: 100%; background: #ffe100; border-radius: 5px; }
	.pmeta { display: flex; justify-content: space-between; margin-top: 10px; font: 500 14px/1 'JetBrains Mono', monospace; color: #8a8a93; }
	.pmeta b { color: #ffe100; }
	.specs { margin-top: 18px; }
	.spec {
		display: flex; justify-content: space-between; padding: 7px 0; border-top: 1px solid #26262c;
		font: 500 15px/1.2 'JetBrains Mono', monospace;
	}
	.sk { color: #6d6d76; }
	.sv { color: #f2f2f0; }

	.cap { position: absolute; top: 836px; width: 362px; display: flex; gap: 14px; }
	.num { font: 700 22px/34px 'JetBrains Mono', monospace; }
	.label { font: 700 30px/34px Bricolage, sans-serif; letter-spacing: -0.01em; }
	.sub { margin-top: 6px; font: 400 18px/1.3 Inter, sans-serif; color: #8a8a93; }

	.outro {
		position: absolute; left: 0; right: 0; top: 972px; text-align: center;
		font: 600 30px/1 Bricolage, sans-serif; color: #f2f2f0; letter-spacing: -0.01em;
	}
</style>
