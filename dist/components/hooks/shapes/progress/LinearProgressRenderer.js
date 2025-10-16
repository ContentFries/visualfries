import * as PIXI from 'pixi.js-legacy';
import { ProgressRenderer } from './ProgressRenderer.js';
export class LinearProgressRenderer extends ProgressRenderer {
    config;
    constructor(context, width, height, config) {
        super(context, width, height);
        this.config = config;
    }
    update(progress) {
        const amount = this.config.reverse ? 1 - progress : progress;
        // current dimensions after placement
        const displayWidth = this.width;
        const displayHeight = this.height;
        const color = this.getSolidColor();
        // solid color graphics
        const graphics = this.displayObject;
        graphics.clear();
        // fix for legacy pixi renderer - without this it does not work as expected!!! this sets the right boundaries for rects to work
        // graphics.beginFill(color);
        graphics.beginFill(0x00000001, 0.0000000001);
        graphics.drawRect(0, 0, displayWidth, displayHeight);
        graphics.endFill();
        const originalX = graphics.x;
        const originalY = graphics.y;
        let x = 0, y = 0, w = 0, h = 0;
        if (this.config.direction === 'horizontal') {
            w = displayWidth * amount;
            h = displayHeight;
            switch (this.config.anchor) {
                case 'center':
                    x = originalX + (displayWidth - w) / 2;
                    break;
                case 'end':
                    x = originalX + displayWidth - w;
                    break;
                default:
                    x = originalX;
            }
            y = originalY;
        }
        else {
            w = displayWidth;
            h = displayHeight * amount;
            switch (this.config.anchor) {
                case 'center':
                    y = originalY + (displayHeight - h) / 2;
                    break;
                case 'end':
                    y = originalY + displayHeight - h;
                    break;
                default:
                    y = originalY;
            }
            x = originalX;
        }
        if (w > 0 && h > 0) {
            graphics.beginFill(color).drawRect(0, 0, w, h).endFill();
        }
    }
}
