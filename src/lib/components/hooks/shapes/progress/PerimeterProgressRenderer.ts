import * as PIXI from 'pixi.js-legacy';
import type { IComponentContext } from '$lib';
import type { PerimeterProgressConfig } from '$lib';
import { ProgressRenderer } from './ProgressRenderer.js';

export class PerimeterProgressRenderer extends ProgressRenderer {
	constructor(
		context: IComponentContext,
		width: number,
		height: number,
		private config: PerimeterProgressConfig
	) {
		super(context, width, height);
	}

	update(progress: number): void {
		const displayWidth = this.width;
		const displayHeight = this.height;

		const graphics = this.displayObject as PIXI.Graphics;

		// fix for legacy pixi renderer - without this it does not work as expected!!! this sets the right boundaries for rects to work
		// graphics.clear();
		// graphics.beginFill(0x00000001, 0.0000000001);
		// graphics.drawRect(0, 0, displayWidth, displayHeight);
		// graphics.endFill();

		const strokeWidth = this.config.strokeWidth || 4;
		const clockwise = this.config.clockwise !== false;
		const startCorner = this.config.startCorner || 'top-left';
		const color = this.getSolidColor();

		const perimeter = 2 * (displayWidth + displayHeight);
		let remainingDistance = progress * perimeter;

		const rectangles = this.getRectanglesForStartCorner(
			startCorner as 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left',
			displayWidth,
			displayHeight,
			strokeWidth,
			clockwise
		);

		let drawnLength = 0;

		for (const rect of rectangles) {
			if (remainingDistance <= 0) break;

			const edgeLength = rect.length;
			const isPartial = remainingDistance < edgeLength;

			if (isPartial) {
				const ratio = remainingDistance / edgeLength;
				graphics.beginFill(color);

				if (rect.isHorizontal) {
					const partialWidth = rect.width * ratio;
					if (rect.reverse) {
						const startX = rect.x + rect.width - partialWidth;
						graphics.drawRect(startX, rect.y, partialWidth, rect.height);
					} else {
						graphics.drawRect(rect.x, rect.y, partialWidth, rect.height);
					}
				} else {
					// Vertical
					const partialHeight = rect.height * ratio;
					if (rect.reverse) {
						const startY = rect.y + rect.height - partialHeight;
						graphics.drawRect(rect.x, startY, rect.width, partialHeight);
					} else {
						graphics.drawRect(rect.x, rect.y, rect.width, partialHeight);
					}
				}
				graphics.endFill();
				remainingDistance = 0;
			} else {
				graphics.beginFill(color);
				graphics.drawRect(rect.x, rect.y, rect.width, rect.height);
				graphics.endFill();
				remainingDistance -= edgeLength;
			}
			drawnLength += edgeLength;
		}
	}

	private getRectanglesForStartCorner(
		startCorner: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left',
		width: number,
		height: number,
		strokeWidth: number,
		clockwise: boolean
	) {
		// Define 4 rectangles, one for each edge
		const allRectangles = {
			// Top rectangle (left to right)
			topLR: {
				x: 0,
				y: 0,
				width: width,
				height: strokeWidth,
				length: width,
				isHorizontal: true,
				reverse: false
			},
			// Top rectangle (right to left)
			topRL: {
				x: 0,
				y: 0,
				width: width,
				height: strokeWidth,
				length: width,
				isHorizontal: true,
				reverse: true
			},
			// Right rectangle (top to bottom)
			rightTB: {
				x: width - strokeWidth,
				y: 0,
				width: strokeWidth,
				height: height,
				length: height,
				isHorizontal: false,
				reverse: false
			},
			// Right rectangle (bottom to top)
			rightBT: {
				x: width - strokeWidth,
				y: 0,
				width: strokeWidth,
				height: height,
				length: height,
				isHorizontal: false,
				reverse: true
			},
			// Bottom rectangle (right to left)
			bottomRL: {
				x: 0,
				y: height - strokeWidth,
				width: width,
				height: strokeWidth,
				length: width,
				isHorizontal: true,
				reverse: true
			},
			// Bottom rectangle (left to right)
			bottomLR: {
				x: 0,
				y: height - strokeWidth,
				width: width,
				height: strokeWidth,
				length: width,
				isHorizontal: true,
				reverse: false
			},
			// Left rectangle (bottom to top)
			leftBT: {
				x: 0,
				y: 0,
				width: strokeWidth,
				height: height,
				length: height,
				isHorizontal: false,
				reverse: true
			},
			// Left rectangle (top to bottom)
			leftTB: {
				x: 0,
				y: 0,
				width: strokeWidth,
				height: height,
				length: height,
				isHorizontal: false,
				reverse: false
			}
		};

		// Define rectangle sequences for each starting corner and direction
		const rectangleSequences = {
			'top-left': {
				clockwise: [
					allRectangles.topLR,
					allRectangles.rightTB,
					allRectangles.bottomRL,
					allRectangles.leftBT
				],
				counterclockwise: [
					allRectangles.leftTB,
					allRectangles.bottomLR,
					allRectangles.rightBT,
					allRectangles.topRL
				]
			},
			'top-right': {
				clockwise: [
					allRectangles.rightTB,
					allRectangles.bottomRL,
					allRectangles.leftBT,
					allRectangles.topLR
				],
				counterclockwise: [
					allRectangles.topRL,
					allRectangles.leftTB,
					allRectangles.bottomLR,
					allRectangles.rightBT
				]
			},
			'bottom-right': {
				clockwise: [
					allRectangles.bottomRL,
					allRectangles.leftBT,
					allRectangles.topLR,
					allRectangles.rightTB
				],
				counterclockwise: [
					allRectangles.rightBT,
					allRectangles.topRL,
					allRectangles.leftTB,
					allRectangles.bottomLR
				]
			},
			'bottom-left': {
				clockwise: [
					allRectangles.leftBT,
					allRectangles.topLR,
					allRectangles.rightTB,
					allRectangles.bottomRL
				],
				counterclockwise: [
					allRectangles.bottomLR,
					allRectangles.rightBT,
					allRectangles.topRL,
					allRectangles.leftTB
				]
			}
		};

		const direction = clockwise ? 'clockwise' : 'counterclockwise';
		return rectangleSequences[startCorner][direction];
	}
}
