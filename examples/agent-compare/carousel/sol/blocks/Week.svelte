<script>
  import { useClip } from 'visualfries/motion';
  const clip = useClip();
  let { at = .5, large = false } = $props();
  const days = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
</script>
<div class:large class="week">
  {#each days as day, i}
    <div class="day" style:opacity={clip.p(at + i * .035, .32)} style:transform="translateY({(1 - clip.p(at + i * .035, .32)) * 45}px)">
      <span class="mono day-name">{day}</span>
      <span class="day-no">0{i + 1}</span>
      <div class="lines"><i></i><i></i><i></i></div>
    </div>
  {/each}
</div>
<style>
  .week {display:flex;width:100%;gap:6px;}
  .day {position:relative;background:var(--ink);color:var(--yellow);flex:1;min-width:0;height:150px;padding:13px 11px;}
  .day-name {font-size:16px;display:block;letter-spacing:-.7px;}
  .day-no {display:block;font-size:45px;font-weight:800;letter-spacing:-3px;line-height:1.35;}
  .lines {position:absolute;left:12px;right:12px;bottom:16px;display:flex;flex-direction:column;gap:5px;}
  .lines i {height:3px;width:100%;background:var(--yellow);opacity:.45;}
  .lines i:nth-child(2) {width:65%;}
  .lines i:nth-child(3) {width:80%;}
  .large .day {height:178px;padding:15px 17px;}
  .large .day-name {font-size:20px;}
  .large .day-no {font-size:66px;}
  .large .lines {left:18px;right:18px;}
</style>
