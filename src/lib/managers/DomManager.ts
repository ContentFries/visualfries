import type { RenderEnvironment } from '$lib';
import { StateManager } from './StateManager.svelte.js';

export class DomManager {
	#canvas!: HTMLCanvasElement;
	#htmlContainer!: HTMLDivElement;
	#loader!: HTMLDivElement;

	private state: StateManager;
	private env: RenderEnvironment;
	private sceneContainer: HTMLDivElement;

	constructor(cradle: {
		stateManager: StateManager;
		environment: RenderEnvironment;
		containerElement: HTMLDivElement;
	}) {
		this.state = cradle.stateManager;
		this.env = cradle.environment; // Environment
		this.sceneContainer = cradle.containerElement; // ContainerElement
		this.#initialize();
	}

	public get canvas(): HTMLCanvasElement {
		return this.#canvas;
	}

	public get htmlContainer(): HTMLDivElement {
		return this.#htmlContainer;
	}

	#initialize() {
		this.#loader = this.sceneContainer.appendChild(document.createElement('div'));
		this.#loader.style.width = '100%';
		this.#loader.style.height = '100%';
		this.#loader.style.position = 'absolute';
		this.#loader.style.top = '0';
		this.#loader.style.left = '0';
		this.#loader.style.background = `
            linear-gradient(
                90deg,
                #f0f0f0 0%,
                #ccc 50%,
                #f0f0f0 100%
            )
        `;
		this.#loader.style.backgroundSize = '200% 100%';
		this.#loader.style.animation = 'shimmer 4s infinite linear';

		this.sceneContainer.style.overflow = 'hidden';
		this.sceneContainer.style.position = 'relative';

		this.#canvas = this.sceneContainer.appendChild(document.createElement('canvas'));
		this.#canvas.style.position = 'absolute';
		this.#canvas.style.pointerEvents = 'none';

		this.#htmlContainer = this.sceneContainer.appendChild(document.createElement('div'));
		this.#htmlContainer.style.transformOrigin = '0 0';
		this.#htmlContainer.style.transform = `scale(${this.state.scale})`;
		this.#htmlContainer.style.position = 'relative';
		this.#htmlContainer.style.width = this.state.width + 'px';
		this.#htmlContainer.style.height = this.state.height + 'px';

		if (this.env === 'server') {
			this.#htmlContainer.style.position = 'absolute';
			this.#htmlContainer.style.top = '-10000px';
			this.#htmlContainer.style.left = '-10000px';
		}
	}

	scale(scale: number) {
		const clampedScale = Math.max(0.01, Math.min(scale, 2));
        this.state.setScale(clampedScale);
        this.#htmlContainer.style.transform = `scale(${clampedScale})`;

		const { width, height } = this.state;
		this.sceneContainer.style.width = Math.round(width * clampedScale) + 'px';
		this.sceneContainer.style.height = Math.round(height * clampedScale) + 'px';
	}

    destroy() {
        this.#canvas.remove();
        this.#htmlContainer.remove();
        this.#loader?.remove();
    }

	removeLoader() {
		if (this.#loader) {
			this.#loader.remove();
		}
	}
}
