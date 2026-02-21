import type { IComponentBuilder, ComponentData } from '$lib';
import { StateManager } from '$lib/managers/StateManager.svelte.js';
import { DeterministicMediaManager } from '$lib/managers/DeterministicMediaManager.js';

export class ComponentDirector {
	private builder!: IComponentBuilder;
	private data!: ComponentData;
	private sceneState: StateManager;
	private deterministicMediaManager: DeterministicMediaManager;

	constructor(cradle: {
		stateManager: StateManager;
		deterministicMediaManager: DeterministicMediaManager;
	}) {
		this.sceneState = cradle.stateManager;
		this.deterministicMediaManager = cradle.deterministicMediaManager;
	}

	private get shouldUseDeterministicMedia(): boolean {
		return this.sceneState.environment === 'server' && this.deterministicMediaManager.isEnabled();
	}

	public setBuilder(builder: IComponentBuilder): void {
		this.builder = builder;
	}

	public setComponentData(data: ComponentData) {
		this.data = data;
	}

	public constructAuto() {
		switch (this.data.type) {
			case 'VIDEO':
				return this.constructVideo();
			case 'AUDIO':
				return this.constructAudio();
			case 'IMAGE':
				return this.constructImage();
			case 'GIF':
				return this.constructGif();
			case 'SHAPE':
				return this.constructShape();
			case 'SUBTITLES':
				return this.constructSubtitle();
			case 'TEXT':
				return this.constructText();
			case 'COLOR':
			case 'GRADIENT':
				return this.builder.getComponent();
			default:
				throw new Error(`Unsupported component type`);
		}
	}

	constructVideo() {
		if (this.shouldUseDeterministicMedia) {
			this.builder.withDeterministicMedia().withTexture().withSplitScreen();
			return this.builder.getComponent();
		}

		this.builder.withMedia().withMediaSeeking();
		this.builder.withVideoTexture().withSplitScreen();

		return this.builder.getComponent();
	}

	constructAudio() {
		this.builder.withMedia();

		return this.builder.getComponent();
	}

	constructImage() {
		this.builder.withImage().withTexture().withSplitScreen();

		return this.builder.getComponent();
	}

	constructGif() {
		if (this.shouldUseDeterministicMedia) {
			this.builder.withDeterministicMedia().withTexture().withDisplayObject();
			return this.builder.getComponent();
		}
		this.builder.withGif(); //.withDisplayObject();

		return this.builder.getComponent();
	}

	constructShape() {
		// Check if this is a progress shape to use the appropriate hook
		const shapeData = this.data as any;
		if (shapeData.shape?.type === 'progress') {
			// Progress shapes use GPU-based PIXI Graphics rendering
			// Still need DisplayObjectHook to add the progress display object to the stage
			this.builder.withProgressShape().withDisplayObject();
		} else {
			// Regular shapes use canvas-based rendering
			this.builder.withCanvasShape().withTexture().withDisplayObject();
		}

		return this.builder.getComponent();
	}

	constructSubtitle() {
		this.builder.withSubtitles().withHtmlText().withAnimation();
		if (this.sceneState.environment === 'server') {
			this.builder.withHtmlToCanvasHook();
		}

		return this.builder.getComponent();
	}

	constructText() {
		this.builder.withHtmlText().withAnimation();
		if (this.sceneState.environment === 'server') {
			this.builder.withHtmlToCanvasHook();
		}

		return this.builder.getComponent();
	}
}
