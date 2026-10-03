<script>
  import { useClip } from 'visualfries/motion';
  import Artwork from './Artwork.svelte';
  const clip = useClip();
  const stages = [
    { title: 'JSON document', sub: 'Define the project', at: 'document', x: 105, file: 'project.vf.json' },
    { title: 'Svelte blocks', sub: 'Build the visuals', at: 'blocks', x: 555, file: 'blocks/' },
    { title: 'Frames on a timeline', sub: 'Render every moment', at: 'frames', x: 1005, file: 'frame sequence' },
    { title: 'Encoded MP4', sub: 'Ready to play', at: 'mp4', x: 1455, file: 'out.mp4' }
  ];
  const beats = [
    { at: 0.6, until: 2.5, lead: 'Describe it.', copy: 'JSON sets the blocks, timing and style.' },
    { at: 2.85, until: 5.05, lead: 'Build it.', copy: 'Svelte turns those instructions into visuals.' },
    { at: 5.45, until: 7.9, lead: 'Render it.', copy: 'Each moment becomes a frame on the timeline.' },
    { at: 8.3, until: 9.8, lead: 'Encode it.', copy: 'The frames are combined into an MP4.' },
    { at: 10, until: 13, lead: 'Play it.', copy: 'One project. Every frame. A finished video.' }
  ];
  const arrive = (at, duration = 0.7) => clip.p(at, duration, 'expo.out');
  const flow = (at) => clip.p(at, 0.65, 'power3.inOut');
  const code = [
    { text: '{', type: 'brace' },
    { key: 'size', value: '[1920, 1080],' },
    { key: 'fps', value: '30,' },
    { key: 'clips', value: '[{' },
    { key: 'block', value: '"Main.svelte",', inset: true },
    { key: 'until', value: '12', inset: true },
    { text: '  }]', type: 'brace' },
    { text: '}', type: 'brace' }
  ];
  const encode = () => clip.p('mp4+0.35', 1.2, 'power2.inOut');
</script>

