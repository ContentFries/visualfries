// Font size of a speaker-depth word, kept out of the component so it can be tested.
/** Outline of the "outline" and "echo" styles, in em, drawn outside the letters. */
export const OUTLINE_EM = 0.014;
/** Words grow to this scale while they hold and must still fit in 92 % of the width. */
export const HOLD_SCALE = 1.05;
/**
 * Font size in px of a word. An explicit `size` is the author's and is used as written. Without
 * one, the size guess assumes a condensed face; a wider font is measured and the word shrinks
 * until it fits 92 % of the frame width while it holds (outline included).
 */
export function wordSize(text, opts) {
    if (opts.size !== undefined)
        return opts.size;
    const { width: W, measure } = opts;
    const px = Math.round(Math.min(W * 0.9, (W * 0.92) / (0.53 * Math.max(2, text.length))));
    if (!measure)
        return px;
    const fitWidth = (W * 0.92) / HOLD_SCALE;
    const width = measure(text.toUpperCase(), px) + (opts.outlined ? 2 * OUTLINE_EM * px : 0);
    return width > fitWidth ? Math.floor((px * fitWidth) / width) : px;
}
