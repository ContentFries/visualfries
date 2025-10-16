import type { ColorType } from '..';
import type { HtmlElementStyle } from '../builders/html/HtmlBuilder.js';
export declare class ColorTransformer {
    static transform(color: ColorType, type: 'text' | 'background'): HtmlElementStyle;
}
