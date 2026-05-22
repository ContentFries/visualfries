export type AgentRenderMode = 'preview' | 'final';
export type AgentRenderEngine = 'browser-preview' | 'deterministic-local';
export type RenderMediaRequirement = {
    componentId?: string;
    layerId?: string;
    assetId?: string;
    type: 'VIDEO' | 'GIF';
    source?: string;
    reason: string;
};
export type AgentRenderPlan = {
    mode: AgentRenderMode;
    engine: AgentRenderEngine;
    requiresDeterministicMedia: boolean;
    canUseBrowserPreview: boolean;
    warnings: string[];
    blockers: string[];
    media: RenderMediaRequirement[];
};
export type ResolveAgentRenderPlanOptions = {
    mode?: AgentRenderMode;
    engine?: AgentRenderEngine | 'auto';
    allowBrowserMediaFinal?: boolean;
};
export declare function collectDeterministicMediaRequirements(input: unknown): RenderMediaRequirement[];
export declare function requiresDeterministicRender(input: unknown): boolean;
export declare function resolveAgentRenderPlan(input: unknown, options?: ResolveAgentRenderPlanOptions): AgentRenderPlan;
