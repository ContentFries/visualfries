import * as PIXI from 'pixi.js-legacy';
import type { IComponentContext } from '$lib';
import type { DoubleProgressConfig } from '$lib';
import { ProgressRenderer } from './ProgressRenderer.js';

export class DoubleProgressRenderer extends ProgressRenderer {
	constructor(
		context: IComponentContext,
		width: number,
		height: number,
		private config: DoubleProgressConfig
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

		const color = this.getSolidColor();
		const strokeWidth = 4; // Default stroke width for double progress

		graphics.lineStyle({
			width: strokeWidth,
			color: color,
			cap: PIXI.LINE_CAP.ROUND
		});

		// Draw each progress path
		this.config.paths.forEach((path) => {
			const pathProgress = progress; // Could be different for each path in the future
			const offset = path.offset || 0;

			let startX = 0,
				startY = 0,
				endX = 0,
				endY = 0;

			// Calculate path coordinates based on position
			switch (path.position) {
				case 'top':
					startX = 0;
					startY = offset;
					endX = displayWidth;
					endY = offset;
					break;
				case 'bottom':
					startX = 0;
					startY = displayHeight - offset;
					endX = displayWidth;
					endY = displayHeight - offset;
					break;
				case 'left':
					startX = offset;
					startY = 0;
					endX = offset;
					endY = displayHeight;
					break;
				case 'right':
					startX = displayWidth - offset;
					startY = 0;
					endX = displayWidth - offset;
					endY = displayHeight;
					break;
			}

			// Apply reverse if needed
			if (path.reverse) {
				[startX, startY, endX, endY] = [endX, endY, startX, startY];
			}

			// Calculate progress point
			const progressDistance =
				pathProgress * Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
			const ratio =
				progressDistance / Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));

			const progressX = startX + (endX - startX) * ratio;
			const progressY = startY + (endY - startY) * ratio;

			// Draw the progress line
			graphics.moveTo(startX, startY);
			graphics.lineTo(progressX, progressY);
		});
	}
}
