import * as PIXI from 'pixi.js-legacy';
import { ColorTypeShape, GradientDefinitionShape } from '..';
import tinycolor from 'tinycolor2';
export class PixiColorTransformer {
    static transform(background, width, height) {
        if (!background) {
            return { type: 'solid', color: 0x000000 };
        }
        // Extract the actual color from the background
        const color = this.#extractColor(background);
        if (!color) {
            return { type: 'solid', color: 0x000000 };
        }
        const resp = ColorTypeShape.safeParse(color);
        if (!resp.success) {
            return { type: 'solid', color: 0x000000 };
        }
        // Handle solid color
        if (typeof resp.data === 'string') {
            const output = tinycolor(resp.data);
            if (output.isValid()) {
                if (output.getAlpha() === 0) {
                    return { type: 'solid', color: 0x000000 };
                }
                return { type: 'solid', color: parseInt(output.toHex(), 16) };
            }
            return { type: 'solid', color: 0x000000 };
        }
        // Handle gradient
        if (resp.data.type === 'linear' || resp.data.type === 'radial') {
            const gradient = GradientDefinitionShape.safeParse(resp.data);
            if (!gradient.success) {
                return { type: 'solid', color: 0x000000 };
            }
            const canvas = this.#createGradientCanvas(gradient.data, width, height);
            const texture = PIXI.Texture.from(canvas);
            return { type: 'gradient', texture, width, height };
        }
        return { type: 'solid', color: 0x000000 };
    }
    static #extractColor(background) {
        if (!background)
            return null;
        // If it's a direct ColorType (string or gradient object)
        if (typeof background === 'string' ||
            (typeof background === 'object' && 'type' in background)) {
            return background;
        }
        // If it's a BgShape object
        if (typeof background === 'object' && 'enabled' in background) {
            const bgShape = background;
            if (!bgShape.enabled)
                return null;
            return bgShape.color;
        }
        return null;
    }
    static #createGradientCanvas(gradient, width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const colorsWithStops = gradient.colors.map((col, index) => {
            if (gradient.stops?.[index] !== undefined) {
                return { color: col, stop: gradient.stops[index] / 100 };
            }
            return { color: col, stop: index / (gradient.colors.length - 1) };
        });
        if (gradient.type === 'linear') {
            const angle = gradient.angle !== undefined ? gradient.angle : 0;
            const rad = (angle * Math.PI) / 180;
            const x1 = (Math.cos(rad) * width) / 2 + width / 2;
            const y1 = (Math.sin(rad) * height) / 2 + height / 2;
            const gradientObj = ctx.createLinearGradient(width / 2, height / 2, x1, y1);
            colorsWithStops.forEach(({ color, stop }) => {
                gradientObj.addColorStop(stop, color);
            });
            ctx.fillStyle = gradientObj;
            ctx.fillRect(0, 0, width, height);
        }
        else if (gradient.type === 'radial') {
            // For radial gradients, we'll use a simplified approach
            // PIXI doesn't have native radial gradient support, so we create a linear approximation
            const gradientObj = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 2);
            colorsWithStops.forEach(({ color, stop }) => {
                gradientObj.addColorStop(stop, color);
            });
            ctx.fillStyle = gradientObj;
            ctx.fillRect(0, 0, width, height);
        }
        return canvas;
    }
    static isGradient(background) {
        if (!background)
            return false;
        const color = this.#extractColor(background);
        if (!color)
            return false;
        const resp = ColorTypeShape.safeParse(color);
        if (!resp.success)
            return false;
        return (typeof resp.data === 'object' && (resp.data.type === 'linear' || resp.data.type === 'radial'));
    }
}
