<script lang="ts">
	import { dev } from '$app/environment';
	// Dev-only experiment: production builds contain none of its code.
	const spike = dev ? import('./BrowserExportSpike.svelte') : null;
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if spike}
	{#await spike then { default: Spike }}
		<Spike />
	{/await}
{/if}
