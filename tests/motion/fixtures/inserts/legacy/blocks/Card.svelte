<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

<div
	class="card"
	style:transform="translateX({(1 - clip.p('start', 0.4)) * -120}%) rotate({clip.p('hit', 0.3) *
		8}deg)"
></div>

<style>
	.card {
		position: absolute;
		left: 20%;
		top: 25%;
		width: 60%;
		height: 50%;
		border-radius: 12px;
		background: linear-gradient(135deg, #f43f5e, #f59e0b);
	}
</style>
