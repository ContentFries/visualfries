<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createSceneBuilder } from '$lib';
	import type { Scene, ISceneBuilder } from '$lib';

	let { sceneData } = $props<{ sceneData: Scene }>();
	
	let container: HTMLDivElement | undefined = $state();
	let sceneBuilder: ISceneBuilder | undefined = $state();
	let error: string | undefined = $state();
	let isPlaying = $state(false);

	onMount(async () => {
		if (!container) return;
		try {
			sceneBuilder = await createSceneBuilder(sceneData, container, {
				autoPlay: false,
				loop: true
			});
		} catch (e) {
			console.error('Failed to initialize scene:', e);
			error = e instanceof Error ? e.message : String(e);
		}
	});

	onDestroy(() => {
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

	function seek(e: Event) {
		const target = e.target as HTMLInputElement;
		const time = parseFloat(target.value);
		sceneBuilder?.seek(time);
	}
</script>

<div class="scene-preview-wrapper bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10">
	{#if error}
		<div class="flex items-center justify-center aspect-[9/16] bg-red-900/20 text-red-500 p-4 text-center">
			{error}
		</div>
	{:else}
		<div bind:this={container} class="scene-container aspect-[9/16] w-full relative">
			<!-- Visual fries renders here -->
		</div>
	{/if}

	<div class="controls p-4 bg-zinc-900/50 backdrop-blur-md flex items-center gap-4 border-t border-white/5">
		<button 
			onclick={togglePlay}
			class="btn btn-circle btn-primary btn-sm"
		>
			{#if isPlaying}
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
			{/if}
		</button>

		<input 
			type="range" 
			min="0" 
			max={sceneData.settings.duration} 
			step="0.01"
			value={sceneBuilder?.state?.currentTime || 0}
			oninput={seek}
			class="range range-xs range-primary flex-1"
		/>
		
		<span class="text-xs font-mono text-zinc-500 w-12 text-right">
			{(sceneBuilder?.state?.currentTime || 0).toFixed(2)}s
		</span>
	</div>
</div>

<style>
	.scene-container :global(canvas) {
		width: 100% !important;
		height: 100% !important;
		object-fit: contain;
	}
    
    .scene-preview-wrapper {
        max-width: 400px;
        margin: 0 auto;
    }
</style>
