import * as PIXI from 'pixi.js-legacy';
import { PixiColorTransformer } from '../../../../transformers/PixiColorTransformer.js';
/**
 * Base class for progress renderers
 */
export class ProgressRenderer {
    context;
    displayObject;
    width;
    height;
    isGradient;
    constructor(context, width, height) {
        this.context = context;
        this.width = width;
        this.height = height;
        this.isGradient = this.#checkIsGradient();
        this.displayObject = this.#createDisplayObject();
    }
    #checkIsGradient() {
        const background = this.context.data.appearance.background;
        const isGradient = PixiColorTransformer.isGradient(background);
        // For now, progress bars don't support gradients - fallback to solid color
        if (isGradient) {
            console.warn('Progress bars currently only support solid colors. Using fallback color.');
            return false;
        }
        return isGradient;
    }
    #createDisplayObject() {
        // TODO - implement always active background
        // const background = (this.context.data as ShapeComponent).appearance.background;
        // For progress bars, always use Graphics (solid colors only)
        const graphics = new PIXI.Graphics();
        // // Get solid color - if gradient is passed, extract first color as fallback
        // if (PixiColorTransformer.isGradient(background)) {
        // 	// Extract first color from gradient as fallback
        // 	if (
        // 		typeof background === 'object' &&
        // 		background &&
        // 		'stops' in background &&
        // 		background.stops &&
        // 		background.stops.length > 0
        // 	) {
        // 		const firstStop = background.stops[0];
        // 		if (firstStop && 'color' in firstStop) {
        // 			const colorResult = PixiColorTransformer.transform(
        // 				firstStop.color,
        // 				this.width,
        // 				this.height
        // 			);
        // 			color = colorResult.color || 0x000000;
        // 		}
        // 	}
        // } else {
        // 	// Use solid color normally
        // 	const colorResult = PixiColorTransformer.transform(background, this.width, this.height);
        // 	color = colorResult.color || 0x000000;
        // }
        graphics.beginFill(0x00000001, 0.0000000001);
        graphics.drawRect(0, 0, this.width, this.height);
        return graphics;
    }
    getSolidColor() {
        const defaulColor = 0x000000;
        const background = this.context.data.appearance.color;
        if (PixiColorTransformer.isGradient(background)) {
            console.warn('Progress bars currently only support solid colors. Using fallback color.');
            return defaulColor;
        }
        return background;
    }
    getDisplayObject() {
        return this.displayObject;
    }
}
