<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { createSceneBuilder } from '$lib/factories/SceneBuilderFactory.js';
	import type { ISceneBuilder } from '$lib/schemas/runtime/index.js';
	import {
		createGlTransitionRenderer,
		exportCanvasToMp4,
		mixBrowserAudio,
		probeBrowserExportCapabilities,
		type GlTransitionRenderer
	} from '$lib/browser';
	import { BROWSER_SPIKE, createBrowserSpikeScene } from './demoScene.js';

	let fromRoot: HTMLDivElement;
	let toRoot: HTMLDivElement;
	let outputHost: HTMLDivElement;
	let fromBuilder: ISceneBuilder | undefined;
	let toBuilder: ISceneBuilder | undefined;
	let transitionRenderer: GlTransitionRenderer | undefined;
	let status = 'Initializing WebGL compositor…';
	let capability = 'Probing AVC + AAC…';
	let progress = 0;
	let running = false;
	let fallbackCount = 0;

	onMount(async () => {
		try {
			const report = await probeBrowserExportCapabilities({
				width: BROWSER_SPIKE.width,
				height: BROWSER_SPIKE.height,
				fps: BROWSER_SPIKE.fps,
				audio: true,
				sampleRate: 48_000,
				numberOfChannels: 2
			});
			capability = report.supported
				? 'AVC/H.264 + AAC in MP4 supported'
				: `${report.reasons.join('; ')} — fallback: ${report.fallback}`;
			if (!report.supported) {
				status = 'Requested browser MP4 unavailable on this machine.';
				publishStatus();
				return;
			}

			[fromBuilder, toBuilder] = await Promise.all([
				createSceneBuilder(createBrowserSpikeScene('from'), fromRoot, rendererConfig),
				createSceneBuilder(createBrowserSpikeScene('to'), toRoot, rendererConfig)
			]);

			const canvas = document.createElement('canvas');
			canvas.width = BROWSER_SPIKE.width;
			canvas.height = BROWSER_SPIKE.height;
			canvas.setAttribute('aria-label', 'VisualFries browser export preview');
			outputHost.appendChild(canvas);
			const gl =
				canvas.getContext('webgl2', { preserveDrawingBuffer: true }) ??
				canvas.getContext('webgl', { preserveDrawingBuffer: true });
			if (!gl) throw new Error('WebGL context creation failed for transition compositor');
			transitionRenderer = createGlTransitionRenderer(gl);
			await renderCompositeFrame(0);
			status = 'Ready: 300 deterministic frames, one radial WebGL transition, audio at t=0.';
			publishStatus();

			if (new URLSearchParams(location.search).get('autorun') === '1') {
				await runExport();
			}
		} catch (error) {
			status = error instanceof Error ? error.message : String(error);
			publishStatus();
		}
	});

	onDestroy(() => {
		transitionRenderer?.destroy();
		fromBuilder?.destroy();
		toBuilder?.destroy();
	});

	const rendererConfig = {
		environment: 'server' as const,
		autoPlay: false,
		loop: false,
		forceCanvas: false,
		serverRendererMode: 'webgl' as const,
		preferWebGL2: true,
		powerPreference: 'high-performance' as const,
		// Demo intentionally uses the browser's system Arial. Avoid external font traffic.
		fontProviders: [async () => null]
	};

	async function renderCompositeFrame(frameIndex: number) {
		if (!fromBuilder || !toBuilder || !transitionRenderer) return;
		const timestamp = frameIndex / BROWSER_SPIKE.fps;
		await Promise.all([fromBuilder.seek(timestamp), toBuilder.seek(timestamp)]);
		animatePixiOrb(fromBuilder, 'from-orb', frameIndex, 0);
		animatePixiOrb(toBuilder, 'to-orb', frameIndex, Math.PI / 5);
		const transitionProgress = Math.max(
			0,
			Math.min(
				1,
				(timestamp - BROWSER_SPIKE.transitionStart) /
					(BROWSER_SPIKE.transitionEnd - BROWSER_SPIKE.transitionStart)
			)
		);
		const result = transitionRenderer.render({
			transition: 'radial-wipe',
			from: fromBuilder.canvasContainer,
			to: toBuilder.canvasContainer,
			progress: transitionProgress,
			ratio: BROWSER_SPIKE.width / BROWSER_SPIKE.height,
			parameters: { softness: 0.025 }
		});
		if (result.fallbackReason) fallbackCount += 1;
	}

	function animatePixiOrb(
		builder: ISceneBuilder,
		componentId: string,
		frameIndex: number,
		phase: number
	) {
		const displayObject = builder.components.get(componentId)?.displayObject;
		if (!displayObject) return;
		const angle = phase + (frameIndex / (BROWSER_SPIKE.fps * 3)) * Math.PI * 2;
		const pulse = 0.92 + 0.08 * Math.sin(angle * 1.5);
		displayObject.rotation = angle;
		displayObject.scale.set(pulse);
		builder.app.renderer.render(builder.app.stage);
	}

	async function runExport() {
		if (running || !transitionRenderer) return;
		running = true;
		status = 'Preparing deterministic in-browser audio mix…';
		progress = 0;
		publishStatus();
		try {
			const audioBuffer = await mixBrowserAudio({
				duration: BROWSER_SPIKE.duration,
				tone: [
					{ start: 0, end: 10, frequency: 110, gain: 0.035 },
					{ start: 0, end: 4.95, frequency: 220, gain: 0.045, pan: -0.2 },
					{ start: 4, end: 10, frequency: 330, gain: 0.04, pan: 0.2 }
				]
			});
			status = 'Rendering directly into MediaBunny…';
			const result = await exportCanvasToMp4({
				canvas: transitionRenderer.canvas,
				width: BROWSER_SPIKE.width,
				height: BROWSER_SPIKE.height,
				fps: BROWSER_SPIKE.fps,
				duration: BROWSER_SPIKE.duration,
				videoBitrate: 6_000_000,
				audioBitrate: 160_000,
				audioBuffer,
				renderFrame: ({ frameIndex }) => renderCompositeFrame(frameIndex),
				onProgress: (nextProgress) => {
					progress = nextProgress;
					publishStatus();
				}
			});
			if (!result.buffer) throw new Error('MediaBunny returned no BufferTarget output');
			const blob = new Blob([result.buffer], { type: result.mimeType });
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = 'visualfries-browser-webgl-mediabunny-spike.mp4';
			anchor.click();
			setTimeout(() => URL.revokeObjectURL(url), 10_000);
			status = `Complete: ${result.frameCount} frames, ${(blob.size / 1_000_000).toFixed(1)} MB.`;
		} catch (error) {
			status = error instanceof Error ? error.message : String(error);
		} finally {
			running = false;
			publishStatus();
		}
	}

	function publishStatus() {
		(
			window as typeof window & {
				__VISUALFRIES_BROWSER_SPIKE__?: {
					status: string;
					progress: number;
					fallbackCount: number;
				};
			}
		).__VISUALFRIES_BROWSER_SPIKE__ = { status, progress, fallbackCount };
	}
