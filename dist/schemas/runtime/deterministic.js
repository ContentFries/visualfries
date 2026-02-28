import { z } from 'zod';
export const DeterministicMediaConfigShape = z.object({
    enabled: z.boolean().prefault(false),
    strict: z.boolean().prefault(false),
    diagnostics: z.boolean().prefault(false),
    maxCachedTextures: z.number().int().positive().optional(),
    seekMaxAttempts: z.number().int().positive().prefault(4),
    loadingMaxAttempts: z.number().int().positive().prefault(2),
    readyYieldMs: z.number().int().nonnegative().prefault(0),
    blurDownscale: z.number().positive().max(1).prefault(0.33),
    provider: z.custom().optional()
}).prefault({});
export const defaultDeterministicMediaConfig = DeterministicMediaConfigShape.parse(undefined);
export class DeterministicRenderError extends Error {
    componentId;
    frameIndex;
    sceneTime;
    constructor(message, props) {
        super(message);
        this.name = 'DeterministicRenderError';
        this.componentId = props.componentId;
        this.frameIndex = props.frameIndex;
        this.sceneTime = props.sceneTime;
    }
}
export class RenderFrameEncodingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RenderFrameEncodingError';
    }
}
