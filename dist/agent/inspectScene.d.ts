import { type ComponentCapability } from './capabilities.js';
export type SceneInspectionIssue = {
    level: 'error' | 'warning';
    type: string;
    code?: string;
    capabilityId?: string;
    path?: string;
    message: string;
    componentId?: string;
    layerId?: string;
};
export type SceneInspectionReport = {
    valid: boolean;
    schemaValid: boolean;
    runtimeSupported: boolean;
    issues: SceneInspectionIssue[];
    components: Array<{
        id: string;
        layerId: string;
        type: string;
        capability?: ComponentCapability;
    }>;
    summary: {
        duration: number;
        width: number;
        height: number;
        layers: number;
        components: number;
        runtimeWarnings: number;
    };
};
export type InspectSceneOptions = {
    strictRuntimeSupport?: boolean;
    includeCapabilities?: boolean;
};
export declare function inspectScene(input: unknown, options?: InspectSceneOptions): SceneInspectionReport;
