<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { createSceneBuilder, type ISceneBuilder, type Scene } from '$lib/index.js';

	type Props = {
		sceneData: Scene;
		title: string;
		description?: string;
		scale?: number;
		autoPlay?: boolean;
	};

	let { sceneData, title, description = '', scale = 0.3, autoPlay = false }: Props = $props();

	let canvas: HTMLDivElement | undefined = $state();
	let sceneBuilder: ISceneBuilder | undefined = $state();
	let currentTime = $state(0);
	let isPlaying = $state(false);
	let error = $state<string | null>(null);
	let expandedSections = $state<Set<string>>(new Set(['settings', 'layers', 'components']));
	let interval: ReturnType<typeof setInterval> | undefined;

	const fonts = [
		{ alias: 'Inter', source: 'google' as const, data: { family: 'Inter:400,500,600,700,800,900' } },
		{ alias: 'Montserrat', source: 'google' as const, data: { family: 'Montserrat:400,500,600,700,800,900' } }
	];

	onMount(async () => {
		if (!canvas) return;
		try {
			sceneBuilder = await createSceneBuilder(sceneData, canvas, {
				fonts,
				scale,
				autoPlay,
				loop: true
			});
			if (autoPlay) isPlaying = true;

			interval = setInterval(() => {
				if (sceneBuilder) currentTime = sceneBuilder.currentTime;
			}, 100);
		} catch (e) {
			console.error('Failed to initialize scene:', e);
			error = e instanceof Error ? e.message : String(e);
		}
	});

	onDestroy(() => {
		if (interval) clearInterval(interval);
		if (sceneBuilder) sceneBuilder.destroy();
	});

	function togglePlay() {
		if (!sceneBuilder) return;
		if (isPlaying) sceneBuilder.pause(); else sceneBuilder.play();
		isPlaying = !isPlaying;
	}

	function toggleSection(key: string) {
		if (expandedSections.has(key)) {
			expandedSections.delete(key);
		} else {
			expandedSections.add(key);
		}
		expandedSections = new Set(expandedSections);
	}

	function getComponentBadge(type: string) {
		const badges: Record<string, { color: string; icon: string }> = {
			'VIDEO': { color: '#f472b6', icon: '🎬' },
			'TEXT': { color: '#fbbf24', icon: '✎' },
			'SHAPE': { color: '#60a5fa', icon: '▢' },
			'IMAGE': { color: '#34d399', icon: '🖼' },
			'GIF': { color: '#a78bfa', icon: '✨' },
			'SUBTITLES': { color: '#fb923c', icon: '💬' }
		};
		return badges[type] || { color: '#888', icon: '?' };
	}

	function seek(time: number) {
		if (sceneBuilder) {
			sceneBuilder.seek(time);
			currentTime = time;
		}
	}

	function handleTimelineClick(e: MouseEvent) {
		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		if (rect.width <= 0) {
			return;
		}
		const percent = (e.clientX - rect.left) / rect.width;
		const duration = sceneData.settings.duration;
		if (duration <= 0) {
			seek(0);
			return;
		}
		seek(percent * duration);
	}

	function getTimelineProgressPercent(): number {
		const duration = sceneData.settings.duration;
		if (duration <= 0) {
			return 0;
		}
		return (currentTime / duration) * 100;
	}
</script>

