import { StateManager } from '../managers/StateManager.svelte.js';
export class ComponentDirector {
    builder;
    data;
    sceneState;
    constructor(cradle) {
        this.sceneState = cradle.stateManager;
    }
    setBuilder(builder) {
        this.builder = builder;
    }
    setComponentData(data) {
        this.data = data;
    }
    constructAuto() {
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
        this.builder.withMedia().withMediaSeeking();
        // if (this.sceneState.environment === 'server') {
        // 	this.builder.withMediaSeeking();
        // }
        this.builder.withVideoTexture().withSplitScreen();
        return this.builder.getComponent();
    }
    constructAudio() {
        this.builder.withMedia();
        return this.builder.getComponent();
    }
    constructImage() {
        this.builder.withImage().withTexture().withDisplayObject();
        return this.builder.getComponent();
    }
    constructGif() {
        this.builder.withGif(); //.withDisplayObject();
        return this.builder.getComponent();
    }
    constructShape() {
        // Check if this is a progress shape to use the appropriate hook
        const shapeData = this.data;
        if (shapeData.shape?.type === 'progress') {
            // Progress shapes use GPU-based PIXI Graphics rendering
            // Still need DisplayObjectHook to add the progress display object to the stage
            this.builder.withProgressShape().withDisplayObject();
        }
        else {
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
