import { SceneShape } from '../schemas/scene/index.js';
function sourceForComponent(scene, component) {
    if (!('source' in component))
        return undefined;
    const directUrl = component.source?.url ?? component.source?.streamUrl;
    if (directUrl)
        return directUrl;
    const assetId = component.source?.assetId;
    return assetId ? scene.assets.find((asset) => asset.id === assetId)?.url : undefined;
}
export function collectDeterministicMediaRequirements(input) {
    const scene = SceneShape.parse(input);
    const media = [];
    for (const layer of scene.layers ?? []) {
        if (!layer || layer.muted || layer.visible === false)
            continue;
        for (const component of layer.components ?? []) {
            if (!component || component.visible === false)
                continue;
            if (component.type !== 'VIDEO' && component.type !== 'GIF')
                continue;
            media.push({
                componentId: component.id,
                layerId: layer.id,
                assetId: 'source' in component ? component.source?.assetId : undefined,
                type: component.type,
                source: sourceForComponent(scene, component),
                reason: component.type === 'VIDEO'
                    ? 'VIDEO frames must be predecoded for final deterministic output.'
                    : 'GIF frames must be expanded to exact frame images for final deterministic output.'
            });
        }
    }
    return media;
}
export function requiresDeterministicRender(input) {
    return collectDeterministicMediaRequirements(input).length > 0;
}
export function resolveAgentRenderPlan(input, options = {}) {
    const media = collectDeterministicMediaRequirements(input);
    const mode = options.mode ?? 'final';
    const requiresDeterministicMedia = media.length > 0;
    const engine = options.engine && options.engine !== 'auto'
        ? options.engine
        : mode === 'preview' || !requiresDeterministicMedia
            ? 'browser-preview'
            : 'deterministic-local';
    const warnings = [];
    const blockers = [];
    if (engine === 'browser-preview' && requiresDeterministicMedia) {
        const message = 'Browser media rendering is preview-only for scenes with VIDEO/GIF components because native media seeking can produce stale or duplicated frames.';
        if (mode === 'final' && !options.allowBrowserMediaFinal) {
            blockers.push(message);
        }
        else {
            warnings.push(message);
        }
    }
    return {
        mode,
        engine,
        requiresDeterministicMedia,
        canUseBrowserPreview: engine === 'browser-preview' && (mode === 'preview' || !requiresDeterministicMedia),
        warnings,
        blockers,
        media
    };
}
