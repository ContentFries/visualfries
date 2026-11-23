import type { Scene } from '../schemas/scene/core.js';
import type { DeterministicDiagnosticsReport, DeterministicFrameOverride, DeterministicFramePayload, DeterministicFrameProvider, DeterministicFrameRequest, DeterministicMediaConfig } from '../schemas/runtime/deterministic.js';
export declare class DeterministicMediaManager {
    #private;
    readonly config: DeterministicMediaConfig;
    constructor(cradle: {
        deterministicMediaConfig?: DeterministicMediaConfig;
        sceneData: Scene;
    });
    /**
     * Whether a media component gets frames. Whoever prepares the frames (the local renderer,
     * cf-worker) leaves out a hidden component and the media of a muted layer, so the render
     * must not ask for them. The layer is read from the scene this manager was built with: a
     * component cannot see its layer, and the layers of the runtime do not keep `muted`.
     */
    expectsFrames(component: {
        id: string;
        visible?: boolean;
    }): boolean;
    isEnabled(): boolean;
    setProvider(provider: DeterministicFrameProvider | null): void;
    getProvider(): DeterministicFrameProvider | null;
    resolveOverride(request: DeterministicFrameRequest): Promise<DeterministicFrameOverride | null>;
    commitCacheKey(componentId: string, cacheKey: string): boolean;
    clearCacheKey(componentId: string): boolean;
    getFingerprint(): string;
    setOneTimeOverride(componentId: string, frameIndex: number, payload: DeterministicFramePayload): void;
    getDiagnosticsReport(): DeterministicDiagnosticsReport | null;
    getSelectedRendererType(): 'canvas' | 'webgl';
    recordRendererSelection(args: {
        rendererType: 'canvas' | 'webgl';
        fallbackOccurred?: boolean;
        fallbackReason?: string;
    }): void;
    recordReadyAttempt(sceneFrameIndex: number, count?: number): void;
    recordExtraRenderPass(sceneFrameIndex: number, count?: number): void;
    recordBlurRedraw(sceneFrameIndex: number, count?: number): void;
    destroy(): Promise<void>;
    releaseComponent(componentId: string): Promise<void>;
}
