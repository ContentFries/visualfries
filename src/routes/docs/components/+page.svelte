<svelte:head>
	<title>Components API | VisualFries Docs</title>
</svelte:head>

<section class="api-docs">
	<h1 class="page-title">Components <span class="text-gradient">API</span></h1>
	
	<p class="lead">
		VisualFries components are defined by structured data schemas. 
		Each component type shares a common appearance base while adding type-specific properties.
	</p>

	<div class="api-section">
		<h2>Appearance Schema</h2>
		<p>The base schema for positioning and styling all components.</p>
		
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th>Property</th>
						<th>Type</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>x</code>, <code>y</code></td>
						<td><code>number</code></td>
						<td>Absolute coordinates in the scene.</td>
					</tr>
					<tr>
						<td><code>width</code>, <code>height</code></td>
						<td><code>number</code></td>
						<td>Dimensions in pixels.</td>
					</tr>
					<tr>
						<td><code>opacity</code></td>
						<td><code>number (0-1)</code></td>
						<td>Component transparency. Default: 1.</td>
					</tr>
					<tr>
						<td><code>rotation</code></td>
						<td><code>number</code></td>
						<td>Rotation in degrees. Default: 0.</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<div class="api-section">
		<h2>TEXT Component</h2>
		<p>Extends appearance with text-specific properties.</p>
		
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th>Property</th>
						<th>Type</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>text</code></td>
						<td><code>string</code></td>
						<td>The content to display.</td>
					</tr>
					<tr>
						<td><code>fontSize</code></td>
						<td><code>StructuredFontSize</code></td>
						<td>Object with <code>value</code> and <code>unit</code>.</td>
					</tr>
					<tr>
						<td><code>color</code></td>
						<td><code>ColorType</code></td>
						<td>Hex string or Gradient definition.</td>
					</tr>
					<tr>
						<td><code>activeWord</code></td>
						<td><code>object</code></td>
						<td>Enables karaoke highlighting styles.</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<div class="api-section">
		<h2>VIDEO Component</h2>
		<p>Handles video playback and texture generation.</p>
		
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th>Property</th>
						<th>Type</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>source.url</code></td>
						<td><code>string</code></td>
						<td>URL to the video file.</td>
					</tr>
					<tr>
						<td><code>source.startAt</code></td>
						<td><code>number</code></td>
						<td>Offset in seconds to start playback.</td>
					</tr>
					<tr>
						<td><code>muted</code></td>
						<td><code>boolean</code></td>
						<td>Whether audio is disabled.</td>
					</tr>
				</tbody>
			</table>
		</div>
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
