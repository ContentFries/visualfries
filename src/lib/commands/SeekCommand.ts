import type { Command } from './Command.js';
import { z } from 'zod';
import { TimelineManager } from '$lib/managers/TimelineManager.svelte.js';
import { StateManager } from '$lib/managers/StateManager.svelte.js';
import { RenderManager } from '$lib/managers/RenderManager.js';
import { ComponentsManager } from '$lib/managers/ComponentsManager.svelte.js';
import { DeterministicMediaManager } from '$lib/managers/DeterministicMediaManager.js';

const seekSchema = z.object({
	time: z.number()
});

export class SeekCommand implements Command {
	private timeline: TimelineManager;
	private state: StateManager;
	private renderManager: RenderManager;
	private componentsManager: ComponentsManager;
	private deterministicMediaManager: DeterministicMediaManager;
	#didAwaitFontsReady = false;

	constructor(cradle: {
		timelineManager: TimelineManager;
		stateManager: StateManager;
		renderManager: RenderManager;
		componentsManager: ComponentsManager;
		deterministicMediaManager: DeterministicMediaManager;
	}) {
		this.timeline = cradle.timelineManager;
		this.state = cradle.stateManager;
		this.renderManager = cradle.renderManager;
		this.componentsManager = cradle.componentsManager;
		this.deterministicMediaManager = cradle.deterministicMediaManager;
	}

	#isDeterministicMediaComponent(component: {
		type: string;
		props: { timeline: { startAt: number; endAt: number } };
		context: {
			isActive: boolean;
			getResource: (key: 'pixiTexture' | 'pixiRenderObject' | 'videoElement' | 'imageElement') => unknown;
			data?: { effects?: { map?: Record<string, unknown> } };
		};
	}): boolean {
		return component.type === 'VIDEO' || component.type === 'GIF';
	}

	#hasBlurEffect(component: {
		context: { data?: { effects?: { map?: Record<string, unknown> } } };
	}): boolean {
		const effectsMap = component.context.data?.effects?.map ?? {};
		if ('fillBackgroundBlur' in effectsMap) {
			return true;
		}

		for (const effect of Object.values(effectsMap)) {
			const entry = effect as { type?: string };
			if (entry.type === 'fillBackgroundBlur') {
				return true;
			}
		}
		return false;
	}

	#getPendingDeterministicComponents(): string[] {
		const components = this.componentsManager.getAll();
		const pending: string[] = [];

		for (const component of components) {
			if (!this.#isDeterministicMediaComponent(component as any)) {
				continue;
			}
			if (!component.context.isActive) {
				continue;
			}

			const pixiTexture = component.context.getResource('pixiTexture');
			const pixiRenderObject = component.context.getResource('pixiRenderObject');
			if (!pixiTexture || !pixiRenderObject) {
				pending.push(component.id);
				continue;
			}

			if (this.#hasBlurEffect(component as any)) {
				const sourceElement =
					component.context.getResource('videoElement') || component.context.getResource('imageElement');
				if (!sourceElement) {
					pending.push(component.id);
				}
			}
		}

		return pending;
	}

	#getCurrentSceneFrameIndex(): number {
		const fps = this.state.data?.settings?.fps || 30;
		const currentTime = this.state.currentTime ?? 0;
		return Math.max(0, Math.round(currentTime * fps));
	}

	async #delay(ms: number): Promise<void> {
		if (ms <= 0) {
			const immediate = (globalThis as { setImmediate?: (cb: () => void) => unknown }).setImmediate;
			if (typeof immediate === 'function') {
				await new Promise<void>((resolve) => {
					immediate(resolve);
				});
				return;
			}
			await Promise.resolve();
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, ms));
	}

	async #awaitFontsReadyOnce(): Promise<void> {
		if (this.#didAwaitFontsReady) {
			return;
		}
		this.#didAwaitFontsReady = true;
		if (typeof document === 'undefined' || !document.fonts?.ready) {
			return;
		}

		try {
			await Promise.race([
				document.fonts.ready,
				new Promise((resolve) => setTimeout(resolve, 2000))
			]);
		} catch {
			// Font readiness is best-effort in seek path.
		}
	}

	async #renderUntilDeterministicReady(): Promise<void> {
		const pendingBeforeRetry = this.#getPendingDeterministicComponents();
		if (pendingBeforeRetry.length === 0) {
			return;
		}

		const maxAttempts = this.deterministicMediaManager.config.seekMaxAttempts ?? 4;
		const readyYieldMs = this.deterministicMediaManager.config.readyYieldMs ?? 0;
		const sceneFrameIndex = this.#getCurrentSceneFrameIndex();
		let pending = pendingBeforeRetry;

		for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
			this.deterministicMediaManager.recordReadyAttempt(sceneFrameIndex);
			this.deterministicMediaManager.recordExtraRenderPass(sceneFrameIndex);
			await this.#delay(readyYieldMs);
			await this.renderManager.render();
			pending = this.#getPendingDeterministicComponents();
			if (pending.length === 0) {
				return;
			}
		}

		if (pending.length > 0) {
			throw new Error(
				`Deterministic media was not ready after seek for active components: ${pending.join(', ')}`
			);
		}
	}

	async execute(args: unknown): Promise<void> {
		const check = seekSchema.safeParse(args);
		if (!check.success) {
			return;
		}

		const time = Math.max(0, Math.min(check.data.time, this.state.duration));
		this.timeline.seek(time);

		// Ensure a deterministic render on server after seek to advance media frames
		if (this.state.environment === 'server') {
			const deterministicEnabled = this.deterministicMediaManager.isEnabled();
			if (deterministicEnabled) {
				await this.#awaitFontsReadyOnce();
			}

			const readyYieldMs = this.deterministicMediaManager.config.readyYieldMs ?? 0;
			const loadingMaxAttempts = this.deterministicMediaManager.config.loadingMaxAttempts ?? 2;
			const sceneFrameIndex = this.#getCurrentSceneFrameIndex();

			await this.renderManager.render();
			for (let i = 0; i < loadingMaxAttempts && this.state.state === 'loading'; i += 1) {
				this.deterministicMediaManager.recordExtraRenderPass(sceneFrameIndex);
				await this.#delay(readyYieldMs);
				await this.renderManager.render();
			}

			if (this.state.state === 'loading') {
				console.warn('SeekCommand: Max render attempts exhausted while still loading');
			}

			// Re-seek to apply correct animation state to any animations
			// that were added during the render passes above.
			// This fixes the race condition where subtitle animations are added
			// AFTER the initial seek, causing them to miss their initial state.
			this.timeline.seek(time);

			if (deterministicEnabled) {
				await this.#renderUntilDeterministicReady();
			} else {
				await this.renderManager.render();
			}
		}
	}
}
