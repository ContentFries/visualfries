import type { IComponentContext, IComponentHook, HookType } from '$lib';
import { computeXYAngle } from '$lib/utils/canvas.js';
import type { ShapeComponent } from '$lib';
import { StateManager } from '$lib/managers/StateManager.svelte.js';

export class CanvasShapeHook implements IComponentHook {
	types: HookType[] = ['setup', 'update', 'destroy'];
	priority: number = 1;
	#context!: IComponentContext;
	#resource!: HTMLCanvasElement;
	#width!: number;
	#height!: number;
	private state: StateManager;

	constructor(cradle: { stateManager: StateManager }) {
		this.state = cradle.stateManager;
	}
	#shapeRenderers = new Map<string, (ctx: CanvasRenderingContext2D) => void>([
		['rectangle', this.#renderRectangle.bind(this)],
		['circle', this.#renderCircle.bind(this)],
		['triangle', this.#renderTriangle.bind(this)],
		['star', this.#renderStar.bind(this)],
		['ellipse', this.#renderEllipse.bind(this)],
		['polygon', this.#renderPolygon.bind(this)],
		['path', this.#renderPath.bind(this)]
	]);

	#renderShape(ctx: CanvasRenderingContext2D) {
		if (this.#context.data.type !== 'SHAPE') return;
		const shapeData = this.#context.data as ShapeComponent;
		const renderer = this.#shapeRenderers.get(shapeData.shape.type);
		if (renderer) {
			renderer(ctx);
		}
	}

	#renderRectangle(ctx: CanvasRenderingContext2D) {
		this.#applyFill(ctx);
		ctx.fillRect(0, 0, this.#width, this.#height);
	}

	#renderEllipse(ctx: CanvasRenderingContext2D) {
		this.#applyFill(ctx);
		const centerX = this.#width / 2;
		const centerY = this.#height / 2;
		const radiusX = this.#width / 2;
		const radiusY = this.#height / 2;

		ctx.beginPath();
		ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
		ctx.fill();
	}

	#renderPolygon(ctx: CanvasRenderingContext2D) {
		if (this.#context.data.type !== 'SHAPE') return;
		const shapeData = this.#context.data as ShapeComponent;

		// Handle new schema structure
		const points = 'points' in shapeData.shape ? shapeData.shape.points : [];
		if (!points || points.length < 3) return;

		this.#applyFill(ctx);
		ctx.beginPath();
		ctx.moveTo(points[0].x, points[0].y);

		for (let i = 1; i < points.length; i++) {
			ctx.lineTo(points[i].x, points[i].y);
		}

		ctx.closePath();
		ctx.fill();
	}

	#renderPath(ctx: CanvasRenderingContext2D) {
		if (this.#context.data.type !== 'SHAPE') return;
		const shapeData = this.#context.data as ShapeComponent;

		// Handle new schema structure
		const pathData = 'pathData' in shapeData.shape ? shapeData.shape.pathData : '';
		if (!pathData) return;

		this.#applyFill(ctx);
		const path = new Path2D(pathData);
		ctx.fill(path);
	}

	#renderCircle(ctx: CanvasRenderingContext2D) {
		this.#applyFill(ctx);
		const centerX = this.#width / 2;
		const centerY = this.#height / 2;
		const radius = Math.min(this.#width, this.#height) / 2;

		ctx.beginPath();
		ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
		ctx.fill();
	}

	#renderTriangle(ctx: CanvasRenderingContext2D) {
		this.#applyFill(ctx);

		ctx.beginPath();
		ctx.moveTo(this.#width / 2, 0);
		ctx.lineTo(this.#width, this.#height);
		ctx.lineTo(0, this.#height);
		ctx.closePath();
		ctx.fill();
	}

	#renderStar(ctx: CanvasRenderingContext2D) {
		this.#applyFill(ctx);

		const centerX = this.#width / 2;
		const centerY = this.#height / 2;
		const outerRadius = Math.min(this.#width, this.#height) / 2;
		const innerRadius = outerRadius * 0.4;
		const spikes = 5;

		ctx.beginPath();
		ctx.moveTo(centerX, centerY - outerRadius);

		for (let i = 0; i < spikes * 2; i++) {
			const radius = i % 2 === 0 ? outerRadius : innerRadius;
			const angle = (Math.PI * i) / spikes - Math.PI / 2;
			const x = centerX + Math.cos(angle) * radius;
			const y = centerY + Math.sin(angle) * radius;
			ctx.lineTo(x, y);
		}

		ctx.closePath();
		ctx.fill();
	}

	#applyFill(ctx: CanvasRenderingContext2D) {
		if (this.#context.data.type !== 'SHAPE') return;

		const shapeData = this.#context.data as ShapeComponent;
		const appearance = shapeData.appearance;
		const background = appearance.background;

		// If background is a gradient object
		if (
			background &&
			typeof background === 'object' &&
			'colors' in background &&
			Array.isArray(background.colors) &&
			background.colors.length > 1
		) {
			const { colors, angle } = background as any;
			const { x1, y1, x2, y2 } = computeXYAngle(angle, this.#width, this.#height);
			const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
			gradient.addColorStop(0, colors[0]);
			gradient.addColorStop(1, colors[1]);
			ctx.fillStyle = gradient;
			return;
		}

		const fill = (appearance as any).fill;
		const color = (appearance as any).color;
		if (fill) {
			ctx.fillStyle = fill;
		} else if (color) {
			ctx.fillStyle = color;
		} else {
			ctx.fillStyle = '#000000'; // Default to black if no fill specified
		}
	}

	async #handleSetup() {
		if (this.#resource) {
			return;
		}
		if (this.#context.data.type !== 'SHAPE') return;
		const shapeData = this.#context.data as ShapeComponent;
		const { width, height } = shapeData.appearance;
		this.#width = width;
		this.#height = height;

		const resource = document.createElement('canvas');
		resource.width = width;
		resource.height = height;

		const ctx = resource.getContext('2d');
		ctx?.clearRect(0, 0, width, height);

		// this logic will differ by the type of element type given
		if (ctx) {
			this.#renderShape(ctx);
		}

		this.#resource = resource;
		this.#context.setResource('pixiResource', resource);
	}

	async #handleDestroy() {
		// remove event listeners from video
		this.#resource.remove();
	}

	async #handleUpdate() {
		if (!this.#resource) {
			// Recreate the canvas if it doesn't exist
			await this.#handleSetup();
		}
		if (this.#context.data.type !== 'SHAPE') return;

		const shapeData = this.#context.data as ShapeComponent;

		// Skip progress shapes - they're handled by PixiProgressShapeHook
		if (shapeData.shape.type === 'progress') return;

		const ctx = this.#resource.getContext('2d');
		if (ctx) {
			// Only static shapes need texture updates (for dynamic content like animations)
			// Clear and re-render if needed
			ctx.clearRect(0, 0, this.#width, this.#height);
			this.#renderShape(ctx);

			// Force PIXI texture update
			const pixiTexture = this.#context.getResource('pixiTexture');
			if (pixiTexture) {
				pixiTexture.update();
				// Mark dirty when shape is re-rendered
				this.state.markDirty();
			}
		}
	}

	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;
		if (this.#context.data.type !== 'SHAPE') return;
		const shapeData = this.#context.data as ShapeComponent;

		// Skip progress shapes - they're handled by PixiProgressShapeHook
		if (shapeData.shape.type === 'progress') return;

		const supportedTypes = [
			'rectangle',
			'triangle',
			'circle',
			'star',
			'ellipse',
			'polygon',
			'path'
		];
		if (!supportedTypes.includes(shapeData.shape.type)) {
			console.error(
				'CanvasShapeHook: Unsupported shape type: ' +
					shapeData.shape.type +
					'. Supported types are ' +
					supportedTypes.join(', ') +
					'. Progress shapes are handled by PixiProgressShapeHook.'
			);
			return;
		}

		if (type === 'setup') {
			return await this.#handleSetup();
		} else if (type === 'destroy') {
			return await this.#handleDestroy();
		}

		await this.#handleUpdate();
	}
}
