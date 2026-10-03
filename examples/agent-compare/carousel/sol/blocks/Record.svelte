<script>
  import { useClip, Footage } from 'visualfries/motion';
  import Frame from './Frame.svelte';
  const clip = useClip();
  const rise = (at) => `translateY(${(1-clip.p(at,.55,'power3.out'))*90}px)`;
</script>

<Frame number={2} dark>
  <svg class="filter-defs" aria-hidden="true" width="0" height="0">
    <defs>
      <filter id="vf-record-edge" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feMorphology in="SourceAlpha" operator="erode" radius="2" result="tight-alpha" />
        <feComposite in="SourceGraphic" in2="tight-alpha" operator="in" />
      </filter>
    </defs>
  </svg>
  <div class="kicker" style:opacity={clip.p(.05,.35)}><span class="step-tag">01</span>THE SOURCE</div>
  <h1 class="headline" style:opacity={clip.p(.12,.45)} style:transform={rise(.12)}>Record<br/><span class="yellow">once.</span></h1>
  <p class="body subtitle" style:opacity={clip.p(.25,.5)} style:transform={rise(.25)}>One idea. One clean talking-head take.</p>
  <div class="big-one" style:opacity={clip.p(.35,.45)} style:transform="translateX({(1-clip.p(.35,.55))*-120}px)">01</div>
  <div class="portrait" style:opacity={clip.p(.32,.3)} style:transform="translateY({(1-clip.p(.32,.48,'power3.out'))*180}px)">
    <Footage name="talk" layer="subject" offset={Math.min(0, 1.3-clip.t)} style="width:760px;height:820.8px;filter:url(#vf-record-edge) grayscale(1) contrast(1.08);" />
  </div>
  <div class="rec mono" style:opacity={clip.p(.48,.3)}><i></i>REC / TALK.MP4</div>
  <p class="note mono" style:opacity={clip.p(.52,.3)}>THE INPUT FOR<br/>YOUR ENTIRE WEEK.</p>
</Frame>

<style>
  .filter-defs {position:absolute;}
  h1 {position:absolute;left:65px;top:242px;font-size:162px;line-height:.91;letter-spacing:-8px;}
  .subtitle {position:absolute;left:72px;top:585px;font-size:31px;}
  .big-one {position:absolute;left:55px;top:684px;font-family:'Anton';font-size:429px;line-height:1;color:var(--yellow);letter-spacing:-10px;}
  .portrait {position:absolute;left:320px;top:652px;width:760px;height:821px;}
  .rec {position:absolute;top:681px;left:73px;font-size:18px;color:var(--yellow);display:flex;align-items:center;gap:10px;}
  .rec i {width:11px;height:11px;background:var(--yellow);border-radius:50%;}
  .note {position:absolute;left:75px;top:1155px;line-height:1.45;font-size:19px;letter-spacing:-.5px;}
</style>
