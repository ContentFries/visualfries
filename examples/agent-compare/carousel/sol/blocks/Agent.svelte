<script>
  import { useClip } from 'visualfries/motion';
  import Frame from './Frame.svelte';
  const clip = useClip();
  const rise = (at) => `translateY(${(1-clip.p(at,.5,'power3.out'))*75}px)`;
  const blocks = ['Hook.svelte','Steps.svelte','CTA.svelte'];
</script>

<Frame number={3}>
  <div class="kicker" style:opacity={clip.p(.05,.35)}><span class="step-tag">02</span>THE AGENT</div>
  <h1 class="headline" style:opacity={clip.p(.12,.4)} style:transform={rise(.12)}>Your agent<br/>reads. Then<br/>writes.</h1>
  <p class="body subtitle" style:opacity={clip.p(.25,.4)}>It reads the transcript and writes the blocks.</p>
  <div class="transcript" style:opacity={clip.p(.28,.4)} style:transform={rise(.28)}>
    <div class="file mono"><span class="file-icon">≡</span> talk.transcript.json <span class="time">00:02.80</span></div>
    <p>“a video editor who uses these <mark>AI tools</mark>”</p>
  </div>
  <div class="connector" style:opacity={clip.p(.42,.28)}>
    <svg viewBox="0 0 36 60" aria-hidden="true"><path d="M18 0v53M4 38l14 15 14-15" fill="none" stroke="currentColor" stroke-width="3"/></svg>
    <span class="mono">READ → STRUCTURE → WRITE</span>
  </div>
  <div class="editor" style:opacity={clip.p(.48,.3)} style:transform={rise(.48)}>
    <div class="editor-header mono">EDITABLE MOTION BLOCKS <span>{'{ }'}</span></div>
    {#each blocks as block,i}
      <div class="code-row" style:opacity={clip.p(.57+i*.08,.24)} style:transform="translateX({(1-clip.p(.57+i*.08,.24))*35}px)">
        <span class="line mono">0{i+1}</span><span class="file-name mono">{block}</span><span class="check">↗</span>
      </div>
    {/each}
  </div>
</Frame>

<style>
  h1 {position:absolute;left:67px;top:246px;font-size:122px;line-height:.94;letter-spacing:-6px;}
  .subtitle {position:absolute;left:72px;top:620px;font-size:30px;}
  .transcript {position:absolute;left:72px;top:707px;width:936px;height:167px;border:2px solid var(--ink);padding:20px 25px;background:var(--paper);}
  .file {font-size:19px;display:flex;align-items:center;gap:13px;}
  .file-icon {font-size:27px;line-height:.8;}
  .time {margin-left:auto;font-size:16px;opacity:.5;}
  .transcript p {font-size:36px;font-weight:650;letter-spacing:-1px;margin-top:22px;}
  mark {background:var(--yellow);padding:0 5px;}
  .connector {position:absolute;left:101px;top:883px;display:flex;align-items:center;gap:22px;}
  .connector svg {width:30px;height:51px;}
  .connector span {font-size:18px;}
  .editor {position:absolute;left:72px;top:953px;width:936px;height:258px;background:var(--ink);color:var(--yellow);padding:20px 25px;}
  .editor-header {font-size:18px;border-bottom:1px solid #ffe10066;padding-bottom:15px;}
  .editor-header span {float:right;font-size:24px;line-height:.8;}
  .code-row {display:flex;align-items:center;height:58px;border-bottom:1px solid #ffe10033;gap:23px;}
  .code-row:last-child {border-bottom:0;}
  .line {font-size:18px;opacity:.45;}
  .file-name {font-size:27px;font-weight:500;}
  .check {margin-left:auto;font-size:34px;}
</style>
