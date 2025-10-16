import * as PIXI from 'pixi.js-legacy';
import { ProgressRenderer } from './ProgressRenderer.js';
export class CustomProgressRenderer extends ProgressRenderer {
    config;
    constructor(context, width, height, config) {
        super(context, width, height);
        this.config = config;
    }
    update(progress) {
        // Use original dimensions, not the scaled display object dimensions
        const displayWidth = this.width;
        const displayHeight = this.height;
        // Progress bars only support solid colors - graphics drawing
        const graphics = this.displayObject;
        graphics.clear();
        const color = this.getSolidColor();
        const strokeWidth = this.config.strokeWidth || 4;
        // For custom progress, we'll create a simple implementation
        // that draws a path-based progress indicator
        // In a full implementation, you'd parse the SVG path data
        // and create a custom progress visualization
        graphics.lineStyle({
            width: strokeWidth,
            color: color,
            cap: this.config.capStyle === 'butt'
                ? PIXI.LINE_CAP.BUTT
                : this.config.capStyle === 'square'
                    ? PIXI.LINE_CAP.SQUARE
                    : PIXI.LINE_CAP.ROUND
        });
        // Simple implementation: draw a custom shape that fills based on progress
        // This is a placeholder - in practice you'd parse the pathData
        const centerX = displayWidth / 2;
        const centerY = displayHeight / 2;
        const radius = Math.min(displayWidth, displayHeight) / 4;
        // Draw a custom progress indicator
        // For now, we'll draw a star-like shape that fills based on progress
        const points = 5;
        const outerRadius = radius * 2;
        const innerRadius = radius;
        graphics.beginFill(color);
        graphics.moveTo(centerX, centerY - outerRadius * progress);
        for (let i = 0; i < points * 2; i++) {
            const angle = (Math.PI * i) / points - Math.PI / 2;
            const currentRadius = i % 2 === 0 ? outerRadius * progress : innerRadius * progress;
            const x = centerX + Math.cos(angle) * currentRadius;
            const y = centerY + Math.sin(angle) * currentRadius;
            graphics.lineTo(x, y);
        }
        graphics.closePath();
        graphics.endFill();
    }
}