</script>

<svelte:head>
	<title>VisualFries WebGL + MediaBunny browser export spike</title>
</svelte:head>

<main>
	<section>
		<p class="eyebrow">VisualFries browser-render spike</p>
		<h1>Pixi → WebGL transition → MediaBunny MP4</h1>
		<p>{capability}</p>
		<p>{status}</p>
		<progress max="1" value={progress}></progress>
		<button onclick={runExport} disabled={running || !transitionRenderer}>
			{running ? `Rendering ${Math.round(progress * 100)}%` : 'Render 10-second MP4'}
		</button>
		<p class="meta">Shader fallbacks: {fallbackCount}</p>
	</section>
	<div class="preview" bind:this={outputHost}></div>
	<div class="offscreen" aria-hidden="true">
		<div bind:this={fromRoot}></div>
		<div bind:this={toRoot}></div>
	</div>
</main>

<style>
	:global(body) { margin: 0; background: #05070b; color: #f8fafc; font-family: system-ui, sans-serif; }
	main { min-height: 100vh; display: grid; grid-template-columns: minmax(320px, 540px) minmax(280px, 430px); gap: 48px; align-items: center; justify-content: center; padding: 48px; box-sizing: border-box; }
	h1 { font-size: clamp(2rem, 5vw, 4rem); line-height: 0.98; margin: 12px 0 24px; }
	p { color: #a7b0c0; line-height: 1.5; }
	.eyebrow { color: #35d0ba; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; }
	progress { width: 100%; height: 14px; margin: 24px 0; accent-color: #35d0ba; }
	button { display: block; width: 100%; border: 0; border-radius: 12px; padding: 16px; background: #ffb703; color: #111827; font: inherit; font-weight: 900; cursor: pointer; }
	button:disabled { cursor: wait; opacity: .55; }
	.preview { width: min(100%, 405px); aspect-ratio: 9 / 16; border-radius: 18px; overflow: hidden; box-shadow: 0 28px 100px #000b; background: #111827; }
	.preview :global(canvas) { width: 100%; height: 100%; display: block; }
	.meta { font-size: .8rem; }
	.offscreen { position: fixed; left: -100000px; top: 0; width: 1080px; height: 1920px; pointer-events: none; }
	@media (max-width: 900px) { main { grid-template-columns: 1fr; padding: 24px; } .preview { justify-self: center; } }
</style>