<div class="interactive-example">
	<div class="example-header">
		<h2>{title}</h2>
		{#if description}<p>{description}</p>{/if}
	</div>

	<div class="example-grid">
		<!-- Left: Tree-View JSON Explorer -->
		<div class="json-panel">
			<div class="panel-header">
				<span class="file-icon">📄</span>
				<span class="filename">scene.json</span>
				<span class="badge synced">● Synced</span>
			</div>

			<div class="tree-view">
				<!-- Scene Root -->
				<div class="tree-node root">
					<span class="arrow">▼</span>
					<span class="key">scene</span>
					<span class="type">object</span>
				</div>

				<!-- Settings -->
				<div class="tree-section" style="margin-left: 1rem;">
					<button class="tree-node" onclick={() => toggleSection('settings')}>
						<span class="arrow">{expandedSections.has('settings') ? '▼' : '▶'}</span>
						<span class="key">settings</span>
						<span class="badge blue">Canvas Size</span>
					</button>
					{#if expandedSections.has('settings')}
						<div class="tree-content">
							<div class="prop"><span class="key">width:</span> <span class="number">{sceneData.settings.width}</span> <span class="comment">← 9:16 vertical</span></div>
							<div class="prop"><span class="key">height:</span> <span class="number">{sceneData.settings.height}</span></div>
							<div class="prop"><span class="key">fps:</span> <span class="number">{sceneData.settings.fps}</span></div>
							<div class="prop"><span class="key">duration:</span> <span class="number">{sceneData.settings.duration}</span> <span class="comment">← {sceneData.settings.duration} second clip</span></div>
						</div>
					{/if}
				</div>

				<!-- Layers -->
				<div class="tree-section" style="margin-left: 1rem;">
					<button class="tree-node" onclick={() => toggleSection('layers')}>
						<span class="arrow">{expandedSections.has('layers') ? '▼' : '▶'}</span>
						<span class="key">layers</span>
						<span class="type">array[{sceneData.layers.length}]</span>
					</button>
					{#if expandedSections.has('layers')}
						<div class="tree-content">
							<!-- Components -->
							<button class="tree-node" onclick={() => toggleSection('components')}>
								<span class="arrow">{expandedSections.has('components') ? '▼' : '▶'}</span>
								<span class="key">components</span>
								<span class="type">array[{sceneData.layers.reduce((acc, l) => acc + l.components.length, 0)}]</span>
							</button>
							{#if expandedSections.has('components')}
								{#each sceneData.layers as layer}
									{#each layer.components as comp}
										{@const badge = getComponentBadge(comp.type)}
										<div class="component-node">
											<span class="arrow">▶</span>
											<span class="icon">{badge.icon}</span>
											<span class="key">{comp.type}</span>
											<span class="badge" style="background: {badge.color}">{comp.name || comp.type}</span>
										</div>
										<div class="component-details">
											{#if 'text' in comp && typeof comp.text === 'string'}
												<div class="prop">
													<span class="key">text:</span>
													<span class="string">"{comp.text}"</span>
												</div>
											{/if}
											{#if comp.appearance?.text}
												<div class="prop"><span class="key">fontFamily:</span> <span class="string">"{comp.appearance.text.fontFamily}"</span></div>
												<div class="prop"><span class="key">fontSize:</span> <span class="number">{comp.appearance.text.fontSize}px</span></div>
												<div class="prop"><span class="key">color:</span> <span class="color-chip" style="background: {comp.appearance.text.color || '#fff'}"></span><span class="string">{comp.appearance.text.color}</span></div>
											{/if}
											{#if comp.animations?.list?.length}
												<div class="prop animations">
													<span class="key">▼ animations</span>
													<span class="badge orange">Karaoke</span>
												</div>
												{#each comp.animations.list as anim}
													<div class="prop sub">
														<span class="key">preset:</span>
														<span class="string">"{typeof anim.animation === 'string' ? anim.animation : anim.animation?.id}"</span>
													</div>
												{/each}
											{/if}
										</div>
									{/each}
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right: Phone Frame Preview -->
		<div class="preview-panel">
			<div class="panel-header">
				<span>Live Preview</span>
				<span class="dimensions">{sceneData.settings.width} × {sceneData.settings.height}</span>
			</div>

			<div class="phone-frame">
				{#if error}
					<div class="error">{error}</div>
				{:else}
					<div bind:this={canvas} class="canvas-container"></div>
				{/if}
			</div>

			<div class="controls">
				<button class="play-btn" onclick={togglePlay}>
					{#if isPlaying}
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
					{:else}
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
					{/if}
				</button>
				<div class="timeline" onclick={handleTimelineClick}>
					<div class="progress" style="width: {getTimelineProgressPercent()}%"></div>
				</div>
				<span class="time">{currentTime.toFixed(1)}s</span>
			</div>
		</div>
	</div>
</div>

<style>
	.interactive-example {
		margin-bottom: 5rem;
	}

	.example-header {
		margin-bottom: 2rem;
	}

	.example-header h2 {
		font-size: 2rem;
		font-weight: 800;
		color: #fff;
		margin: 0;
	}

	.example-header p {
		color: #888;
		margin-top: 0.5rem;
	}

	.example-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		align-items: start;
	}

	/* Panel Headers */
	.panel-header {
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.03);
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
	}

	.file-icon { font-size: 1rem; }
	.filename { color: #fff; font-weight: 600; }
	.dimensions { color: #666; margin-left: auto; font-family: monospace; font-size: 0.75rem; }

	.badge {
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
	}
	.badge.synced { background: rgba(52, 211, 153, 0.2); color: #34d399; }
	.badge.blue { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
	.badge.orange { background: rgba(251, 146, 60, 0.2); color: #fb923c; }

	/* JSON Panel */
	.json-panel {
		background: #0d0d14;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1rem;
		overflow: hidden;
		max-height: 700px;
		display: flex;
		flex-direction: column;
	}

	.tree-view {
		flex: 1;
		padding: 1rem;
		overflow: auto;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.8rem;
		line-height: 1.8;
	}

	.tree-node {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: none;
		border: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
		padding: 0;
		text-align: left;
	}

	.tree-node.root { margin-bottom: 0.5rem; }
	.tree-section { margin-bottom: 0.25rem; }
	.tree-content { margin-left: 1.5rem; }

	.arrow { color: #666; font-size: 0.6rem; width: 1rem; }
	.key { color: #a78bfa; }
	.type { color: #666; font-size: 0.7rem; }
	.number { color: #60a5fa; }
	.string { color: #34d399; }
	.comment { color: #4b5563; font-style: italic; margin-left: 0.5rem; }

	.prop {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding-left: 1.5rem;
	}
	.prop.sub { padding-left: 3rem; }
	.prop.animations { margin-top: 0.5rem; }

	.component-node {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: 1rem;
		padding: 0.25rem 0;
	}

	.component-details {
		margin-left: 2.5rem;
		padding-bottom: 0.5rem;
		border-left: 1px dashed rgba(255, 255, 255, 0.1);
		padding-left: 1rem;
	}

	.icon { font-size: 0.9rem; }

	.color-chip {
		width: 12px;
		height: 12px;
		border-radius: 2px;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	/* Preview Panel */
	.preview-panel {
		background: #0d0d14;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1rem;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.phone-frame {
		background: #000;
		padding: 2rem;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.canvas-container {
		border-radius: 1.5rem;
		overflow: hidden;
		box-shadow: 
			0 0 0 8px #1a1a1a,
			0 0 0 10px #333,
			0 25px 80px rgba(0, 0, 0, 0.6);
	}

	.controls {
		padding: 1rem 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		background: rgba(255, 255, 255, 0.02);
	}

	.play-btn {
		background: none;
		border: none;
		color: #60a5fa;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		transition: background 0.2s;
	}
	.play-btn:hover { background: rgba(96, 165, 250, 0.1); }

	.timeline {
		flex: 1;
		height: 6px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		cursor: pointer;
		overflow: hidden;
	}

	.progress {
		height: 100%;
		background: linear-gradient(90deg, #60a5fa, #a78bfa);
		border-radius: 3px;
	}

	.time {
		font-family: monospace;
		font-size: 0.75rem;
		color: #666;
		min-width: 2.5rem;
	}

	.error {
		color: #ef4444;
		padding: 2rem;
		text-align: center;
	}

	@media (max-width: 1200px) {
		.example-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
