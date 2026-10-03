<script lang="ts">
	import { page } from '$app/state';
	const inDocs = $derived(page.url.pathname.startsWith('/docs'));
</script>

<header class="nav">
	<div class="wrap">
		<a class="brand" href="/" aria-label="VisualFries home"><i aria-hidden="true"></i>VisualFries</a
		>
		<nav aria-label="Primary">
			<a class="hide-sm" href="/#formats">Formats</a>
			<a class="hide-sm" href="/#agents">Agents</a>
			<a href="/docs" aria-current={inDocs ? 'page' : undefined}>Docs</a>
			<a class="hide-sm" href="https://github.com/ContentFries/visualfries">GitHub</a>
			<a class="btn sm" href="/docs/quickstart">Quickstart</a>
		</nav>
	</div>
</header>

<style>
	.nav {
		position: fixed;
		inset: 0 0 auto 0;
		padding-top: env(safe-area-inset-top, 0px);
		height: calc(var(--nav) + env(safe-area-inset-top, 0px));
		z-index: 50;
		background: rgba(9, 9, 11, 0.72);
		backdrop-filter: blur(16px);
		border-bottom: 1px solid var(--line-2);
	}
	.wrap {
		width: min(1320px, 100% - 48px);
		height: 100%;
		display: flex;
		align-items: center;
		gap: 28px;
	}
	@media (max-width: 600px) {
		.wrap {
			width: calc(100% - 32px);
		}
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		font: 700 21px var(--display);
		letter-spacing: -0.02em;
	}
	.brand i {
		width: 14px;
		height: 14px;
		border-radius: 3px;
		background: var(--yellow);
		transform: rotate(45deg);
	}
	nav {
		display: flex;
		gap: 24px;
		align-items: center;
		margin-left: auto;
		font-size: 14.5px;
	}
	nav a:not(.btn) {
		text-decoration: none;
		color: var(--muted);
	}
	nav a:not(.btn):hover,
	nav a[aria-current] {
		color: var(--ink);
	}
	@media (max-width: 720px) {
		nav a.hide-sm {
			display: none;
		}
	}
</style>
