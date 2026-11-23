import { type Scene } from '../schemas/scene/index.js';
export type LocalDeterministicMediaStrategy = 'predecoded-image-sequence';
export type LocalDeterministicFrameExtension = 'jpg' | 'png';
export type LocalDeterministicMediaComponent = {
    component: Scene['layers'][number]['components'][number];
    id: string;
    type: 'VIDEO' | 'GIF';
    sourceUrl: string;
    sourceStartAt: number;
    sourceEndAt?: number;
    timelineStartAt: number;
    timelineEndAt: number;
};
export type LocalDeterministicActiveWindow = {
    activeStartFrame: number;
    activeEndFrame: number;
    activeStartSec: number;
    activeEndSec: number;
    sourceStartSec: number;
};
export type LocalPredecodedExtractionPlan = {
    sourceStartSec: number;
    extractFrameCount: number;
    outputFrameCount: number;
    sourceEndLimited: boolean;
};
export type LocalDeterministicFrameManifest = Record<string, Record<string, string>>;
export type PrepareLocalDeterministicMediaInput = {
    scene: unknown;
    workDir: string;
    /** The frame window of the render. Only read when `renderTimes` is not given. */
    fromFrame: number;
    toFrame: number;
    /**
     * Scene times the page seeks to and draws a frame at. Default: every frame of the window,
     * at the frame rate of the scene.
     */
    renderTimes?: number[];
    publicBasePath?: string;
    frameExtension?: LocalDeterministicFrameExtension;
    jpegQualityScale?: number;
    strict?: boolean;
    diagnostics?: boolean;
    /** Scene times the page seeks to without drawing a frame (frames to explain). */
    seekTimes?: number[];
    /** Limit for one ffmpeg extraction in ms; 0 switches it off. Default 600000. */
    extractionTimeoutMs?: number;
};
export declare const DEFAULT_EXTRACTION_TIMEOUT_MS = 600000;
export type PrepareLocalDeterministicMediaResult = {
    preparedScene: Scene;
    payload: {
        strategy: 'visualfries-provider-predecoded';
        frameManifest: LocalDeterministicFrameManifest;
        diagnosticsEnabled: boolean;
        mediaDeterministicStrict: boolean;
    };
    media: Array<{
        componentId: string;
        type: 'VIDEO' | 'GIF';
        sourceUrl: string;
        framesPrepared: number;
    }>;
    assetsRoot: string;
    strategyUsed: LocalDeterministicMediaStrategy;
};
export declare const normalizeDeterministicPublicBasePath: (value: string) => string;
export declare function collectLocalDeterministicMediaComponents(input: unknown): LocalDeterministicMediaComponent[];
export declare function resolveLocalDeterministicActiveWindow(component: LocalDeterministicMediaComponent, fromFrame: number, toFrame: number, fps: number): LocalDeterministicActiveWindow | null;
export declare function toLocalDeterministicFrameIndex(component: LocalDeterministicMediaComponent, sceneFrameIndex: number, fps: number): number;
export declare function resolveLocalPredecodedExtractionPlan(sourceStartSec: number, sourceEndSec: number | undefined, expectedFrameCount: number, fps: number): LocalPredecodedExtractionPlan;
export declare function prepareLocalDeterministicMedia(input: PrepareLocalDeterministicMediaInput): Promise<PrepareLocalDeterministicMediaResult>;