<div class="scene">
  <div class="ambient" style:opacity={0.45 + clip.p('complete', 0.7) * 0.35}></div>
  <div class="top" style:opacity={arrive(0, 0.55)} style:transform="translateY({(1 - arrive(0, 0.75)) * 22}px)">
    <div class="brand"><span class="mark"><i></i><i></i><i></i></span>VisualFries<span class="divider"></span><span class="eyebrow">THE RENDER PIPELINE</span></div>
    <h1>From <span class="outlined">JSON</span> to <span class="yellow">MP4.</span></h1>
    <p class="intro">Your video project, brought to life.</p>
  </div>
  <div class="top-right" style:opacity={arrive(0.3)}>
    <span class="status-dot"></span>
    <span>{clip.after('complete') ? 'RENDER COMPLETE' : 'PROJECT → VIDEO'}</span>
  </div>

  {#each stages as stage, i}
    {@const p = arrive(stage.at)}
    {@const base = arrive(0.2 + i * 0.09)}
    <div class="stage" style:left="{stage.x}px" style:opacity={base} style:transform="translateY({(1 - base) * 26}px)">
      <div class="panel" style:border-color="rgba(255,225,0,{0.06 + p * 0.45})" style:background="rgba(27,30,29,{0.65 + p * 0.35})">
        <div class="window-head"><span class="file-dot" style:background={p > 0.8 ? '#ffe100' : '#59605b'}></span>{stage.file}<span class="window-index">0{i + 1}</span></div>
        <div class="panel-content" style:opacity={0.13 + p * 0.87}>
          {#if i === 0}
            <div class="code">
              {#each code as line, n}
                <div class="code-line" style:opacity={arrive(0.75 + n * 0.11, 0.4)} style:transform="translateX({(1 - arrive(0.75 + n * 0.11, 0.45)) * 12}px)">
                  <span class="line-number">{n + 1}</span>
                  {#if line.key}<span class="code-indent" class:deep={line.inset}><span class="key">"{line.key}"</span><span class="colon">: </span><span class="value">{line.value}</span></span>{:else}<span class="brace">{line.text}</span>{/if}
                </div>
              {/each}
            </div>
            <div class="valid" style:opacity={arrive(1.85)}><span>✓</span> PROJECT DEFINED</div>
          {:else if i === 1}
            <div class="blocks" style:opacity={clip.out('blocks+1.4', 0.35)} style:transform="scale({1 - clip.p('blocks+1.4', 0.35) * 0.08})">
              <div class="tile type" style:opacity={arrive('blocks+0.1')} style:transform="translate({(1 - arrive('blocks+0.1')) * -45}px,{(1 - arrive('blocks+0.1')) * 20}px) rotate({(1 - arrive('blocks+0.1')) * -8}deg)"><span class="tile-name">Title.svelte</span><strong>Aa</strong><span class="tile-foot">TYPE</span></div>
              <div class="tile shape" style:opacity={arrive('blocks+0.35')} style:transform="translateY({(1 - arrive('blocks+0.35')) * -42}px)"><span class="tile-name">Shape.svelte</span><div class="ring"></div></div>
              <div class="tile motion" style:opacity={arrive('blocks+0.6')} style:transform="translateY({(1 - arrive('blocks+0.6')) * 42}px)"><span class="tile-name">Motion.svelte</span><svg viewBox="0 0 100 32"><path d="M4 28 C35 28 45 4 96 4" stroke="#ffe100" stroke-width="3" fill="none"/><circle cx={4 + 92 * clip.p('blocks+0.8', 0.8, 'power2.inOut')} cy={28 - 24 * clip.p('blocks+0.8', 0.8, 'power2.inOut')} r="4" fill="#fff"/></svg></div>
            </div>
            <div class="assembled-preview" style:opacity={clip.p('blocks+1.55', 0.4)} style:transform="scale({0.92 + arrive('blocks+1.55', 0.65) * 0.08})"><Artwork phase={clip.p('blocks+1.55', 0.65)}/></div>
            <div class="valid" style:opacity={arrive('blocks+1.1')}><span>✓</span> VISUALS ASSEMBLED</div>
          {:else if i === 2}
            <div class="timeline">
              <div class="frame-count"><span>FRAME</span><strong>{String(Math.round(360 * clip.p('frames+0.1', 1.65, 'none'))).padStart(3, '0')}<small> / 360</small></strong></div>
              <div class="film">
                {#each [0, 1, 2, 3] as f}
                  <div class="film-frame" style:opacity={arrive(`frames+${0.15 + f * 0.22}`, 0.4)} style:transform="translateY({(1 - arrive(`frames+${0.15 + f * 0.22}`, 0.45)) * 24}px)"><Artwork phase={f / 3} compact={true}/><span>{String(f * 90).padStart(3, '0')}</span></div>
                {/each}
              </div>
              <div class="track"><div style:width="{clip.p('frames+0.1', 1.65, 'none') * 100}%"></div></div>
              <div class="playhead" style:left="{20 + clip.p('frames+0.1', 1.65, 'none') * 298}px"><span></span></div>
              <div class="ticks">{#each Array(13) as _, j}<i class:major={j % 3 === 0}></i>{/each}</div>
              <div class="time-labels"><span>00:00</span><span>00:12</span></div>
            </div>
            <div class="valid" style:opacity={arrive('frames+1.85')}><span>✓</span> 360 FRAMES RENDERED</div>
          {:else}
            <div class="video-preview" style:transform="scale({0.9 + p * 0.1})">
              <Artwork phase={clip.p('mp4', 1.5, 'power3.out')}/>
              <div class="play" style:opacity={arrive('complete', 0.4)}><svg viewBox="0 0 30 30"><path d="M10 6L25 15L10 24Z" fill="#ffe100"/></svg></div>
            </div>
            <div class="encoding"><span>{clip.after('complete') ? 'H.264 / MP4' : 'ENCODING'}</span><strong>{Math.round(encode() * 100)}%</strong></div>
            <div class="encode-track"><div style:width="{encode() * 100}%"></div></div>
            <div class="valid" style:opacity={arrive('complete')}><span>✓</span> EXPORT COMPLETE</div>
          {/if}
        </div>
      </div>
      <div class="label"><span class="number" style:color={p > 0.8 ? '#ffe100' : '#737b76'}>0{i + 1}</span><h2>{stage.title}</h2></div>
      <p class="stage-sub">{stage.sub}</p>
    </div>
  {/each}

  <svg class="connections" viewBox="0 0 1920 1080">
    {#each ['compile', 'capture', 'encode'] as at, i}
      {@const x = 479 + i * 450}
      <path d="M{x} 544H{x + 55}" stroke="#3c433e" stroke-width="2" />
      <path d="M{x + 48} 537L{x + 55} 544L{x + 48} 551" stroke="#3c433e" stroke-width="2" fill="none"/>
      <path d="M{x} 544H{x + 55}" stroke="#ffe100" stroke-width="3" pathLength="1" stroke-dasharray="1" stroke-dashoffset={1 - flow(at)} />
      <path d="M{x + 48} 537L{x + 55} 544L{x + 48} 551" stroke="#ffe100" stroke-width="3" fill="none" opacity={clip.p(`${at}+0.45`, 0.2)} />
      <circle cx={x + 55 * flow(at)} cy="544" r="5" fill="#ffe100" opacity={clip.p(at, 0.1) * clip.out(`${at}+0.55`, 0.2)}/>
      <text x={x + 27} y="585" text-anchor="middle" fill="#8b948d" font-family="JetBrains Mono" font-size="14" opacity={clip.p(`${at}+0.5`, 0.3)}>{['BUILD','RENDER','ENCODE'][i]}</text>
    {/each}
  </svg>

  <div class="bottom" style:opacity={arrive(0.55)}>
    <div class="bottom-line"></div>
    {#each beats as beat}
      {@const p = clip.p(beat.at, 0.3) * clip.out(beat.until, 0.18)}
      <div class="beat" style:opacity={p} style:transform="translateY({(1 - clip.p(beat.at, 0.55, 'power3.out')) * 14}px)"><span>{beat.lead}</span><p>{beat.copy}</p></div>
    {/each}
    <div class="end-badge" style:opacity={arrive('complete')} style:transform="translateY({(1 - arrive('complete')) * 20}px)"><span>✓</span>out.mp4</div>
  </div>
  <div class="progress">{#each stages as stage, i}<span style:background={clip.after(stage.at) ? '#ffe100' : '#303731'}></span>{/each}</div>
</div>

<style>
  :global(*) { box-sizing: border-box; }
  .scene { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #101212; color: #f5f5ed; font-family: 'Inter', sans-serif; }
  .ambient { position: absolute; inset: 0; background: radial-gradient(ellipse at 67% 50%, #282b20 0%, transparent 67%); }
  .top { position: absolute; left: 105px; top: 84px; }
  .brand { display: flex; align-items: center; gap: 15px; font-family: 'Bricolage'; font-size: 28px; font-weight: 700; }
  .mark { display: flex; gap: 4px; align-items: flex-end; width: 29px; height: 29px; transform: rotate(-12deg); }
  .mark i { width: 7px; height: 26px; background: #ffe100; border-radius: 1px; }
  .mark i:nth-child(2) { height: 20px; }.mark i:nth-child(3) { height: 29px; }
  .divider { width: 1px; height: 24px; margin: 0 10px; background: #465047; }
  .eyebrow { color: #9ca79e; font: 15px 'JetBrains Mono'; letter-spacing: 2px; }
  h1 { font: 750 96px/1.12 'Bricolage'; letter-spacing: -4px; margin: 34px 0 13px; }
  .yellow { color: #ffe100; }.outlined { color: #f5f5ed; }
  .intro { font-size: 28px; color: #aab3ad; margin: 0; letter-spacing: -.5px; }
  .top-right { position: absolute; right: 105px; top: 97px; display: flex; align-items: center; gap: 12px; font: 15px 'JetBrains Mono'; color: #b6beb6; letter-spacing: 1px; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #ffe100; }
  .stage { position: absolute; top: 386px; width: 360px; }
  .panel { height: 334px; border: 1px solid; border-radius: 17px; overflow: hidden; box-shadow: 0 20px 40px #0003; }
  .window-head { height: 48px; display: flex; align-items: center; gap: 10px; padding: 0 20px; background: #ffffff04; border-bottom: 1px solid #ffffff0d; font: 15px 'JetBrains Mono'; color: #b7bfb8; }
  .file-dot { width: 6px; height: 6px; border-radius: 50%; }.window-index { margin-left: auto; color: #59635c; font-size: 13px; }
  .panel-content { position: relative; height: 285px; }
  .code { padding: 22px 10px 0 18px; font: 16px/25px 'JetBrains Mono'; }
  .code-line { display: flex; white-space: pre; height: 25px; }.line-number { width: 25px; color: #616b63; font-size: 12px; }.code-indent { padding-left: 12px; }.code-indent.deep { padding-left: 28px; }.key { color: #ffe100; }.colon,.brace { color: #c8d0c8; }.value { color: #c4cec4; }
  .valid { position: absolute; bottom: 14px; left: 20px; display: flex; align-items: center; gap: 8px; font: 11px 'JetBrains Mono'; letter-spacing: 1.1px; color: #abb7ab; }.valid span { color: #ffe100; font-size: 15px; }
  .blocks { position: absolute; inset: 22px 20px 55px; display: grid; grid-template-columns: 149px 1fr; grid-template-rows: 96px 96px; gap: 10px; }
  .assembled-preview { position: absolute; top: 28px; left: 20px; width: 318px; height: 179px; border-radius: 9px; overflow: hidden; }.assembled-preview :global(svg) { display: block; width: 100%; height: 100%; }
  .tile { position: relative; border-radius: 8px; border: 1px solid #555e47; padding: 12px; overflow: hidden; }.tile-name { font: 12px 'JetBrains Mono'; }.type { grid-row: span 2; background: #ffe100; color: #171c13; border: 0; }.type strong { display: block; font: 750 83px 'Bricolage'; margin-top: 11px; letter-spacing: -6px; }.tile-foot { position: absolute; bottom: 12px; font: 12px 'JetBrains Mono'; letter-spacing: 3px; }.shape,.motion { background: #272e25; color: #bbc4b9; }.ring { width: 40px; height: 40px; border: 10px solid #ffe100; border-radius: 50%; margin: 10px auto; }.motion svg { display: block; width: 115px; margin: 14px auto; }
  .timeline { position: relative; padding: 26px 20px; }.frame-count { display: flex; justify-content: space-between; align-items: center; font: 12px 'JetBrains Mono'; color: #a2ada3; }.frame-count strong { color: #ffe100; font-size: 21px; font-weight: 500; }.frame-count small { font-size: 12px; color: #758177; }.film { display: flex; gap: 5px; margin-top: 34px; padding: 7px 0; border-top: 3px dotted #56604c; border-bottom: 3px dotted #56604c; }.film-frame { width: 76px; flex-shrink: 0; background: #11180f; border-radius: 3px; overflow: hidden; }.film-frame :global(svg) { display: block; width: 76px; height: 44px; }.film-frame span { display: block; font: 10px 'JetBrains Mono'; text-align: center; color: #7e8c7c; padding: 4px; }
  .track { height: 15px; background: #343d2b; margin-top: 14px; border-radius: 3px; overflow: hidden; }.track div { height: 100%; background: #ffe100; }.playhead { position: absolute; top: 65px; width: 2px; height: 139px; background: #f0f5e4; }.playhead span { position: absolute; left: -5px; top: 0; width: 12px; height: 9px; background: #f0f5e4; clip-path: polygon(0 0,100% 0,100% 50%,50% 100%,0 50%); }.ticks { display: flex; justify-content: space-between; margin-top: 12px; }.ticks i { height: 5px; width: 1px; background: #596751; }.ticks i.major { height: 9px; }.time-labels { display: flex; justify-content: space-between; font: 11px 'JetBrains Mono'; color: #84907e; margin-top: 5px; }
  .video-preview { position: absolute; top: 22px; left: 20px; width: 318px; height: 179px; border-radius: 9px; overflow: hidden; }.video-preview :global(svg) { width: 100%; height: 100%; display: block; }.play { position: absolute; left: 131px; top: 61px; width: 57px; height: 57px; border-radius: 50%; background: #101510; padding: 12px; border: 1px solid #ffe100; }.encoding { position: absolute; top: 216px; left: 20px; right: 20px; display: flex; justify-content: space-between; font: 11px 'JetBrains Mono'; color: #a6b1a5; letter-spacing: 1px; }.encoding strong { color: #ffe100; font-weight: 500; }.encode-track { position: absolute; top: 239px; height: 3px; left: 20px; right: 20px; background: #414933; }.encode-track div { height: 100%; background: #ffe100; }
  .label { display: flex; align-items: baseline; gap: 11px; margin-top: 24px; }.number { font: 14px 'JetBrains Mono'; }h2 { font: 650 29px/1.2 'Bricolage'; letter-spacing: -.8px; margin: 0; white-space: nowrap; }.stage-sub { font: 19px 'Inter'; color: #88938a; margin: 9px 0 0 33px; }
  .connections { position: absolute; inset: 0; width: 1920px; height: 1080px; pointer-events: none; }
  .bottom { position: absolute; left: 105px; top: 864px; width: 1710px; height: 118px; }.bottom-line { width: 100%; height: 1px; background: #394239; }.beat { position: absolute; left: 0; top: 30px; display: flex; gap: 22px; align-items: baseline; }.beat>span { font: 700 34px 'Bricolage'; color: #ffe100; letter-spacing: -.8px; }.beat p { font: 23px 'Inter'; color: #bac3b8; margin: 0; letter-spacing: -.4px; }.end-badge { position: absolute; right: 0; top: 27px; display: flex; align-items: center; gap: 14px; background: #ffe100; color: #151b11; font: 600 21px 'JetBrains Mono'; padding: 12px 23px; border-radius: 8px; }.end-badge span { font: 600 23px 'Inter'; }
  .progress { position: absolute; left: 105px; bottom: 47px; display: flex; gap: 7px; }.progress span { height: 3px; width: 50px; border-radius: 2px; }
</style>
