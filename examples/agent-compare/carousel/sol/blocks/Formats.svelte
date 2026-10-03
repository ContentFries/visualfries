<script>
  import { useClip } from 'visualfries/motion';
  import Frame from './Frame.svelte';
  const clip = useClip();
  const formats = [
    {ratio:'9:16',name:'REELS',x:72,y:697,w:234,h:416,angle:-6},
    {ratio:'4:5',name:'CAROUSELS',x:352,y:652,w:292,h:365,angle:3},
    {ratio:'1:1',name:'POSTS',x:690,y:807,w:318,h:318,angle:-4}
  ];
</script>

<Frame number={4} dark>
  <div class="kicker" style:opacity={clip.p(.05,.35)}><span class="step-tag">03</span>THE RENDER</div>
  <h1 class="headline" style:opacity={clip.p(.12,.45)} style:transform="translateY({(1-clip.p(.12,.55))*80}px)">Every<br/><span class="yellow">format.</span></h1>
  <p class="body subtitle" style:opacity={clip.p(.25,.4)}>VisualFries renders the whole set.</p>
  {#each formats as f,i}
    <div class="format" class:paper={i === 1} class:square={i === 2} style:left="{f.x}px" style:top="{f.y}px" style:width="{f.w}px" style:height="{f.h}px" style:opacity={clip.p(.32+i*.1,.3)} style:transform="translateY({(1-clip.p(.32+i*.1,.4,'power3.out'))*140}px) rotate({f.angle*clip.p(.32+i*.1,.4)}deg)">
      <div class="format-top mono">VF / 0{i+1}</div>
      <div class="mini-title">ONE<br/>TAKE.</div>
      <svg class="mini-arrow" viewBox="0 0 100 45" aria-hidden="true"><path d="M0 22H90M68 1l22 21-22 21" fill="none" stroke="currentColor" stroke-width="5"/></svg>
      <div class="format-bottom mono">{f.ratio}</div>
      <div class="format-name mono">{f.name}</div>
    </div>
  {/each}
  <p class="endnote" style:opacity={clip.p(.65,.3)}>Same blocks. Different dimensions.</p>
</Frame>

<style>
  h1 {position:absolute;left:65px;top:243px;font-size:156px;letter-spacing:-8px;line-height:.93;}
  .subtitle {position:absolute;left:72px;top:572px;font-size:32px;}
  .format {position:absolute;background:var(--yellow);color:var(--ink);padding:22px;transform-origin:50% 70%;}
  .format.paper {background:var(--paper);}
  .format-top {font-size:15px;border-bottom:1px solid var(--ink);padding-bottom:10px;}
  .mini-title {font-family:'Anton';font-size:68px;line-height:1.1;margin-top:22px;letter-spacing:-1px;}
  .paper .mini-title {font-size:78px;}
  .square .mini-title {font-size:60px;line-height:1.06;margin-top:18px;}
  .mini-arrow {width:85px;height:38px;position:absolute;bottom:59px;left:23px;}
  .format-bottom {position:absolute;bottom:16px;left:22px;right:22px;border-top:1px solid currentColor;padding-top:9px;font-size:19px;}
  .format-name {position:absolute;bottom:-40px;left:0;color:var(--paper);font-size:18px;letter-spacing:1px;}
  .endnote {position:absolute;left:72px;top:1201px;font-size:27px;font-weight:500;letter-spacing:-.8px;}
</style>
