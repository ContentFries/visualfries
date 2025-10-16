import { ColorTransformer } from '../../../transformers/ColorTransformer.js';
export class TextAppearanceStyleProcessor {
    process(textAppearance) {
        let styles = {};
        if (!textAppearance)
            return styles;
        if (textAppearance.fontFamily)
            styles.fontFamily = textAppearance.fontFamily;
        if (textAppearance.fontWeight)
            styles.fontWeight = String(textAppearance.fontWeight);
        if (textAppearance.textAlign)
            styles.textAlign = textAppearance.textAlign;
        const fontSize = textAppearance.fontSize;
        if (fontSize) {
            styles.fontSize =
                typeof fontSize === 'number'
                    ? `${fontSize}px`
                    : `${fontSize.value}${fontSize.unit || 'px'}`;
        }
        const lineHeight = textAppearance.lineHeight;
        if (lineHeight) {
            styles.lineHeight = `${lineHeight.value}${lineHeight.unit || 'em'}`;
        }
        const letterSpacing = textAppearance.letterSpacing;
        if (letterSpacing) {
            styles.letterSpacing = `${letterSpacing.value}${letterSpacing.unit || 'px'}`;
        }
        if (textAppearance.color) {
            const color = ColorTransformer.transform(textAppearance.color, 'text');
            styles = { ...styles, ...color };
        }
        if (textAppearance.textTransform && textAppearance.textTransform !== 'none') {
            styles.textTransform = textAppearance.textTransform;
        }
        return styles;
    }
}
