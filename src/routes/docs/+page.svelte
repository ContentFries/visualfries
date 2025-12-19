<svelte:head>
	<title>Introduction | VisualFries Docs</title>
</svelte:head>

<section class="intro">
	<h1 class="hero-title">Powerful Agentic Coding for <span class="text-gradient">Visual Content</span></h1>
	
	<p class="lead">
		VisualFries is a high-performance rendering and animation library built for the modern web. 
		Leveraging PIXI.js, Svelte 5, and GSAP, it provides a unified API for creating videos, 
		subtitles, and interactive visual components.
	</p>

	<div class="features-grid">
		<div class="feature-card">
			<div class="icon">🚀</div>
			<h3>Reactive Core</h3>
			<p>Built on Svelte 5 runes for effortless state management and ultra-fast updates.</p>
		</div>
		<div class="feature-card">
			<div class="icon">🎨</div>
			<h3>PIXI & HTML</h3>
			<p>Seamlessly mix GPU-accelerated PIXI.js rendering with standard HTML/CSS components.</p>
		</div>
		<div class="feature-card">
			<div class="icon">🎬</div>
			<h3>GSAP Powered</h3>
			<p>Industry-standard animation engine for smooth transitions and complex timeline management.</p>
		</div>
	</div>

	<h2 id="installation">Installation</h2>
	<div class="code-block">
		<pre><code>pnpm add visualfries</code></pre>
	</div>

	<h2>Core Architecture</h2>
	<p>
		VisualFries follows a <strong>Director/Builder</strong> pattern. Components are composed of 
		<strong>Hooks</strong> that handle specific responsibilities like rendering, media playback, 
		or physics.
	</p>
	
	<div class="card-glass">
		<h4>Components are composed of:</h4>
		<ul>
			<li><strong>Props:</strong> Reactive state ($state)</li>
			<li><strong>Context:</strong> Shared resources (Textures, Elements)</li>
			<li><strong>Hooks:</strong> Modular logic executed on lifecycle events</li>
		</ul>
	</div>
</section>

<style>
	.intro {
		opacity: 0;
		animation: fadeIn 0.8s ease forwards;
	}

	@keyframes fadeIn {
		to { opacity: 1; transform: translateY(0); }
		from { opacity: 0; transform: translateY(20px); }
	}

	.hero-title {
		font-size: 3.5rem;
		font-weight: 900;
		letter-spacing: -2px;
		line-height: 1.1;
		margin-bottom: 2rem;
	}

	.text-gradient {
		background: linear-gradient(135deg, #60a5fa, #c084fc);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.lead {
		font-size: 1.25rem;
		color: #a0a0a0;
		line-height: 1.6;
		margin-bottom: 4rem;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2rem;
		margin-bottom: 5rem;
	}

	.feature-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.05);
		padding: 2rem;
		border-radius: 1rem;
		transition: border-color 0.3s ease;
	}

	.feature-card:hover {
		border-color: rgba(96, 165, 250, 0.3);
	}

	.feature-card .icon {
		font-size: 2rem;
		margin-bottom: 1rem;
	}

	.code-block {
		background: #000;
		padding: 1rem 1.5rem;
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.1);
		margin: 2rem 0;
	}

	.card-glass {
		background: rgba(255, 255, 255, 0.02);
		backdrop-filter: blur(4px);
		border: 1px solid rgba(255, 255, 255, 0.05);
		padding: 2rem;
		border-radius: 1rem;
	}

	h2 {
		font-size: 2rem;
		margin-top: 4rem;
		margin-bottom: 1.5rem;
	}

	ul {
		list-style: none;
		padding: 0;
	}

	ul li {
		margin-bottom: 0.75rem;
		color: #ccc;
	}

	ul li strong {
		color: #fff;
	}
</style>
