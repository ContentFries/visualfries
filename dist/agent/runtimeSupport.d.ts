import type { Scene } from '../schemas/scene/index.js';
export type RuntimeSupportMode = 'warn' | 'strict';
export type RuntimeSupportIssue = {
    level: 'warning' | 'error';
    type: 'runtime-support';
    code: 'runtime-renderer-missing' | 'runtime-animation-unsupported' | 'runtime-animation-selector-unsupported' | 'runtime-animation-property-unsupported' | 'runtime-animation-reference-unresolved' | 'runtime-effect-unsupported' | 'runtime-text-highlight-conflict' | 'runtime-text-gradient-conflict' | 'runtime-text-highlight-gradient-unsupported';
    capabilityId: string;
    path: string;
    message: string;
    componentId: string;
    layerId: string;
};
export type RuntimeSupportReport = {
    supported: boolean;
    issues: RuntimeSupportIssue[];
};
export declare function analyzeRuntimeSupport(scene: Scene, options?: {
    mode?: RuntimeSupportMode;
}): RuntimeSupportReport;
