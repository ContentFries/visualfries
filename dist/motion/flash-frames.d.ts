/**
 * Flash frames: a few frames of footage between full-screen clips, or between a full-screen clip
 * and a cut, that the edit never meant to show (a card fading its own opacity at its end over the
 * camera, two cards that leave a gap, a card edge a few frames off a cut). `check` warns; the
 * engine moves nothing unless a clip or shot asks for `"snap": "cut"`. The page measures how much
 * of the frame each clip hides (see `covers` in `program-stage.ts`); the decisions live here.
 */
/** A clip whose cover reaches this hides the footage under it: it is full-screen there. */
export declare const FULL_COVER = 0.98;
/** Footage shown for less than this next to a full-screen clip reads as a flash. */
export declare const FLASH_SECONDS = 0.8;
/**
 * An edge this close to a cut (but not on it) is meant to be on it; also how far `"snap": "cut"`
 * reaches.
 */
export declare const SNAP_SECONDS = 0.4;
/** At one program frame, how much of the frame (0–1) each front clip on screen hides. */
export type CoverSample = {
    frame: number;
    clips: Record<string, number>;
};
type Span = {
    startFrame: number;
    frames: number;
};
/** What the flash check reads of a resolved program. */
export type FlashProgram = {
    fps: number;
    cuts: Span[];
    clips: (Span & {
        id: string;
        block: string;
    })[];
    transitions: Span[];
};
export type FlashWarning = {
    frame: number;
    message: string;
};
/** What the page reads of an element that covers the whole frame. */
export type Plane = {
    /** Its effective opacity: its own times its ancestors'. */
    opacity: number;
    visible: boolean;
    /** A loaded image or a video. */
    media: boolean;
    /** The alpha of its background colour. */
    color: number;
    /** Its computed `background-image`. */
    image: string;
};
/** How much of the footage an element over the whole frame hides (0–1). */
export declare function planeCover(plane: Plane): number;
/**
 * Whether RGBA pixels read from a picture (an image or a video frame drawn small) are all
 * opaque: a picture with transparent parts (an overlay, a cut-out, a frame) does not hide the
 * footage.
 */
export declare function opaquePixels(data: Uint8ClampedArray): boolean;
/** Whether a clip can hide the footage: in front of the speaker and not in a shot's slot. */
export declare function coverable(clip: {
    layer?: string | null;
    slot?: string | null;
}): boolean;
/** Program frames where the footage changes: every cut's start, and the end of the last. */
export declare function cutEdges(cuts: Span[]): number[];
/** What `alphaReader` needs of a 2D canvas context. */
export type AlphaContext<T> = {
    clearRect(x: number, y: number, w: number, h: number): void;
    drawImage(picture: T, x: number, y: number, w: number, h: number): void;
    getImageData(x: number, y: number, w: number, h: number): {
        data: Uint8ClampedArray;
    };
};
/**
 * Reads whether a picture has no transparent pixels, from a `size`×`size` copy drawn into a
 * canvas that `make` creates. A picture that cannot be read (a cross-origin image taints the
 * canvas) counts as see-through, and the tainted canvas is dropped: a later picture gets a clean
 * one, since clearing never cleans a tainted canvas.
 */
export declare function alphaReader<T>(make: () => AlphaContext<T> | null, size?: number): (picture: T) => boolean;
/** The cut an edge lands a few frames off (`off` frames, negative before it); null on or far. */
export declare function offCut(frame: number, edges: number[], fps: number): {
    cut: number;
    off: number;
} | null;
/**
 * `check` warnings for shot edges a few frames off a cut: a shot change just beside a cut reads
 * as a second, tiny cut. An edge two shots share is told once, as the later shot's `from`.
 */
export declare function shotsOffCut(shots: (Span & {
    id: string;
})[], edges: number[], fps: number): {
    level: 'warning';
    item: string;
    field: string;
    message: string;
}[];
/** `"snap": "cut"` on a clip or shot: both edges, or the ones named. */
export type CutSnap = 'cut' | {
    from?: 'cut';
    until?: 'cut';
};
/**
 * A span in seconds with the edges `snap` asks for moved onto the nearest cut edge within
 * `SNAP_SECONDS`. An edge with no cut that near stays, and `note` says so; without a cut list
 * (`edges` null or empty) nothing moves and `note` says why, once.
 */
export declare function snapSpan(snap: CutSnap | undefined, span: {
    start: number;
    end: number;
}, edges: number[] | null, fps: number, note: (edge: 'from' | 'until', message: string) => void): {
    start: number;
    end: number;
};
/**
 * `check` warnings for flash frames, from cover samples of the page in program frames (any
 * order, any segments; frames inside transition windows are left out: a declared transition is
 * meant):
 * - a full-screen clip edge a few frames off a cut (see `offCut`);
 * - footage that shows for less than `FLASH_SECONDS` between full-screen clips, or between a
 *   full-screen clip and a cut, naming the clip that fades its own opacity when one does.
 * Footage beside one full-screen clip that stays on screen longer (a card fading out over the
 * camera that goes on) is a dissolve and passes.
 */
export declare function flashFrames(program: FlashProgram, samples: CoverSample[]): FlashWarning[];
/** Where an element sits in nested CSS 3D, found by the page. */
export type Nested3d = {
    clip: string;
    block: string;
    path: string;
};
/** The clip a nested 3D warning names; null for any other message. */
export declare function nested3dClip(message: string): string | null;
/** A `check` warning for nested `transform-style: preserve-3d` in HTML-in-Canvas capture. */
export declare function nested3dMessage(found: Nested3d): string;
export {};
