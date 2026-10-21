/** Outline of the "outline" and "echo" styles, in em, drawn outside the letters. */
export declare const OUTLINE_EM = 0.014;
/** Words grow to this scale while they hold and must still fit in 92 % of the width. */
export declare const HOLD_SCALE = 1.05;
/** Width in px of `text` set at `px` in the block's font; null when nothing can measure. */
export type MeasureText = ((text: string, px: number) => number) | null;
/**
 * Font size in px of a word. An explicit `size` is the author's and is used as written. Without
 * one, the size guess assumes a condensed face; a wider font is measured and the word shrinks
 * until it fits 92 % of the frame width while it holds (outline included).
 */
export declare function wordSize(text: string, opts: {
    size?: number;
    width: number;
    outlined: boolean;
    measure: MeasureText;
}): number;
