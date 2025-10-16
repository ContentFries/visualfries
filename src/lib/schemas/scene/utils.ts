import tinycolor from 'tinycolor2';

export function isValidColor(color: string) {
	const c = tinycolor(color);
	return c.isValid(); // true
}
