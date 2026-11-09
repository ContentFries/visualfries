import { SceneShape } from '../schemas/scene/index.js';
import { getComponentCapability } from './capabilities.js';
import { analyzeRuntimeSupport } from './runtimeSupport.js';
function inspectSubtitles(scene, component, layerId) {
    const ref = { componentId: component.id, layerId };
    const assetId = component.timingAnchor.assetId ?? component.source?.assetId;
    const languageCode = component.source?.languageCode;
    if (!assetId) {
        return [
            {
                level: 'error',
                type: 'subtitle-anchor-missing',
                message: 'Subtitles component needs timingAnchor.assetId or source.assetId.',
                ...ref
            }
        ];
    }
    const assetData = scene.settings.subtitles?.data?.[assetId];
    if (!assetData) {
        return [
            {
                level: 'warning',
                type: 'subtitle-data-missing',
                message: `No scene.settings.subtitles.data entry found for "${assetId}".`,
                ...ref
            }
        ];
    }
    if (languageCode && (!assetData[languageCode] || assetData[languageCode].length === 0)) {
        return [
            {
                level: 'warning',
                type: 'subtitle-language-data-missing',
                message: `No subtitle data found for asset "${assetId}" and language "${languageCode}". Runtime may fall back to another language.`,
                ...ref
            }
        ];
    }
    return [];
}
function inspectComponent(scene, assetIds, component, layerId) {
    const issues = [];
    const ref = { componentId: component.id, layerId };
    if (component.timeline.endAt > scene.settings.duration) {
        issues.push({
            level: 'warning',
            type: 'timeline-outside-scene',
            message: `Component ends after scene duration (${component.timeline.endAt}s > ${scene.settings.duration}s).`,
            ...ref
        });
    }
    if ('source' in component &&
        component.source?.assetId &&
        !assetIds.has(component.source.assetId)) {
        issues.push({
            level: 'warning',
            type: 'missing-asset',
            message: `Component references asset "${component.source.assetId}" that is not in scene.assets.`,
            ...ref
        });
    }
    if (component.type === 'SUBTITLES')
        issues.push(...inspectSubtitles(scene, component, layerId));
    return issues;
}
// clipColor is stripped by permissive nested parsing, so it is only visible on the raw input.
function findRawClipColorIssues(input, strict) {
    const issues = [];
    const rawLayers = input?.layers;
    if (!Array.isArray(rawLayers))
        return issues;
    for (const [layerIndex, rawLayer] of rawLayers.entries()) {
        const layer = rawLayer;
        if (!Array.isArray(layer.components))
            continue;
        for (const [componentIndex, rawComponent] of layer.components.entries()) {
            const component = rawComponent;
            if (component.appearance?.clipColor === undefined &&
                component.appearance?.text?.clipColor === undefined) {
                continue;
            }
            issues.push({
                level: strict ? 'error' : 'warning',
                type: 'runtime-support',
                code: 'runtime-text-clip-color-unsupported',
                capabilityId: `component.${component.type ?? 'TEXT'}.text.clipColor`,
                path: `layers.${layerIndex}.components.${componentIndex}.appearance.text.clipColor`,
                message: 'clipColor has no defined VisualFries runtime semantics and would otherwise be stripped during parsing.',
                componentId: component.id,
                layerId: layer.id
            });
        }
    }
    return issues;
}
export function inspectScene(input, options = {}) {
    const parsed = SceneShape.safeParse(input);
    if (!parsed.success) {
        return {
            valid: false,
            schemaValid: false,
            runtimeSupported: false,
            issues: [
                {
                    level: 'error',
                    type: 'schema',
                    message: parsed.error.message
                }
            ],
            components: [],
            summary: { duration: 0, width: 0, height: 0, layers: 0, components: 0, runtimeWarnings: 0 }
        };
    }
    const scene = parsed.data;
    const issues = [];
    const assetIds = new Set((scene.assets ?? []).map((asset) => asset.id));
    let components = 0;
    const componentReports = [];
    for (const layer of scene.layers ?? []) {
        for (const component of layer.components ?? []) {
            components += 1;
            componentReports.push({
                id: component.id,
                layerId: layer.id,
                type: component.type,
                ...(options.includeCapabilities === false
                    ? {}
                    : { capability: getComponentCapability(component.type) })
            });
            issues.push(...inspectComponent(scene, assetIds, component, layer.id));
        }
    }
    const runtime = analyzeRuntimeSupport(scene, {
        mode: (options.strictRuntimeSupport ? 'strict' : 'warn')
    });
    issues.push(...runtime.issues);
    const rawRuntimeIssues = findRawClipColorIssues(input, Boolean(options.strictRuntimeSupport));
    issues.push(...rawRuntimeIssues);
    return {
        valid: !issues.some((issue) => issue.level === 'error'),
        schemaValid: true,
        runtimeSupported: runtime.supported && rawRuntimeIssues.length === 0,
        issues,
        components: componentReports,
        summary: {
            duration: scene.settings.duration,
            width: scene.settings.width,
            height: scene.settings.height,
            layers: scene.layers.length,
            components,
            runtimeWarnings: runtime.issues.length + rawRuntimeIssues.length
        }
    };
}
