<svelte:head>
	<title>Authoring Best Practices | VisualFries</title>
</svelte:head>

<article>
	<h1>Authoring Best Practices</h1>
	<p>
		VisualFries is an authoring system, not only a JSON schema. Validation proves structure;
		rendered frame QA proves behavior.
	</p>

	<h2>Semantic components first</h2>
	<ul>
		<li>
			Visible typography, metrics, labels, badges, cards, and CTAs use native <code>TEXT</code>.
		</li>
		<li>Transcript-timed typography uses <code>SUBTITLES</code>.</li>
		<li>
			<code>IMAGE</code> is for photos, screenshots, logos, illustrations, and real image assets.
		</li>
		<li>
			<code>SHAPE</code> is independent geometry, decoration, progress, or transition content.
		</li>
	</ul>
	<p>
		Do not rasterize ordinary text and do not add a SHAPE solely as its background when TEXT can own
		background, gradient, radius, outline, shadow, and animation.
	</p>

	<h2>Runtime animation truth</h2>
	<p>
		TEXT and SUBTITLES use HTML animation targets. IMAGE, VIDEO, GIF, SHAPE, COLOR, and GRADIENT
		share a stable Pixi transform target with relative x/y offsets, opacity, rotation, and uniform
		or axis scales. AUDIO is nonvisual. Pixi transform origin is fixed at component center.
	</p>
	<p>
		Use <code>catalog --component TEXT --capabilities --json</code>, strict runtime validation, and
		<code>explain --component &lt;id&gt; --frame &lt;n&gt;</code> instead of inferring behavior from
		schema.
	</p>

	<h2>Required workflow</h2>
	<pre><code
			>inspect → semantic components → author → validate + inspect → frame-QA + reseek → deterministic render</code
		></pre>
	<p>
		Render pre-entry, first-active, settled, and exit frames for every animation. Seek away and back
		to the same frame. Uniform three-frame sampling can miss short or late events.
	</p>

	<p>
		The complete component matrix, TEXT compositing rules, examples, commands, and open limits live
		in <code>docs/AUTHORING_BEST_PRACTICES.md</code> in the repository/package.
	</p>
</article>

<style>
	article {
		max-width: 850px;
		padding: 3rem;
		line-height: 1.65;
	}
	h1,
	h2 {
		color: white;
	}
	code,
	pre {
		background: #171717;
		border-radius: 0.5rem;
	}
	code {
		padding: 0.15rem 0.35rem;
	}
	pre {
		overflow-x: auto;
		padding: 1rem;
	}
</style>
