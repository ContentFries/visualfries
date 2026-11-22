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
    fromFrame: number;
    toFrame: number;
    publicBasePath?: string;
    frameExtension?: LocalDeterministicFrameExtension;
    jpegQualityScale?: number;
    strict?: boolean;
    diagnostics?: boolean;
};
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
/**
 * The scene tree is built at the scene's in-point (`settings.startAt`), not at 0, and asks every
 * media component on screen there for its frame. Returns that frame's index, or null when the
 * scene starts at 0 or the component is not on screen at the in-point.
 */
export declare function toLocalSceneStartFrameIndex(component: LocalDeterministicMediaComponent, sceneStartAt: unknown, fps: number): number | null;
export declare function resolveLocalPredecodedExtractionPlan(sourceStartSec: number, sourceEndSec: number | undefined, expectedFrameCount: number, fps: number): LocalPredecodedExtractionPlan;
/**
 * Frames the scene tree asks for while it builds, whatever the frame window: the component's
 * first frame (a component that starts with the scene) and its frame at the scene's in-point.
 * Only fills indices that have no frame yet, so real frames of the window always win.
 */
export declare function assignLocalBootstrapFrames(manifest: LocalDeterministicFrameManifest, component: LocalDeterministicMediaComponent, input: {
    fps: number;
    sceneStartAt: unknown;
    frameUrl: string;
}): void;
export declare function prepareLocalDeterministicMedia(input: PrepareLocalDeterministicMediaInput): Promise<PrepareLocalDeterministicMediaResult>;
