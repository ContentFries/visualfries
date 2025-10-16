import type { StyleProcessor } from '../StyleProcessor.js';
import type { Appearance } from '$lib'
import type { HtmlElementStyle } from '../HtmlBuilder.js';
import { ColorTransformer } from '$lib/transformers/ColorTransformer.js';
import { get } from 'lodash-es';

export class AppearanceStyleProcessor implements StyleProcessor<Appearance | undefined> {
	public process(appearance: Appearance | undefined): Record<string, any> {
		if (!appearance) return {};

		let styles: HtmlElementStyle = {
			width: `${appearance.width}px`,
			height: `${appearance.height}px`
		};

		// Width and height are usually set directly by HtmlBuilder on the wrapper,
		// but if they were to be part of the inline style object, they'd go here.
		// For now, assuming HtmlBuilder handles this for the primary dimensions.
		// styles.width = `${appearance.width}px`;
		// styles.height = `${appearance.height}px`;

		if (appearance.opacity !== undefined && appearance.opacity !== 1) {
			styles.opacity = appearance.opacity.toString();
		}

		const hasRotation = appearance.rotation && appearance.rotation !== 0;
		const hasScale =
			(appearance.scaleX !== undefined && appearance.scaleX !== 1) ||
			(appearance.scaleY !== undefined && appearance.scaleY !== 1);

		if (hasRotation || hasScale) {
			let transform = `translate(${appearance.x || 0}px, ${appearance.y || 0}px)`;
			if (hasRotation) transform += ` rotate(${appearance.rotation}deg)`;
			if (hasScale) {
				transform += ` scale(${appearance.scaleX ?? 1}, ${appearance.scaleY ?? 1})`;
			}
			styles.transform = transform;
			// If the wrapper is already at (0,0) and this element is being transformed from that origin
			styles.top = '0px';
			styles.left = '0px';
		} else {
			if (appearance.x !== undefined) styles.left = `${appearance.x}px`;
			if (appearance.y !== undefined) styles.top = `${appearance.y}px`;
		}

		// Add alignment styles
		if (appearance.horizontalAlign) {
			styles.justifyContent = appearance.horizontalAlign;
		}

		if (appearance.verticalAlign) {
			styles.alignItems = appearance.verticalAlign;
		}

		// Handle background
		if (appearance.background && get(appearance.background, 'enabled')) {
			const color = ColorTransformer.transform(
				get(appearance.background, 'color', '#000000'),
				'background'
			);

			if (get(appearance, 'background.radius', 0) > 0) {
				styles.borderRadius = `${get(appearance.background, 'radius')}em`;
			}

			styles = { ...styles, ...color };
		}

		return styles;
	}
}
