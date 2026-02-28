import type { TextureSource } from 'pixi.js-legacy';
import { z } from 'zod';
export type DeterministicFrameRequest = {
    componentId: string;
    componentType: 'VIDEO' | 'GIF';
    frameIndex: number;
    fps: number;
    width: number;
    height: number;
};
export type DeterministicFramePayload = {
    kind: 'url';
    cacheKey: string;
    url: string;
} | {
    kind: 'blob';
    cacheKey: string;
    blob: Blob;
} | {
    kind: 'arraybuffer';
    cacheKey: string;
    arrayBuffer: ArrayBuffer;
} | {
    kind: 'imageBitmap';
    cacheKey: string;
    imageBitmap: ImageBitmap;
};
export interface DeterministicFrameProvider {
    getFrame(request: DeterministicFrameRequest): Promise<DeterministicFramePayload | null>;
    releaseComponent?(componentId: string): Promise<void> | void;
    destroy?(): Promise<void> | void;
}
export type DeterministicMediaConfig = {
    enabled: boolean;
    strict: boolean;
    diagnostics: boolean;
    maxCachedTextures?: number;
    seekMaxAttempts?: number;
    loadingMaxAttempts?: number;
    readyYieldMs?: number;
    blurDownscale?: number;
    provider?: DeterministicFrameProvider;
};
export declare const DeterministicMediaConfigShape: z.ZodPrefault<z.ZodObject<{
    enabled: z.ZodPrefault<z.ZodBoolean>;
    strict: z.ZodPrefault<z.ZodBoolean>;
    diagnostics: z.ZodPrefault<z.ZodBoolean>;
    maxCachedTextures: z.ZodOptional<z.ZodNumber>;
    seekMaxAttempts: z.ZodPrefault<z.ZodNumber>;
    loadingMaxAttempts: z.ZodPrefault<z.ZodNumber>;
    readyYieldMs: z.ZodPrefault<z.ZodNumber>;
    blurDownscale: z.ZodPrefault<z.ZodNumber>;
    provider: z.ZodOptional<z.ZodCustom<DeterministicFrameProvider, DeterministicFrameProvider>>;
}, z.core.$strip>>;
export declare const defaultDeterministicMediaConfig: DeterministicMediaConfig;
export type DeterministicFrameOverride = {
    cacheKey: string;
    pixiResource: TextureSource;
    imageElement?: HTMLImageElement | ImageBitmap;
};
export type DeterministicDiagnosticsReport = {
    providerHits: number;
    providerMisses: number;
    cacheHits: number;
    cacheHitRatio: number;
    selectedRendererType: 'canvas' | 'webgl';
    rendererFallbackOccurred: boolean;
    rendererFallbackReason?: string;
    readyAttempts: number;
    extraRenderPasses: number;
    blurRedraws: number;
    perFrame: Record<string, {
        readyAttempts: number;
        extraRenderPasses: number;
        blurRedraws: number;
    }>;
    latency: {
        minMs: number;
        maxMs: number;
        avgMs: number;
    };
};
export type RenderFrameRangeItem = {
    frameIndex: number;
    frame: string | ArrayBuffer | Blob;
    isDuplicate: boolean;
    mimeType?: string;
    release: () => void;
};
export type FrameImageFormat = 'jpg' | 'jpeg' | 'png';
export type FrameImageEncodingOptions = {
    imageFormat?: FrameImageFormat;
    imageQuality?: number;
};
export type RenderFrameRangeOptions = {
    fromFrame: number;
    toFrame: number;
    format?: 'arraybuffer' | 'blob' | 'png' | 'jpg' | 'jpeg';
    quality?: number;
    imageFormat?: FrameImageFormat;
    imageQuality?: number;
    skipDuplicates?: boolean;
    signal?: AbortSignal;
    onFrame: (item: RenderFrameRangeItem) => Promise<void> | void;
};
export type RenderFrameRangeSummary = {
    framesRendered: number;
    framesSkipped: number;
    aborted: boolean;
    diagnostics?: DeterministicDiagnosticsReport | null;
};
export declare class DeterministicRenderError extends Error {
    readonly componentId: string;
    readonly frameIndex: number;
    readonly sceneTime: number;
    constructor(message: string, props: {
        componentId: string;
        frameIndex: number;
        sceneTime: number;
    });
}
export declare class RenderFrameEncodingError extends Error {
    constructor(message: string);
}
