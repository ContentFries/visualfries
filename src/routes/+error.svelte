<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>{page.status === 404 ? 'Page not found' : 'Error'} · VisualFries</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="error">
	<p class="eyebrow">{page.status}</p>
	<h1>{page.status === 404 ? 'This page does not exist.' : 'Something went wrong.'}</h1>
	<p>
		Try the <a href="/docs">docs</a>, the <a href="/docs/quickstart">Quickstart</a> or the
		<a href="/llms.txt">index for agents</a>.
	</p>
</main>

<style>
	.error {
		width: min(720px, 100% - 32px);
		margin-inline: auto;
		padding-block: calc(var(--nav) + 96px) 120px;
		display: grid;
		gap: 16px;
	}
	h1 {
		font-size: clamp(34px, 5vw, 52px);
		line-height: 1.05;
	}
	p {
		margin: 0;
		color: var(--ink-2);
	}
	a {
		color: var(--cool);
	}
</style>
