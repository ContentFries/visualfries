<!-- Stat post: one huge number and what it counts. Every asset listed was rendered from the same 17-second take. -->
<script>
	const assets = [
		['Speaker-depth reel', '9:16 · 17 s'],
		['5 caption styles', '9:16 · 17 s each'],
		['Magazine cover', '4:5'],
		['Quote post', '4:5'],
		['Carousel', '4:5 · 5 slides']
	];
</script>

<div class="s">
	<div class="grid"></div>
	<div class="eyebrow mono"><i></i>ONE 17-SECOND TAKE</div>
	<div class="big display">13</div>
	<p class="lead display">finished assets. <em>Zero timelines opened.</em></p>
	<div class="list">
		{#each assets as [name, meta], i}
			<div class="row">
				<span class="n mono">{String(i + 1).padStart(2, '0')}</span>
				<span class="name">{name}</span>
				<span class="meta mono">{meta}</span>
			</div>
		{/each}
	</div>
	<div class="foot mono">RENDERED WITH VISUALFRIES · VISUALFRIES.COM</div>
</div>

<style>
	.s { position: absolute; inset: 0; background: #09090b; color: #f4f3ee; overflow: hidden; }
	.grid { position: absolute; inset: 0; background-image: linear-gradient(#17181c 1px, transparent 1px), linear-gradient(90deg, #17181c 1px, transparent 1px);
		background-size: 60px 60px; mask-image: radial-gradient(80% 60% at 70% 30%, #000, transparent); }
	.eyebrow { position: absolute; left: 72px; top: 80px; font-size: 22px; letter-spacing: 0.14em; color: #8b8d96; display: flex; align-items: center; gap: 16px; }
	.eyebrow i { width: 34px; height: 3px; background: #ffe100; }
	.big { position: absolute; left: 40px; top: 110px; font-size: 560px; font-weight: 800; letter-spacing: -0.08em; line-height: 0.9; color: #ffe100; }
	.lead { position: absolute; left: 72px; right: 72px; top: 640px; margin: 0; font-size: 70px; font-weight: 700; line-height: 1.02; letter-spacing: -0.035em; }
	.lead em { font-style: normal; color: #8b8d96; }
	.list { position: absolute; left: 72px; right: 72px; top: 830px; display: grid; gap: 0; border-top: 1px solid #25272e; }
	.row { display: grid; grid-template-columns: 70px 1fr auto; align-items: center; gap: 18px; padding: 22px 0; border-bottom: 1px solid #25272e; }
	.n { font-size: 22px; color: #ffe100; }
	.name { font: 600 34px/1.1 Inter, sans-serif; }
	.meta { font-size: 22px; color: #8b8d96; }
	.foot { position: absolute; left: 72px; bottom: 40px; font-size: 18px; letter-spacing: 0.16em; color: #5b5c63; }
</style>
