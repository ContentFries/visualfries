<script>
  import { useClip } from 'visualfries/motion';
  import Frame from './Frame.svelte';
  import Week from './Week.svelte';
  const clip = useClip();
  const rise = (at) => `translateY(${(1-clip.p(at,.44,'power3.out'))*155}px)`;
</script>

<Frame number={1}>
  <div class="kicker" style:opacity={clip.p(.05,.4)}>A BETTER WAY TO REPURPOSE</div>
  <h1 aria-label={clip.props.title}>
    <div class="how" style:opacity={clip.p(.08,.35)} style:transform={rise(.08)}>How to turn</div>
    <div class="reveal-line"><div class="talking" style:transform={rise(.14)}>ONE TALKING-</div></div>
    <div class="reveal-line"><div class="head" style:transform={rise(.2)}>HEAD TAKE</div></div>
    <div class="reveal-line"><div class="into" style:transform={rise(.27)}>into a week</div></div>
    <div class="reveal-line"><div class="content" style:transform={rise(.34)}>of content.</div></div>
  </h1>
  <div class="diagram" style:opacity={clip.p(.4,.26)}>
    <div class="label mono">ONE SOURCE</div>
    <div class="source" style:transform="rotate({-5 * clip.p(.4,.4)}deg)"><span>1</span><div class="mono">TAKE</div></div>
    <svg class="arrow" viewBox="0 0 190 70" style:transform="scaleX({clip.p(.46,.3)})" aria-hidden="true"><path d="M2 35H177M147 6l30 29-30 29" fill="none" stroke="currentColor" stroke-width="5"/></svg>
    <div class="days-label mono">SEVEN DAYS</div>
    <div class="days"><Week at={.44}/></div>
  </div>
</Frame>

<style>
  h1 {position:absolute;left:72px;top:233px;width:936px;}
  .how {font-size:73px;font-weight:600;line-height:1.15;letter-spacing:-3.5px;margin-bottom:17px;}
  .talking {font-family:'Anton';font-size:139px;letter-spacing:-3px;line-height:1.1;}
  .head {font-family:'Anton';font-size:168px;letter-spacing:-3px;line-height:1.04;}
  .into,.content {font-size:109px;letter-spacing:-5.5px;font-weight:800;line-height:1.03;}
  .into {margin-top:21px;}
  .diagram {position:absolute;left:72px;top:989px;width:936px;height:228px;border-top:2px solid var(--ink);padding-top:23px;}
  .label,.days-label {font-size:18px;letter-spacing:.2px;}
  .source {position:absolute;top:61px;left:9px;width:132px;height:145px;background:var(--ink);color:var(--yellow);padding:3px 16px;}
  .source span {font-family:'Anton';font-size:85px;line-height:1.25;}
  .source .mono {font-size:18px;}
  .arrow {position:absolute;top:97px;left:164px;width:133px;height:65px;transform-origin:left;}
  .days-label {position:absolute;top:23px;left:327px;}
  .days {position:absolute;left:327px;top:60px;width:609px;}
</style>
