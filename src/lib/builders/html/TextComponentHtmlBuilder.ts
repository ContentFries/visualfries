import { sanitizeText, wrapEmojis } from '$lib/utils/html.js';
import { get } from 'lodash-es';
import type { TextComponent } from '$lib';

import { HtmlBuilder, type WrapperConfig, type ElementConfig } from './HtmlBuilder.js';
import { StyleBuilder } from './StyleBuilder.js';

export class TextComponentHtmlBuilder {
	private component: TextComponent;
	private document: Document;

	constructor(component: TextComponent, document: Document) {
		this.component = component;
		this.document = document;
	}

	private getWrapperConfig(): WrapperConfig {
		// wrapper is always just one
		const { appearance, id } = this.component;
		const styleBuilder = new StyleBuilder(this.component);

		const onlyStyles = [
			'left',
			'top',
			'position',
			'fontFamily',
			'fontWeight',
			'width',
			'height',
			'justifyContent',
			'alignItems',
			'display'
		];

		if (
			get(appearance, 'background.enabled', false) &&
			get(appearance, 'background.target') === 'wrapper'
		) {
			onlyStyles.push('background');
			onlyStyles.push('borderRadius');
			onlyStyles.push('backgroundColor');
		}

		styleBuilder.only(onlyStyles);
		const style = styleBuilder.build();

		return {
			id: `cf-text-wrapper-${id}`, // Convention for wrapper ID
			style
		};
	}

	private getElementConfig(): ElementConfig {
		// we can have multiple elements depending on the appearance
		const { text, id, appearance } = this.component; // Keep text and id for innerHTML and element id

		const styleBuilder = new StyleBuilder(this.component);
		const omitStyles = [
			'left',
			'top',
			'position',
			'justifyContent',
			'alignItems',
			'display',
			'width',
			'height'
		];

		let addPadding = false;
		if (get(appearance, 'background.enabled', false)) {
			// omit background if target is wrapper
			if (get(appearance, 'background.target') === 'wrapper') {
				omitStyles.push('background');
				omitStyles.push('borderRadius');
				omitStyles.push('backgroundColor');
			}
			if (get(appearance, 'background.target') === 'element') {
				addPadding = true;
			}
		}

		styleBuilder.omit(omitStyles);
		const style = styleBuilder.build();

		if (addPadding && !style.padding) {
			style.padding = '0.22em';
		}

		// Process text for HTML
		const processedText = text ? wrapEmojis(text.replace(/<br>/g, '<br />')) : '';
		const safeHtml = sanitizeText(processedText);

		return {
			id: `elem-${id}`,
			innerHTML: safeHtml,
			style
			// dir: 'auto' is default from HtmlBuilder
			// classList: ['con-el'] is default from HtmlBuilder
		};
	}

	public build(): { wrapper: HTMLElement; element: HTMLElement } {
		const htmlBuilder = new HtmlBuilder(this.document);

		htmlBuilder.withWrapper(this.getWrapperConfig()).withElement(this.getElementConfig());

		return htmlBuilder.build();
	}

	public buildAndExtractStyles(): { wrapper: HTMLElement; element: HTMLElement } {
		const htmlBuilder = new HtmlBuilder(this.document);

		htmlBuilder.withWrapper(this.getWrapperConfig()).withElement(this.getElementConfig());

		return htmlBuilder.buildAndExtractStyles();
	}
}
