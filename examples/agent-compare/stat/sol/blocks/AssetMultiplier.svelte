<script>
  import { Footage, useClip } from 'visualfries/motion';
  const clip = useClip();
  const items = [
    { count: '1', lines: ['Reel'] },
    { count: '5', lines: ['Caption', 'styles'] },
    { count: '1', lines: ['Cover'] },
    { count: '1', lines: ['Quote', 'card'] },
    { count: '5', lines: ['Carousel', 'slides'] }
  ];
  const enter = (at, distance = 36, duration = 0.55) => `translateY(${(1 - clip.p(at, duration, 'power3.out')) * distance}px)`;
</script>

<div class="post">
  <div class="topline" style:opacity={clip.p(0, 0.45)} style:transform={enter(0, -20)}>
    <div class="brand">
      <svg class="mark" viewBox="0 0 44 44" aria-hidden="true">
        <path d="M5 12H13L17 35H9Z M18 5H26L30 35H22Z M31 10H39L43 35H35Z" fill="currentColor" />
      </svg>
      <span>VisualFries</span>
    </div>
    <span class="eyebrow">CONTENT, MULTIPLIED.</span>
  </div>

  <div class="headline">
    <div class="line-mask"><div style:transform={enter('headline', 115)} style:opacity={clip.p('headline', 0.35)}>One take</div></div>
    <div class="line-mask"><div class="becomes" style:transform={enter('headline+0.13', 110)} style:opacity={clip.p('headline+0.13', 0.35)}>becomes</div></div>
  </div>

  <div class="hero">
    <div class="orbit" style:opacity={clip.p('speaker', 0.65)} style:transform="scale({0.6 + clip.p('speaker', 0.7, 'power3.out') * 0.4})"></div>
    <div class="number" style:opacity={clip.p('number', 0.3)} style:transform="translateY({(1 - clip.p('number', 0.7, 'power4.out')) * 100}px) scale({0.72 + clip.p('number', 0.7, 'back.out(1.2)') * 0.28})">13</div>
    <div class="speaker" style:opacity={clip.p('speaker', 0.5)} style:transform="translateX({(1 - clip.p('speaker', 0.75, 'power3.out')) * 190}px) rotate({(1 - clip.p('speaker', 0.75)) * 5}deg)">
      <Footage name="talk" layer="subject" offset={Math.min(0, 2.8 - clip.t)} class="person" />
    </div>
    <svg class="spark" viewBox="0 0 90 90" style:opacity={clip.p('speaker+0.2', 0.35)} style:transform="rotate({-35 + clip.p('speaker+0.2', 0.7) * 35}deg) scale({clip.p('speaker+0.2', 0.65, 'back.out(1.4)')})" aria-hidden="true">
      <path d="M45 0L52 32L76 13L58 39L90 45L58 52L76 77L52 58L45 90L38 58L13 77L32 52L0 45L32 39L13 13L38 32Z" fill="#ffe100" />
    </svg>
  </div>

  <div class="result" style:opacity={clip.p('finished', 0.45)} style:transform={enter('finished', 70, 0.65)}>
    <span>finished assets.</span>
    <svg viewBox="0 0 100 62" class="arrow" aria-hidden="true"><path d="M3 31H91M64 4L92 31L64 58" fill="none" stroke="currentColor" stroke-width="8" /></svg>
  </div>

  <div class="ledger">
    <div class="rule" style:transform="scaleX({clip.p('breakdown', 0.65, 'power3.out')})"></div>
    <div class="items">
      {#each items as item, i}
        <div class="item" style:opacity={clip.p(1.9 + i * 0.12, 0.4)} style:transform={enter(1.9 + i * 0.12, 38, 0.47)}>
          <div class="count">{item.count}</div>
          <div class="label">{#each item.lines as line}<div>{line}</div>{/each}</div>
        </div>
      {/each}
    </div>
    <div class="bottom-rule" style:opacity={clip.p(2.5, 0.3)}></div>
  </div>
</div>

<style>
  :global(*) { box-sizing: border-box; }
  .post { position: relative; width: 1080px; height: 1350px; overflow: hidden; background: #101110; color: #f5f3eb; font-family: 'Bricolage', sans-serif; }
  .topline { position: absolute; left: 58px; right: 58px; top: 48px; display: flex; align-items: center; justify-content: space-between; }
  .brand { display: flex; gap: 13px; align-items: center; font-size: 34px; font-weight: 800; letter-spacing: -1.4px; }
  .mark { width: 39px; height: 39px; color: #ffe100; }
  .eyebrow { font-family: 'Mono', monospace; color: #afafa7; font-size: 16px; font-weight: 500; letter-spacing: 1.2px; }
  .headline { position: absolute; left: 57px; top: 145px; font-size: 106px; line-height: 1.01; font-weight: 800; letter-spacing: -5px; }
  .line-mask { overflow: hidden; padding-bottom: 8px; }
  .becomes { color: #f5f3eb; }
  .hero { position: absolute; inset: 0; }
  .number { position: absolute; left: 46px; top: 344px; color: #ffe100; font-family: 'Anton', sans-serif; font-size: 580px; line-height: 0.98; letter-spacing: -22px; transform-origin: 270px 320px; }
  .orbit { position: absolute; left: 570px; top: 407px; width: 466px; height: 466px; border: 1px solid #565238; border-radius: 50%; background: radial-gradient(ellipse at center, #ffe10015, transparent 69%); }
  .speaker { position: absolute; left: 470px; top: 361px; width: 650px; height: 702px; transform-origin: 60% 90%; mask-image: linear-gradient(to bottom, black 54%, transparent 92%); }
  .speaker :global(.person) { width: 650px; height: 702px; display: block; filter: drop-shadow(-8px 2px 0px #ffe100) drop-shadow(0px 14px 18px #00000060); }
  .spark { position: absolute; top: 350px; right: 65px; width: 65px; height: 65px; }
  .result { position: absolute; left: 58px; right: 58px; top: 925px; display: flex; align-items: center; justify-content: space-between; font-weight: 800; font-size: 77px; letter-spacing: -4px; line-height: 1.1; }
  .arrow { width: 94px; height: 58px; color: #ffe100; margin-top: 9px; }
  .ledger { position: absolute; left: 58px; right: 58px; top: 1065px; }
  .rule { height: 3px; background: #ffe100; transform-origin: left; }
  .items { display: grid; grid-template-columns: repeat(5, 1fr); margin-top: 32px; }
  .item { padding-left: 25px; border-left: 1px solid #3a3b35; min-height: 155px; }
  .item:first-child { padding-left: 0; border-left: none; }
  .count { font-family: 'Bricolage', sans-serif; color: #ffe100; font-size: 59px; font-weight: 800; line-height: 1; }
  .label { margin-top: 14px; font-family: 'Inter', sans-serif; font-size: 30px; font-weight: 600; line-height: 1.24; letter-spacing: -0.5px; }
  .bottom-rule { height: 1px; background: #3a3b35; margin-top: 32px; }
</style>
