import { Component } from '../components/Component.svelte.js';
export class PixiComponentBuilder {
    component;
    mediaHook;
    verifyMediaHook;
    imageHook;
    verifyImageHook;
    verifyGifHook;
    videoTextureHook;
    splitScreenHook;
    htmlTextHook;
    htmlAnimationHook;
    subtitlesHook;
    textureHook;
    objectHook;
    gifHook;
    canvasShapeHook;
    pixiProgressShapeHook;
    htmlToCanvasHook;
    animationHook;
    mediaSeekingHook;
    constructor(cradle) {
        this.component = cradle.component;
        this.mediaHook = cradle.mediaHook;
        this.verifyMediaHook = cradle.verifyMediaHook;
        this.imageHook = cradle.imageHook;
        this.verifyImageHook = cradle.verifyImageHook;
        this.verifyGifHook = cradle.verifyGifHook;
        this.videoTextureHook = cradle.videoTextureHook;
        this.splitScreenHook = cradle.splitScreenHook;
        this.htmlTextHook = cradle.htmlTextHook;
        this.htmlAnimationHook = cradle.htmlAnimationHook;
        this.animationHook = cradle.animationHook;
        this.subtitlesHook = cradle.subtitlesHook;
        this.textureHook = cradle.textureHook;
        this.objectHook = cradle.objectHook;
        this.gifHook = cradle.gifHook;
        this.canvasShapeHook = cradle.canvasShapeHook;
        this.pixiProgressShapeHook = cradle.pixiProgressShapeHook;
        this.htmlToCanvasHook = cradle.htmlToCanvasHook;
        this.mediaSeekingHook = cradle.mediaSeekingHook;
    }
    withCanvasShape() {
        this.component.addHook(this.canvasShapeHook);
        return this;
    }
    withProgressShape() {
        this.component.addHook(this.pixiProgressShapeHook);
        return this;
    }
    withMedia() {
        this.component.addHook(this.verifyMediaHook);
        this.component.addHook(this.mediaHook);
        return this;
    }
    withMediaSeeking() {
        this.component.addHook(this.mediaSeekingHook);
        return this;
    }
    withImage() {
        this.component.addHook(this.verifyImageHook);
        this.component.addHook(this.imageHook);
        return this;
    }
    withTexture() {
        this.component.addHook(this.textureHook);
        return this;
    }
    withDisplayObject() {
        this.component.addHook(this.objectHook);
        return this;
    }
    withVideoTexture() {
        this.component.addHook(this.videoTextureHook);
        return this;
    }
    withSplitScreen() {
        this.component.addHook(this.splitScreenHook);
        return this;
    }
    withHtmlText() {
        this.component.addHook(this.htmlTextHook);
        return this;
    }
    withAnimation() {
        this.component.addHook(this.animationHook);
        return this;
    }
    withHtmlAnimation() {
        this.component.addHook(this.htmlAnimationHook);
        return this;
    }
    withHtmlToCanvasHook() {
        this.component.addHook(this.htmlToCanvasHook);
        return this;
    }
    withSubtitles() {
        this.component.addHook(this.subtitlesHook);
        return this;
    }
    withGif() {
        this.component.addHook(this.verifyGifHook);
        this.component.addHook(this.gifHook);
        return this;
    }
    withShape() {
        return this;
    }
    getComponent() {
        return this.component;
    }
}
