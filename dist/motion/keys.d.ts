import type { ResolvedBrand } from './brand.js';
import { type AnimatableKind } from './interpolate.js';
import type { ResolvedKey } from './program.js';
/**
 * Keys of a shot or a clip as per-frame values: one track per property, built once per key list
 * and evaluated at any program frame. Pure (no DOM): the program resolver builds the same tracks
 * to report bad keys, the stage builds them to draw, and the two always agree.
 */
/** Placement properties a key can set on any shot or clip. */
export declare const PLACEMENT: readonly ["x", "y", "scale", "rotation", "opacity"];
export type PlacementName = (typeof PLACEMENT)[number];
/**
 * Where an item is moved to: `x`/`y` in stage pixels (a percentage resolved against the format
 * frame), `scale` and `rotation` (degrees) about the item's origin, `opacity` 0–1.
 */
export type Placement = {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
};
export declare const NO_PLACEMENT: Placement;
/** Animatable props of a block: prop name → kind (`export const animatable` in `<script module>`). */
export type Animatable = Record<string, AnimatableKind>;
/** Kinds a block may declare. */
export declare const ANIMATABLE_KINDS: readonly AnimatableKind[];
/** Default ease of keys without `ease`, by the style's (or clip's) energy. */
export declare const KEY_EASE: {
    readonly calm: "sine.inOut";
    readonly balanced: "power2.inOut";
    readonly punchy: "expo.inOut";
};
export type KeyTracks = {
    /** Placement at a program frame; null when no key sets placement. */
    placement: ((frame: number) => Placement) | null;
    /** Keyed props at a program frame; null when no key sets props. */
    props: ((frame: number) => Record<string, unknown>) | null;
    /** Names of the keyed props. */
    propNames: string[];
};
export type KeyTrackOptions = {
    /** Format frame: `"%"` in `x` resolves against its width, in `y` against its height. */
    size: [number, number];
    /**
     * Props the block marks animatable. Undefined: the item takes no props (a shot), so any
     * `props` in its keys is an error.
     */
    animatable?: Animatable;
    /** Block name for messages. */
    block?: string;
};
/** A key that cannot be drawn: `key` is the authored index of the key at fault (if one is). */
export type KeyProblem = {
    message: string;
    key: number | null;
    property: string | null;
};
/**
 * The tracks of one item's keys and everything wrong with them: an unknown or non-animatable
 * prop, a value of the wrong kind, units or gradient types that differ between keys, an unknown
 * ease. Each property is checked on its own, so one bad property does not hide another.
 * `opts.authored` gives each key's index as written (keys arrive sorted by frame); messages and
 * `KeyProblem.key` use it.
 */
export declare function compileKeyTracks(keys: readonly ResolvedKey[], opts: KeyTrackOptions & {
    authored?: readonly number[];
}): {
    tracks: KeyTracks;
    problems: KeyProblem[];
};
/** The tracks of one item's keys; throws the first problem (see `compileKeyTracks`). */
export declare function buildKeyTracks(keys: readonly ResolvedKey[], opts: KeyTrackOptions): KeyTracks;
/** `buildKeyTracks`, built once per key list and options (the stage evaluates it every frame). */
export declare function keyTracks(keys: readonly ResolvedKey[], opts: KeyTrackOptions): KeyTracks;
/** CSS transform of a placement about the element's origin; empty for no movement. */
export declare function placementTransform(p: Placement): string;
/**
 * A key value with brand tokens (`"brand.primary"`, `"brand.extra.sky"`) replaced by the brand's
 * colours, also inside gradients and shadows (`"linear-gradient(90deg, brand.primary, brand.accent)"`).
 * Other values come back unchanged. Throws on a token the brand does not have.
 */
export declare function substituteBrand(value: unknown, brand: ResolvedBrand): unknown;
