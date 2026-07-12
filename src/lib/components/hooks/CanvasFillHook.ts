import type {
	ColorComponent,
	GradientComponent,
	IComponentContext,
	IComponentHook,
	HookType
} from '$lib';
import type { StateManager } from '$lib/managers/StateManager.svelte.js';
import { computeXYAngle } from '$lib/utils/canvas.js';

/** Renders COLOR and GRADIENT schema components into a Pixi texture source. */
export class CanvasFillHook implements IComponentHook {
	types: HookType[] = ['setup', 'update', 'refresh', 'destroy'];
	priority = 1;
	#context!: IComponentContext;
	#canvas: HTMLCanvasElement | undefined;
	#state: StateManager;

	constructor(cradle: { stateManager: StateManager }) {
		this.#state = cradle.stateManager;
	}

	#draw() {
		if (!this.#canvas) return;
		const data = this.#context.data;
		if (data.type !== 'COLOR' && data.type !== 'GRADIENT') return;
		const ctx = this.#canvas.getContext('2d');
		if (!ctx) return;
		const { width, height } = data.appearance;
		ctx.clearRect(0, 0, width, height);

		if (data.type === 'COLOR') {
			ctx.fillStyle = (data as ColorComponent).appearance.background;
		} else {
			const definition = (data as GradientComponent).appearance.background;
			const gradient =
				definition.type === 'radial'
					? ctx.createRadialGradient(
							width / 2,
							height / 2,
							0,
							width / 2,
							height / 2,
							Math.max(width, height) / 2
						)
					: (() => {
							const { x1, y1, x2, y2 } = computeXYAngle(definition.angle ?? 180, width, height);
							return ctx.createLinearGradient(x1, y1, x2, y2);
						})();
			definition.colors.forEach((color, index) => {
				const stop = definition.stops?.[index] ?? (index / (definition.colors.length - 1)) * 100;
				gradient.addColorStop(Math.max(0, Math.min(1, stop / 100)), color);
			});
			ctx.fillStyle = gradient;
		}

		ctx.fillRect(0, 0, width, height);
		this.#context.getResource('pixiTexture')?.update();
		this.#state.markDirty();
	}

	async #setup() {
		const data = this.#context.data;
		if (data.type !== 'COLOR' && data.type !== 'GRADIENT') return;
		if (!this.#canvas) this.#canvas = document.createElement('canvas');
		this.#canvas.width = data.appearance.width;
		this.#canvas.height = data.appearance.height;
		this.#draw();
		this.#context.setResource('pixiResource', this.#canvas);
	}

	async #destroy() {
		this.#canvas?.remove();
		this.#canvas = undefined;
		this.#context.removeResource('pixiResource');
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;
		if (type === 'destroy') return this.#destroy();
		if (!this.#canvas || type === 'setup' || type === 'refresh') await this.#setup();
		else this.#draw();
	}
}
