import type { Scene } from '../schemas/scene/index.js';
import type { AgentRenderPlan } from './renderPlan.js';
import type { EffectiveRenderRange } from './renderRanges.js';
import type { LocalRenderOptions, LocalRenderResult } from './localRender.js';
type FrameRange = {
    fromFrame: number;
    toFrame: number;
};
type FrameItem = LocalRenderResult['frames']['items'][number];
type Transport = LocalRenderResult['frames']['transport'];
type RenderPage = any;
export type FramePayload = {
    frameIndex: number;
    isDuplicate?: boolean;
    dataUrl?: string;
};
export declare const contiguousFrameRange: (frameIndices: number[]) => FrameRange | null;
export declare const dataUrlToBuffer: (dataUrl: string) => Buffer;
export declare const writeDataUrlFrame: (dataUrl: string, framePath: string) => Promise<void>;
export declare const resolveTmpParent: (tmpDir?: string) => string;
export declare const frameFileName: (position: number, imageFormat: string) => string;
export declare const resolveFrameRanges: (frameIndices: number[], environment: LocalRenderOptions["environment"]) => {
    activeRange: FrameRange | null;
    mediaPreparationRange: FrameRange | null;
};
export declare const resolveTransport: (streamEncode: boolean, activeRange: FrameRange | null) => Transport;
export declare const buildRendererOptions: (options: LocalRenderOptions) => {
    serverRendererMode: "canvas" | "webgl";
    environment: "client" | "server";
    preferWebGL2: boolean;
    powerPreference: "default" | "high-performance" | "low-power";
};
export declare const buildRenderDiagnostic: (input: {
    engine: AgentRenderPlan["engine"];
    frameCount: number;
    requestedFrameCount: number;
    effectiveRanges: EffectiveRenderRange[];
    serverRendererMode?: "canvas" | "webgl";
    transport: Transport;
}) => Record<string, unknown>;
export declare const resolveMediaDiagnosticsPath: (input: {
    enabled: boolean | undefined;
    framesOnly: boolean;
    output: string;
    outputPath: string;
}) => string | null;
export declare const buildEmptyRangeResult: (input: {
    scene: Scene;
    framesDir: string;
    options: LocalRenderOptions;
    engine: AgentRenderPlan["engine"];
    effectiveRanges: EffectiveRenderRange[];
}) => LocalRenderResult;
export declare const buildResolveAliases: (input: {
    runtimeEntry: string;
    libRoot: string;
    tempRoot: string;
    svelteClientEntry: string;
    svelteServerEntry: string;
    deterministic: boolean;
}) => Record<string, string>;
type FrameWriterInput = {
    rangeBinding: boolean;
    framesDir: string;
    imageFormat: 'png' | 'jpg';
    fps: number;
    streamEncoder?: {
        writeFrame(buffer: Buffer): Promise<void>;
    };
};
export declare const createFrameWriter: (input: FrameWriterInput) => {
    frames: {
        frame: number;
        time: number;
        path: string | null;
        isDuplicate: boolean;
    }[];
    write: (payload: FramePayload) => Promise<void>;
};
export declare const attachPageDiagnostics: (page: RenderPage, runtimeErrors: string[]) => void;
export declare const renderFrameRanges: (page: RenderPage, ranges: FrameRange[], input: {
    imageFormat: "png" | "jpg";
    imageQuality: number;
    skipDuplicates: boolean;
}) => Promise<{
    framesSkipped: number;
}>;
export declare const renderSparseFrames: (page: RenderPage, input: {
    frameIndices: number[];
    fps: number;
    framesDir: string;
    imageFormat: "png" | "jpg";
    imageQuality: number;
    environment: LocalRenderOptions["environment"];
}) => Promise<FrameItem[]>;
export {};
