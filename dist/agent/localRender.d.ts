import { type AgentRenderPlan } from './renderPlan.js';
export type LocalRenderModulePaths = {
    vite?: string;
    svelteVitePlugin?: string;
    playwright?: string;
    nodeModules?: string;
};
export type LocalRenderOptions = {
    scene: unknown;
    output: string;
    framesOnly?: boolean;
    frameIndices: number[];
    fps: number;
    imageFormat?: 'png' | 'jpg' | 'jpeg';
    imageQuality?: number;
    audioOverride?: string;
    keepFrames?: boolean;
    skipDuplicates?: boolean;
    streamEncode?: boolean;
    crf?: number;
    preset?: string;
    renderPlan?: AgentRenderPlan;
    tmpDir?: string;
    packageRoot?: string;
    modulePaths?: LocalRenderModulePaths;
    chromiumPath?: string;
    serverRendererMode?: 'canvas' | 'webgl';
    preferWebGL2?: boolean;
    powerPreference?: 'default' | 'high-performance' | 'low-power';
    mediaDiagnostics?: boolean;
};
export type LocalRenderResult = {
    ok: true;
    scene: {
        id: string;
        width: number;
        height: number;
        duration: number;
        fps: number;
    };
    frames: {
        count: number;
        dir: string;
        items: Array<{
            frame: number;
            time: number;
            path: string | null;
            isDuplicate: boolean;
        }>;
        transport: 'range-binding' | 'sparse-evaluate' | 'range-binding-stream-encode';
        skippedDuplicates: number;
    };
    output: string;
    encoded: boolean;
    encoding: {
        mode: 'none' | 'frame-sequence';
    } | {
        mode: 'image2pipe';
        elapsedMs: number;
        audioMuxed: boolean;
    };
    audio: {
        mode: 'none' | 'override' | 'mixed' | 'primary-fallback';
        selectedSources: number;
        skippedSources: number;
        plannedSources: number;
        path?: string;
    };
    mediaDiagnosticsPath: string | null;
    mediaDiagnostics: Array<Record<string, unknown>>;
};
export declare const normalizeImageQuality: (value: number | undefined, fallback?: number) => number;
export declare function renderSceneLocally(options: LocalRenderOptions): Promise<LocalRenderResult>;
