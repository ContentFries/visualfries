import type { Scene } from '../schemas/scene/core.js';
import type { DeterministicDiagnosticsReport, DeterministicFrameOverride, DeterministicFramePayload, DeterministicFrameProvider, DeterministicFrameRequest, DeterministicMediaConfig } from '../schemas/runtime/deterministic.js';
export declare class DeterministicMediaManager {
    #private;
    readonly config: DeterministicMediaConfig;
    constructor(cradle: {
        deterministicMediaConfig?: DeterministicMediaConfig;
        sceneData: Scene;
    });
    isEnabled(): boolean;
    setProvider(provider: DeterministicFrameProvider | null): void;
    getProvider(): DeterministicFrameProvider | null;
    resolveOverride(request: DeterministicFrameRequest): Promise<DeterministicFrameOverride | null>;
    commitCacheKey(componentId: string, cacheKey: string): boolean;
    clearCacheKey(componentId: string): boolean;
    getFingerprint(): string;
    setOneTimeOverride(componentId: string, frameIndex: number, payload: DeterministicFramePayload): void;
    getDiagnosticsReport(): DeterministicDiagnosticsReport | null;
    destroy(): Promise<void>;
    releaseComponent(componentId: string): Promise<void>;
}
