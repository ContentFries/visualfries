import { ColorTypeShape, GradientDefinitionShape } from '..';
import tinycolor from 'tinycolor2';
function buildGradientCss(gradient) {
    const colorsWithStops = gradient.colors
        .map((col, index) => {
        if (gradient.stops?.[index] !== undefined) {
            return `${col} ${gradient.stops[index]}%`;
        }
        return col;
    })
        .join(', ');
    if (gradient.type === 'linear') {
        const angle = gradient.angle !== undefined ? `${gradient.angle}deg` : 'to bottom';
        return `linear-gradient(${angle}, ${colorsWithStops})`;
    }
    else if (gradient.type === 'radial') {
        let definition = '';
        if (gradient.shape)
            definition += gradient.shape;
        if (gradient.position) {
            definition += definition ? ` at ${gradient.position}` : `at ${gradient.position}`;
        }
        return `radial-gradient(${definition ? definition + ', ' : ''}${colorsWithStops})`;
    }
    return '';
}
export class ColorTransformer {
    static transform(color, type) {
        const styles = {};
        const validTypes = ['text', 'background'];
        if (!validTypes.includes(type)) {
            return styles;
        }
        const resp = ColorTypeShape.safeParse(color);
        if (!resp.success) {
            return styles;
        }
        if (typeof resp.data === 'string') {
            const output = tinycolor(resp.data);
            if (output.isValid()) {
                const prop = type === 'text' ? 'color' : 'backgroundColor';
                if (output.getAlpha() === 0) {
                    styles[prop] = 'transparent';
                    return styles;
                }
                styles[prop] = output.toRgbString();
                return styles;
            }
            return styles;
        }
        if (resp.data.type === 'linear' || resp.data.type === 'radial') {
            const gradient = GradientDefinitionShape.safeParse(resp.data);
            if (!gradient.success) {
                return styles;
            }
            const prop = type === 'text' ? 'backgroundImage' : 'background';
            styles[prop] = buildGradientCss(gradient.data);
            if (type === 'text') {
                styles.webkitBackgroundClip = 'text';
                styles.backgroundClip = 'text';
                styles.color = 'transparent';
            }
            return styles;
        }
        return styles;
    }
}
