<script lang="ts">
	import { page } from '$app/state';
	const inDocs = $derived(page.url.pathname.startsWith('/docs'));
</script>

<header class="nav">
	<div class="wrap">
		<a class="brand" href="/" aria-label="VisualFries home"><i aria-hidden="true"></i>VisualFries</a
		>
		<nav aria-label="Primary">
			<a href="/docs" aria-current={inDocs ? 'page' : undefined}>Docs</a>
			<a class="hide-sm" href="/docs/cli">CLI</a>
			<a class="hide-sm" href="/docs/agents">Agents</a>
			<a class="hide-sm" href="https://github.com/ContentFries/visualfries">GitHub</a>
			<a class="hide-sm" href="https://www.npmjs.com/package/visualfries">npm</a>
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
		background: rgba(14, 15, 17, 0.84);
		backdrop-filter: blur(14px);
		border-bottom: 1px solid var(--line);
	}
	.wrap {
		width: min(1360px, 100% - 40px);
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
		font-family: var(--serif);
		font-size: 22px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}
	.brand i {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		background: var(--accent);
		transform: rotate(45deg);
	}
	nav {
		display: flex;
		gap: 22px;
		margin-left: auto;
		font-size: 15px;
	}
	nav a {
		text-decoration: none;
		color: var(--muted);
	}
	nav a:hover,
	nav a[aria-current] {
		color: var(--ink);
	}
	@media (max-width: 700px) {
		nav a.hide-sm {
			display: none;
		}
	}
</style>
