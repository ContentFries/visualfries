/**
 * Curated, gl-transitions-compatible WebGL transitions for deterministic browser export.
 *
 * Shader source is intentionally private. Callers select a known transition and may only
 * provide the parameters declared by that transition; arbitrary GLSL is never accepted.
 */
export declare const GL_TRANSITION_NAMES: readonly ["fade", "radial-wipe"];
export type GlTransitionName = (typeof GL_TRANSITION_NAMES)[number];
export type GlTransitionParameters = Readonly<Record<string, number>>;
export type GlTransitionRenderInput = {
    /** Image source uploaded to the reusable `from` texture and shown at progress=0. */
    from: TexImageSource;
    /** Image source uploaded to the reusable `to` texture and shown at progress=1. */
    to: TexImageSource;
    /** Normalized transition position. Values outside 0..1 are clamped. */
    progress: number;
    /** Output width / output height. */
    ratio: number;
    transition: GlTransitionName;
    parameters?: GlTransitionParameters;
};
export type GlTransitionRenderResult = {
    requested: GlTransitionName;
    used: GlTransitionName;
    fallbackReason?: string;
};
type GlContext = WebGLRenderingContext | WebGL2RenderingContext;
export declare function listGlTransitions(): readonly GlTransitionName[];
export declare function createGlTransitionRenderer(gl: GlContext): GlTransitionRenderer;
export declare class GlTransitionRenderer {
    #private;
    readonly canvas: HTMLCanvasElement | OffscreenCanvas;
    constructor(gl: GlContext);
    render(input: GlTransitionRenderInput): GlTransitionRenderResult;
    destroy(): void;
}
export {};
