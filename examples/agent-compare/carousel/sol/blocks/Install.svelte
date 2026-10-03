<script>
  import { useClip } from 'visualfries/motion';
  import Frame from './Frame.svelte';
  import Week from './Week.svelte';
  const clip = useClip();
</script>

<Frame number={5}>
  <div class="kicker" style:opacity={clip.p(.05,.35)}>YOUR NEXT WEEK STARTS HERE</div>
  <h1 class="headline" style:opacity={clip.p(.12,.45)} style:transform="translateY({(1-clip.p(.12,.55))*95}px)">Make once.<br/>Publish<br/>all week.</h1>
  <div class="calendar"><Week at={.35} large/></div>
  <div class="cta" style:opacity={clip.p(.5,.32)} style:transform="translateY({(1-clip.p(.5,.4,'power3.out'))*60}px)">
    <span class="prompt mono">$</span><span class="command mono">npm i visualfries</span>
    <svg viewBox="0 0 62 62" aria-hidden="true"><path d="M7 55L54 8M7 8h47v47" fill="none" stroke="currentColor" stroke-width="4"/></svg>
  </div>
  <p class="body subtitle" style:opacity={clip.p(.62,.3)}>Start building with VisualFries.</p>
  <div class="small mono" style:opacity={clip.p(.68,.3)}>ONE SOURCE. MORE POSSIBILITIES.</div>
</Frame>

<style>
  h1 {position:absolute;left:66px;top:260px;font-size:133px;letter-spacing:-7px;line-height:.97;}
  .calendar {position:absolute;left:72px;top:725px;width:936px;}
  .cta {position:absolute;left:72px;top:958px;width:936px;height:136px;background:var(--ink);color:var(--yellow);display:flex;align-items:center;padding:0 31px;gap:25px;}
  .prompt {font-size:42px;opacity:.45;}
  .command {font-size:46px;font-weight:600;letter-spacing:-2px;}
  .cta svg {width:51px;height:51px;margin-left:auto;}
  .subtitle {position:absolute;top:1133px;left:72px;font-size:32px;}
  .small {position:absolute;top:1194px;left:72px;font-size:17px;letter-spacing:.2px;}
</style>
