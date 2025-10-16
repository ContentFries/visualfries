import { fetchFont } from '../fonts/fontLoader.js';
import { loadEmoji, getIconCode } from './emoji.js';
import { sanitizeHtml } from './html.js';
export class SVGGenerator {
    fontCache = new Map();
    emojiCache = new Map();
    fontDataBase64Cache = {};
    fontDataBase64Inflight = new Map();
    static instance;
    static getInstance() {
        if (!SVGGenerator.instance) {
            SVGGenerator.instance = new SVGGenerator();
        }
        return SVGGenerator.instance;
    }
    async generateSVG(el, config, width, height, svgParentId, fontText) {
        const fontFamily = config.fontFamily
            ? config.fontFamily.replace(/\s+/g, '+').replace(/^(.)/, (match) => match.toUpperCase())
            : null;
        const fontFamilyName = config.fontFamily
            ? config.fontFamily.replace(/^(.)/, (match) => match.toUpperCase())
            : null;
        const weightAppend = config.fontWeight && config.fontWeight !== 'normal' && config.fontWeight !== '400'
            ? `:wght@${config.fontWeight}`
            : '';
        const isEmoji = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\s)+$/u.test(el.textContent || '');
        const getFontText = isEmoji ? 'a' : fontText || el.textContent;
        let fontData = null;
        if (fontFamily && !isEmoji) {
            const cacheKey = `${fontFamily + weightAppend}_${getFontText}`;
            if (cacheKey in this.fontDataBase64Cache) {
                fontData = this.fontDataBase64Cache[cacheKey];
            }
            else if (this.fontDataBase64Inflight.has(cacheKey)) {
                fontData = await this.fontDataBase64Inflight.get(cacheKey);
            }
            else {
                const inflight = this.getFontDataBase64(fontFamily + weightAppend, getFontText || '').finally(() => this.fontDataBase64Inflight.delete(cacheKey));
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
    isTextEmoji(text) {
        return /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\s)+$/u.test(text);
    }
    async getFontDataArrayBuffer(fontFamily, text) {
        const isEmoji = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\s)+$/u.test(text || '');
        const cacheKey = isEmoji ? 'emojitext' : `${fontFamily}_${text}`;
        if (!this.fontCache.has(cacheKey)) {
            const fontData = await fetchFont(isEmoji ? 'Noto+Sans' : fontFamily, isEmoji ? 'a' : text);
            if (!fontData) {
                console.error('Failed to fetch font data: ' + cacheKey);
                this.fontCache.set(cacheKey, null);
                return null;
            }
            this.fontCache.set(cacheKey, fontData);
        }
        return this.fontCache.get(cacheKey);
    }
    async arrayBufferToDataURL(buffer, mimeType) {
        // const uint = new Uint8Array(buffer);
        // const base64 = 'data:' + mimeType + ';base64,' + (await toBase64(uint));
        // return base64;
        return new Promise((resolve, reject) => {
            const blob = new Blob([buffer], { type: mimeType });
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    async getFontDataBase64(fontFamily, text) {
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
    clearCache() {
        this.fontCache.clear();
        this.emojiCache.clear();
        this.fontDataBase64Cache = {};
    }
}
export const svgGenerator = SVGGenerator.getInstance();
