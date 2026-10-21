import { type Style } from './project.js';
import type { Energy } from './energy.js';
/**
 * Built-in styles. Each is an example of a good style, not a fixed set; for now they fill only
 * `energy`. Style names never reuse energy names.
 */
export declare const BUILTIN_STYLES: {
    solid: {
        name: string;
        energy: "balanced";
    };
    glass: {
        name: string;
        energy: "balanced";
    };
    clean: {
        name: string;
        energy: "calm";
    };
    editorial: {
        name: string;
        energy: "calm";
    };
    kinetic: {
        name: string;
        energy: "punchy";
    };
    depth: {
        name: string;
        energy: "balanced";
    };
    brutal: {
        name: string;
        energy: "punchy";
    };
};
export type BuiltinStyleName = keyof typeof BUILTIN_STYLES;
export declare function isBuiltinStyle(name: string): name is BuiltinStyleName;
export type ResolvedStyle = Omit<Style, 'extends' | 'energy'> & {
    /** True when the project names no style. */
    neutral: boolean;
    energy: Energy;
    /** The layers, base first: built-in names, style files, "(project)" for an inline style. */
    layers: string[];
};
/** Energy of a project without a style, or of a style chain that sets none. */
export declare const DEFAULT_ENERGY: Energy;
export declare const NEUTRAL_STYLE: ResolvedStyle;
type Plain = Record<string, unknown>;
/** `over` on top of `base`: objects merge key by key, everything else (arrays too) replaces. */
export declare function mergeLayers(base: Plain, over: Plain): Plain;
/**
 * Reads a style file. `from` is the file that names it (null for the project), `ref` the path as
 * written. Returns the parsed JSON and a stable id for messages and cycle detection.
 */
export type StyleLoader = (ref: string, from: string | null) => {
    id: string;
    data: unknown;
};
/**
 * Resolve a style reference into one style: the built-in, then every `extends` layer, then the
 * project's own. A string is a built-in name or a style file.
 */
export declare function resolveStyle(spec: string | Style, load: StyleLoader): ResolvedStyle;
export {};
