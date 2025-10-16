import type { Command } from './Command.js';
import { z } from 'zod';
import { StateManager } from '$lib/managers/StateManager.svelte.js';
import { DomManager } from '$lib/managers/DomManager.js';
import { AppManager } from '$lib/managers/AppManager.svelte.js';

const replaceSourceOnTimeSchema = z.object({
	format: z.enum(['arraybuffer', 'blob', 'png', 'jpg', 'jpeg']),
	quality: z.number().min(0).max(1),
	target: z.any()
});

export class RenderFrameCommand implements Command<string | ArrayBuffer | Blob | null> {
	private sceneState: StateManager;
	private domManager: DomManager;
	private appManager: AppManager;
	private lastRenderedFrame: string | ArrayBuffer | Blob | null = null;
	private lastRenderArgs: { format: string; quality: number; target: any } | null = null;

	constructor(cradle: {
		stateManager: StateManager;
		domManager: DomManager;
		appManager: AppManager;
	}) {
		this.sceneState = cradle.stateManager;
		this.domManager = cradle.domManager;
		this.appManager = cradle.appManager;
	}

	async execute(args: unknown): Promise<string | ArrayBuffer | Blob | null> {
		const check = replaceSourceOnTimeSchema.safeParse(args);
		if (!check.success) {
			return null;
		}

		const { format, quality, target } = check.data;

		// Server optimization: Return cached frame if nothing changed visually and render args match
		if (this.sceneState.environment === 'server' && !this.sceneState.isDirty) {
			if (this.lastRenderedFrame && this.lastRenderArgs) {
				// Check if render args match current args
				const argsMatch = this.lastRenderArgs.format === format &&
					this.lastRenderArgs.quality === quality &&
					this.lastRenderArgs.target === target;
				
				if (argsMatch) {
					return this.lastRenderedFrame;
				}
			}
		}

		let frame: string | ArrayBuffer | Blob | null = null;
		if (format === 'arraybuffer') {
			frame = (await new Promise((resolve, reject) => {
				requestAnimationFrame(() => {
					const context = this.domManager.canvas.getContext('2d');
					if (!context) {
						reject(new Error('Failed to get canvas context'));
						return;
					}
					const imagewidth = this.domManager.canvas.width;
					const imageheight = this.domManager.canvas.height;
					const imagedata = context.getImageData(0, 0, imagewidth, imageheight);
					const frame = imagedata.data.buffer;
					resolve(frame);
				});
			})) as ArrayBuffer;
		}

		if (format === 'blob') {
			frame = (await new Promise((resolve) => {
				requestAnimationFrame(() => {
					this.domManager.canvas.toBlob((blob) => {
						resolve(blob);
					});
				});
			})) as Blob | null;
		}

		if (format === 'png' || format === 'jpg' || format === 'jpeg') {
			frame =
				this.sceneState.environment === 'server'
					? ((await new Promise((resolve) => {
							requestAnimationFrame(() => {
								const frame =
									format === 'jpg' || format === 'jpeg'
										? this.domManager.canvas.toDataURL('image/jpeg', quality)
										: this.domManager.canvas.toDataURL();
								resolve(frame);
							});
						})) as string)
					: ((await new Promise((resolve) => {
							requestAnimationFrame(async () => {
								// Re-render in the RAF so video texture updates are included
								this.appManager.render();
								const b64 = await this.appManager.app.renderer.extract.base64(
									target || this.appManager.app.stage,
									format,
									quality
								);
								resolve(b64);
							});
						})) as string);
		}

		// Cache frame and render args, then clear dirty flag after successful render
		if (this.sceneState.environment === 'server') {
			this.lastRenderedFrame = frame;
			this.lastRenderArgs = { format, quality, target };
			this.sceneState.clearDirty();
		}

		return frame;
	}
}
