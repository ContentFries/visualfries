export type CaptionPreset = 'bold' | 'karaoke' | 'pill' | 'punch' | 'neon';
import type { MotionWordRef } from './resolve.js';
type $$ComponentProps = {
    /** The words to caption, e.g. `clip.words.captions`. */
    words: MotionWordRef[];
    preset?: CaptionPreset;
    /** Vertical centre of the lines, as a fraction of the clip height. */
    y?: number;
    /** Line width, as a fraction of the clip width. */
    width?: number;
    /** Font size in px; defaults to a size that suits the preset and the clip width. */
    size?: number;
    font?: string;
    weight?: number;
    color?: string;
    accent?: string;
    /** Words per caption (default 3; punch shows one). */
    maxWords?: number;
    /** Characters per caption before it breaks (default 18). */
    maxChars?: number;
    /** Words that always take the accent and grow, e.g. ["free", "never"]. */
    emphasis?: string[];
    uppercase?: boolean;
    /** Seconds a caption stays after its last word when nobody speaks. */
    hold?: number;
};
declare const Captions: import("svelte").Component<$$ComponentProps, {}, "">;
type Captions = ReturnType<typeof Captions>;
export default Captions;
