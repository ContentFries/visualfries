<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

<div
	class="bar"
	style:width="{clip.p('start', 0.5) * 70}%"
	style:opacity={clip.p('start', 0.2)}
></div>

<style>
	.bar {
		position: absolute;
		left: 6%;
		bottom: 10%;
		height: 18%;
		border-radius: 6px;
		background: rgba(34, 211, 238, 0.8);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
	}
</style>
