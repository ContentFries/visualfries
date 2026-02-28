<svelte:head>
	<title>Hooks System | VisualFries Docs</title>
</svelte:head>

<section class="api-docs">
	<h1 class="page-title">Hooks <span class="text-gradient">System</span></h1>
	
	<p class="lead">
		Hooks are the modular units of logic in VisualFries. They allow you to attach behaviors 
		like physics, custom rendering, or special animations to any component.
	</p>

	<div class="api-section">
		<h2>Lifecycle Events</h2>
		<p>Hooks subscribe to specific lifecycle events through the <code>types</code> array.</p>
		
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th>Event</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>setup</code></td>
						<td>Called when the component is first initialized. Best for resource allocation.</td>
					</tr>
					<tr>
						<td><code>update</code></td>
						<td>Called every frame or whenever props change. Handles rendering and sync.</td>
					</tr>
					<tr>
						<td><code>refresh</code></td>
						<td>Triggered by <code>video.refresh()</code>. Used to rebuild internal state without full destruction.</td>
					</tr>
					<tr>
						<td><code>destroy</code></td>
						<td>Called when the component is removed. <strong>Must</strong> clear all resources (textures, event listeners).</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<div class="api-section">
		<h2>Common Hooks</h2>
		
		<div class="card-grid">
			<div class="card-glass">
				<h4>PixiVideoTextureHook</h4>
				<p>Generates and maintains a PIXI video texture from a video element.</p>
			</div>
			<div class="card-glass">
				<h4>MediaHook</h4>
				<p>Synchronizes HTML media elements with the scene timeline and handles playback.</p>
			</div>
			<div class="card-glass">
				<h4>AnimationHook</h4>
				<p>Builds and manages GSAP timelines based on component animation data.</p>
			</div>
			<div class="card-glass">
				<h4>SubtitlesHook</h4>
				<p>Parses subtitle files and calculates word-level timings for karaoke effects.</p>
			</div>
		</div>
	</div>

	<div class="api-section">
		<h2>Priority</h2>
		<p>
			Hooks run in order of their <code>priority</code> value (lower numbers execute first). 
			Rendering hooks usually have a priority of <code>1</code>, while animation hooks run later 
			to target the rendered objects.
		</p>
	</div>
</section>

<style>
	.api-docs {
		opacity: 0;
		animation: fadeIn 0.8s ease forwards;
	}

	@keyframes fadeIn {
		to { opacity: 1; transform: translateY(0); }
		from { opacity: 0; transform: translateY(20px); }
	}

	.page-title {
		font-size: 3rem;
		font-weight: 800;
		margin-bottom: 2rem;
	}

	.text-gradient {
		background: linear-gradient(135deg, #60a5fa, #c084fc);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.lead {
		font-size: 1.1rem;
		color: #a0a0a0;
		margin-bottom: 4rem;
	}

	.api-section {
		margin-bottom: 4rem;
	}

	.table-container {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 1rem;
		overflow: hidden;
		margin-top: 1.5rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}

	th {
		background: rgba(255, 255, 255, 0.03);
		padding: 1rem 1.5rem;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #666;
	}

	td {
		padding: 1rem 1.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.05);
		font-size: 0.95rem;
	}

	.card-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
		margin-top: 1.5rem;
	}

	.card-glass {
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.05);
		padding: 1.5rem;
		border-radius: 1rem;
	}

	.card-glass h4 {
		margin-top: 0;
		margin-bottom: 0.75rem;
		color: #fff;
	}

	.card-glass p {
		font-size: 0.85rem;
		color: #888;
		margin: 0;
	}

	code {
		background: rgba(96, 165, 250, 0.1);
		color: #60a5fa;
		padding: 0.2rem 0.4rem;
		border-radius: 0.25rem;
		font-family: 'JetBrains Mono', monospace;
	}

	h2 {
		font-size: 1.75rem;
		margin-bottom: 1rem;
	}

	p {
		color: #a0a0a0;
	}
</style>
