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
export declare function resolveLocalPredecodedExtractionPlan(sourceStartSec: number, sourceEndSec: number | undefined, expectedFrameCount: number, fps: number): LocalPredecodedExtractionPlan;
export declare function prepareLocalDeterministicMedia(input: PrepareLocalDeterministicMediaInput): Promise<PrepareLocalDeterministicMediaResult>;
