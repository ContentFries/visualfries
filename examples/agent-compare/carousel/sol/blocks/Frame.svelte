<script>
  import { useClip } from 'visualfries/motion';
  const clip = useClip();
  let { number, dark = false, children } = $props();
</script>

<div class:dark class="slide">
  <header style:opacity={clip.p(0, .35)}>
    <div class="brand"><span class="fries"><i></i><i></i><i></i></span>VisualFries</div>
    <span class="edition mono">THE CONTENT PLAYBOOK</span>
  </header>
  {@render children()}
  <footer>
    <div class="footer-label mono">ONE TAKE → ONE WEEK</div>
    <div class="progress">{#each [1,2,3,4,5] as n}<i class:active={n === number}></i>{/each}</div>
    <div class="page mono">0{number}<span> / 05</span></div>
  </footer>
</div>

<style>
  header { position:absolute; left:72px; right:72px; top:57px; height:65px; display:flex; align-items:flex-start; justify-content:space-between; border-bottom:2px solid currentColor; }
  .brand {font-weight:800; font-size:34px; letter-spacing:-1.8px; display:flex; align-items:center; gap:11px; line-height:1;}
  .fries { display:flex; align-items:center; gap:4px; transform:rotate(-12deg); width:30px; }
  .fries i { background:currentColor; width:7px; height:27px; display:block; }
  .fries i:nth-child(2) {height:36px;}
  .fries i:nth-child(3) {height:22px;}
  .edition {font-size:18px; letter-spacing:.4px; margin-top:9px;}
  footer { position:absolute; z-index:20; bottom:0; left:0; width:1080px; height:100px; padding:30px 72px 0; background:var(--yellow); color:var(--ink); }
  .dark footer {background:var(--ink);color:var(--paper);}
  footer:before {content:'';position:absolute; top:0;left:72px;right:72px;height:2px;background:currentColor;}
  .footer-label {font-size:18px;letter-spacing:-.3px;}
  .page {position:absolute;right:72px;top:25px;font-size:25px;}
  .page span {opacity:.5;}
  .progress {position:absolute;left:510px;top:36px;display:flex;gap:8px;}
  .progress i {display:block;width:27px;height:5px;background:currentColor;opacity:.22;}
  .progress .active {opacity:1;}
  .dark .progress .active {background:var(--yellow);}
</style>
