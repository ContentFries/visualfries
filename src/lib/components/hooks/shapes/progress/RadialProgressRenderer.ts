import * as PIXI from 'pixi.js-legacy';
import type { IComponentContext } from '$lib';
import type { RadialProgressConfig } from '$lib';
import { ProgressRenderer } from './ProgressRenderer.js';

export class RadialProgressRenderer extends ProgressRenderer {
	constructor(
		context: IComponentContext,
		width: number,
		height: number,
		private config: RadialProgressConfig
	) {
		super(context, width, height);
	}

	update(progress: number): void {
		// Use original dimensions, not the scaled display object dimensions
		const displayWidth = this.width;
		const displayHeight = this.height;

		// Progress bars only support solid colors - graphics drawing
		const graphics = this.displayObject as PIXI.Graphics;
		graphics.clear();

		const centerX = displayWidth / 2;
		const centerY = displayHeight / 2;
		const radius = Math.min(displayWidth, displayHeight) / 2;
		const innerRadius = (this.config.innerRadius || 0) * radius;
		const strokeWidth = this.config.strokeWidth || 4;

		// Convert start angle from degrees to radians
		const startAngleRad = ((this.config.startAngle || -90) * Math.PI) / 180;
		const clockwise = this.config.clockwise !== false; // default to true

		// Calculate the end angle based on progress
		const angleRange = 2 * Math.PI; // Full circle
		const endAngleRad = startAngleRad + (clockwise ? progress : -progress) * angleRange;

		const color = this.getSolidColor();

		if (innerRadius > 0) {
			// Ring style - draw arc
			graphics.lineStyle({
				width: strokeWidth,
				color: color,
				cap:
					this.config.capStyle === 'butt'
						? PIXI.LINE_CAP.BUTT
						: this.config.capStyle === 'square'
							? PIXI.LINE_CAP.SQUARE
							: PIXI.LINE_CAP.ROUND
			});
			graphics.arc(centerX, centerY, radius, startAngleRad, endAngleRad, !clockwise);
		} else {
			// Filled circle style - draw pie slice
			graphics.beginFill(color);
			graphics.moveTo(centerX, centerY);
			graphics.arc(centerX, centerY, radius, startAngleRad, endAngleRad, !clockwise);
			graphics.lineTo(centerX, centerY);
			graphics.endFill();
		}
	}
}
