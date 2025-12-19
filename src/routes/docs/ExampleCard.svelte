<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { createSceneBuilder, type ISceneBuilder, type Scene } from '$lib/index.js';

	type Props = {
		/** Scene data object or JSON string */
		sceneData: Scene | string;
		/** Title for this example */
		title: string;
		/** Brief description of what this example demonstrates */
		description?: string;
		/** Scale factor for the preview (default: 0.25) */
		scale?: number;
		/** Auto-play on load */
		autoPlay?: boolean;
	};

	let { sceneData, title, description = '', scale = 0.25, autoPlay = false }: Props = $props();

	let canvas: HTMLDivElement | undefined = $state();
	let sceneBuilder: ISceneBuilder | undefined = $state();
	let currentTime = $state(0);
	let isPlaying = $state(false);
	let error = $state<string | null>(null);
	let copied = $state(false);

	// Parse scene data if it's a string
	function getSceneData(): Scene {
		if (typeof sceneData === 'string') {
			return JSON.parse(sceneData);
		}
		return sceneData;
	}

	const fonts = [
		{ alias: 'Inter', source: 'google' as const, data: { family: 'Inter:400,500,600,700,800,900' } },
		{ alias: 'Montserrat', source: 'google' as const, data: { family: 'Montserrat:400,500,600,700,800,900' } },
		{ alias: 'Roboto', source: 'google' as const, data: { family: 'Roboto:400,500,700,900' } }
	];

	onMount(async () => {
		if (!canvas) return;
		try {
			const data = getSceneData();
			sceneBuilder = await createSceneBuilder(data, canvas, {
				fonts,
				scale,
				autoPlay,
				loop: true
			});

			if (autoPlay) {
				isPlaying = true;
			}

			// Time update listener using interval since timeupdate event may not exist
			const interval = setInterval(() => {
				if (sceneBuilder) {
					currentTime = sceneBuilder.currentTime;
					// Loop at duration
					if (currentTime >= sceneBuilder.duration) {
						sceneBuilder.seek(0);
					}
				}
			}, 100);

			// Store for cleanup
			(canvas as any)._interval = interval;
		} catch (e) {
			console.error('Failed to initialize scene:', e);
			error = e instanceof Error ? e.message : String(e);
		}
	});

	onDestroy(() => {
		if (canvas && (canvas as any)._interval) {
			clearInterval((canvas as any)._interval);
		}
		if (sceneBuilder) {
			sceneBuilder.destroy();
		}
	});

	function togglePlay() {
		if (!sceneBuilder) return;
		if (isPlaying) {
			sceneBuilder.pause();
		} else {
			sceneBuilder.play();
		}
		isPlaying = !isPlaying;
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
		const data = getSceneData();
		const percent = (e.clientX - rect.left) / rect.width;
		seek(percent * data.settings.duration);
	}

	async function copyToClipboard() {
		const data = getSceneData();
		const json = JSON.stringify(data, null, 2);
		await navigator.clipboard.writeText(json);
		copied = true;
		setTimeout(() => { copied = false; }, 2000);
	}

	function downloadJSON() {
		const data = getSceneData();
		const json = JSON.stringify(data, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `${data.id || 'scene'}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function openInNewTab() {
		const data = getSceneData();
		const json = JSON.stringify(data, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		window.open(url, '_blank');
	}

	// Get formatted duration
	function getDuration(): number {
		try {
			return getSceneData().settings.duration;
		} catch {
			return 5;
		}
	}
</script>

<div class="example-card">
	<div class="card-header">
		<h3>{title}</h3>
		{#if description}
			<p class="description">{description}</p>
		{/if}
	</div>

	<div class="card-content">
		<!-- Preview -->
		<div class="preview-section">
			{#if error}
				<div class="error">{error}</div>
			{:else}
				<div class="canvas-frame">
					<div bind:this={canvas} class="canvas-container"></div>
				</div>
			{/if}

			<div class="controls">
				<button class="play-btn" onclick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
					{#if isPlaying}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
					{:else}
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
					{/if}
				</button>
				<div class="timeline" onclick={handleTimelineClick}>
					<div class="timeline-progress" style="width: {(currentTime / getDuration()) * 100}%"></div>
				</div>
				<span class="time">{currentTime.toFixed(1)}s</span>
			</div>
		</div>

		<!-- Actions -->
		<div class="actions">
			<button class="action-btn" onclick={copyToClipboard} title="Copy JSON to clipboard">
				{#if copied}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L5.53 12.7a.996.996 0 10-1.41 1.41l4.18 4.18c.39.39 1.02.39 1.41 0L20.29 7.71a.996.996 0 10-1.41-1.41L9 16.17z"/></svg>
					Copied!
				{:else}
					<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
					Copy JSON
				{/if}
			</button>
			<button class="action-btn" onclick={downloadJSON} title="Download JSON file">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
				Download
			</button>
			<button class="action-btn" onclick={openInNewTab} title="Open JSON in new tab">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
				Open
			</button>
		</div>
	</div>
</div>

<style>
	.example-card {
		background: rgba(15, 15, 20, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 1rem;
		overflow: hidden;
		transition: border-color 0.2s ease;
	}

	.example-card:hover {
		border-color: rgba(96, 165, 250, 0.3);
	}

	.card-header {
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	.card-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #fff;
	}

	.description {
		margin: 0.5rem 0 0;
		font-size: 0.8rem;
		color: #888;
	}

	.card-content {
		padding: 1rem;
	}

	.preview-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.canvas-frame {
		background: #000;
		border-radius: 0.75rem;
		overflow: hidden;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
	}

	.canvas-container {
		width: 200px;
		height: 355px;
	}

	.canvas-container :global(canvas) {
		width: 100% !important;
		height: 100% !important;
	}

	.error {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		padding: 1rem;
		border-radius: 0.5rem;
		font-size: 0.8rem;
		text-align: center;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		max-width: 250px;
	}

	.play-btn {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		border: none;
		background: linear-gradient(135deg, #60a5fa, #a78bfa);
		color: #fff;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.timeline {
		flex: 1;
		height: 6px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 3px;
		cursor: pointer;
		overflow: hidden;
	}

	.timeline-progress {
		height: 100%;
		background: linear-gradient(90deg, #60a5fa, #a78bfa);
		border-radius: 3px;
		transition: width 0.1s linear;
	}

	.time {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		color: #666;
		min-width: 2.5rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
		justify-content: center;
	}

	.action-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.75rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 0.5rem;
		color: #888;
		font-size: 0.7rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
	}
</style>
