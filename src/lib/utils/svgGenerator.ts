import { fetchFont } from '../fonts/fontLoader.js';
import { loadEmoji, getIconCode } from './emoji.js';
import type { TextAppearance } from '$lib';
import { sanitizeHtml } from './html.js';

export class SVGGenerator {
	private fontCache: Map<string, ArrayBuffer | null> = new Map();
	private emojiCache: Map<string, string> = new Map();
	private fontDataBase64Cache: { [key: string]: string | null } = {};
	private fontDataBase64Inflight: Map<string, Promise<string | null>> = new Map();

	private static instance: SVGGenerator;
	public static getInstance(): SVGGenerator {
		if (!SVGGenerator.instance) {
			SVGGenerator.instance = new SVGGenerator();
		}
		return SVGGenerator.instance;
	}

	async generateSVG(
		el: HTMLElement,
		config: TextAppearance,
		width: number,
		height: number,
		svgParentId?: string,
		fontText?: string
	): Promise<{ base: string; content: string; end: string }> {
		const fontFamily = config.fontFamily
			? config.fontFamily.replace(/\s+/g, '+').replace(/^(.)/, (match) => match.toUpperCase())
			: null;
		const fontFamilyName = config.fontFamily
			? config.fontFamily.replace(/^(.)/, (match) => match.toUpperCase())
			: null;

		const weightAppend =
			config.fontWeight && config.fontWeight !== 'normal' && config.fontWeight !== '400'
				? `:wght@${config.fontWeight}`
				: '';

		const isEmoji =
			/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\s)+$/u.test(
				el.textContent || ''
			);
		const getFontText = isEmoji ? 'a' : fontText || el.textContent;

		let fontData: string | null = null;

		if (fontFamily && !isEmoji) {
			const cacheKey = `${fontFamily + weightAppend}_${getFontText}`;
			if (cacheKey in this.fontDataBase64Cache) {
				fontData = this.fontDataBase64Cache[cacheKey];
			} else if (this.fontDataBase64Inflight.has(cacheKey)) {
				fontData = await this.fontDataBase64Inflight.get(cacheKey)!;
			} else {
				const inflight = this.getFontDataBase64(
					fontFamily + weightAppend,
					getFontText || ''
				).finally(() => this.fontDataBase64Inflight.delete(cacheKey));
				this.fontDataBase64Inflight.set(cacheKey, inflight);
				fontData = await inflight;
			}
		}

		const styleTag = fontData
			? `<style>@font-face { font-family: ${fontFamilyName}; src: url('${fontData}') }</style>`
			: '';

		const correctedHTML = sanitizeHtml(el.outerHTML).replace(/<br\s*>/gi, '<br />');

		// const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" version="1.1">${styleTag}<foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="transform: scale(1); transform-origin: top left; display: inline-block;" id="base">${el.outerHTML}</div></foreignObject></svg>`;

		return {
			base: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" version="1.1">${styleTag}<foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="transform-origin: 0 0;">`,
			content: correctedHTML,
			end: `</div></foreignObject></svg>`
		};
	}

	private isTextEmoji(text: string): boolean {
		return /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\s)+$/u.test(
			text
		);
	}

	private async getFontDataArrayBuffer(
		fontFamily: string,
		text?: string
	): Promise<ArrayBuffer | null> {
		const isEmoji =
			/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\s)+$/u.test(
				text || ''
			);

		const cacheKey = isEmoji ? 'emojitext' : `${fontFamily}_${text}`;
		if (!this.fontCache.has(cacheKey)) {
			const fontData = await fetchFont(isEmoji ? 'Noto+Sans' : fontFamily, isEmoji ? 'a' : text);
			if (!fontData) {
				console.error('Failed to fetch font data: ' + cacheKey);
				this.fontCache.set(cacheKey, null);
				return null;
			}
			this.fontCache.set(cacheKey, fontData as ArrayBuffer);
		}
		return this.fontCache.get(cacheKey)!;
	}

	private async arrayBufferToDataURL(buffer: ArrayBuffer, mimeType: string): Promise<string> {
		// const uint = new Uint8Array(buffer);
		// const base64 = 'data:' + mimeType + ';base64,' + (await toBase64(uint));
		// return base64;
		return new Promise((resolve, reject) => {
			const blob = new Blob([buffer], { type: mimeType });
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	private async getFontDataBase64(fontFamily: string, text?: string): Promise<string | null> {
		const cacheKey = `${fontFamily}_${text}`;
		if (cacheKey in this.fontDataBase64Cache) {
			return this.fontDataBase64Cache[cacheKey];
		}

		const fontData = await this.getFontDataArrayBuffer(fontFamily, text);
		if (fontData) {
			const base64Data = await this.arrayBufferToDataURL(fontData, 'font/woff2');

			this.fontDataBase64Cache[cacheKey] = base64Data;
			return base64Data;
		}

		this.fontDataBase64Cache[cacheKey] = null;
		return null;
	}

	clearCache(): void {
		this.fontCache.clear();
		this.emojiCache.clear();
		this.fontDataBase64Cache = {};
	}
}

export const svgGenerator = SVGGenerator.getInstance();
