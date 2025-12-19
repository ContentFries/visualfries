<script lang="ts">
	let { children } = $props();
</script>

<div class="docs-container">
	<nav class="sidebar">
		<div class="logo">
			<a href="/docs">
				<span class="text-gradient">VisualFries</span>
			</a>
		</div>
		
		<div class="nav-sections">
			<div class="nav-section">
				<h3>Getting Started</h3>
				<a href="/docs">Introduction</a>
				<a href="/docs#installation">Installation</a>
			</div>
			
			<div class="nav-section">
				<h3>API Reference</h3>
				<a href="/docs/components">Components</a>
				<a href="/docs/hooks">Hooks</a>
			</div>
			
			<div class="nav-section">
				<h3>Showcase</h3>
				<a href="/docs/examples">Live Examples</a>
			</div>
		</div>
	</nav>

	<main class="content">
		{@render children()}
	</main>
</div>

<style>
	:global(body) {
		background-color: #0d0d0d;
		color: #e0e0e0;
		font-family: 'Inter', system-ui, -apple-system, sans-serif;
		margin: 0;
		overflow-x: hidden;
	}

	.docs-container {
		display: flex;
		min-height: 100vh;
	}

	.sidebar {
		width: 220px;
		flex-shrink: 0;
		background: rgba(15, 15, 15, 0.8);
		backdrop-filter: blur(10px);
		border-right: 1px solid rgba(255, 255, 255, 0.1);
		padding: 2rem 1.5rem;
		height: 100vh;
		position: sticky;
		top: 0;
		display: flex;
		flex-direction: column;
	}

	.logo {
		margin-bottom: 3rem;
	}

	.logo a {
		font-size: 1.5rem;
		font-weight: 800;
		text-decoration: none;
		letter-spacing: -1px;
	}

	.text-gradient {
		background: linear-gradient(135deg, #60a5fa, #c084fc);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.nav-sections {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.nav-section h3 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #666;
		margin-bottom: 1rem;
	}

	.nav-section a {
		display: block;
		padding: 0.5rem 0;
		color: #a0a0a0;
		text-decoration: none;
		font-size: 0.9rem;
		transition: color 0.2s ease, transform 0.2s ease;
	}

	.nav-section a:hover {
		color: #fff;
		transform: translateX(4px);
	}

	.content {
		flex: 1;
		padding: 3rem;
		min-width: 0;
	}

	@media (max-width: 768px) {
		.docs-container {
			flex-direction: column;
		}
		.sidebar {
			width: 100%;
			height: auto;
			padding: 1rem;
			position: relative;
		}
		.content {
			padding: 2rem;
		}
	}
</style>
