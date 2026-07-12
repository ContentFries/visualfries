import { getComponentCapability } from './capabilities.js';
const TWEEN_CONTROL_KEYS = new Set(['from', 'duration', 'ease', 'delay', 'stagger']);
const KNOWN_TRANSFORMS = new Set([
    'x',
    'y',
    'opacity',
    'rotation',
    'scale',
    'scaleX',
    'scaleY'
]);
function levelFor(mode) {
    return mode === 'strict' ? 'error' : 'warning';
}
function issue(mode, component, layerId, data) {
    return {
        level: levelFor(mode),
        type: 'runtime-support',
        componentId: component.id,
        layerId,
        ...data
    };
}
function selectorKind(target) {
    if (typeof target !== 'string' || target === '' || target === 'container')
        return 'container';
    if (target === 'words' || target === 'lines' || target === 'chars')
        return target;
    return 'css';
}
function inspectTween(vars, path, capability, component, layerId, mode, issues) {
    if (!vars)
        return;
    const states = [vars, typeof vars.from === 'object' && vars.from ? vars.from : undefined];
    for (const [stateIndex, state] of states.entries()) {
        if (!state)
            continue;
        for (const property of Object.keys(state)) {
            if (TWEEN_CONTROL_KEYS.has(property))
                continue;
            if (!KNOWN_TRANSFORMS.has(property)) {
                issues.push(issue(mode, component, layerId, {
                    code: 'runtime-animation-property-unsupported',
                    capabilityId: `component.${component.type}.animation.property.${property}`,
                    path: `${path}${stateIndex === 1 ? '.from' : ''}.${property}`,
                    message: `${component.type} does not guarantee animation property "${property}" at runtime.`
                }));
                continue;
            }
            if (!capability.animation.transforms.includes(property)) {
                issues.push(issue(mode, component, layerId, {
                    code: 'runtime-animation-property-unsupported',
                    capabilityId: `component.${component.type}.animation.property.${property}`,
                    path: `${path}${stateIndex === 1 ? '.from' : ''}.${property}`,
                    message: `${component.type} accepts "${property}" in schema but does not evaluate it at runtime.`
                }));
            }
        }
    }
}
export function analyzeRuntimeSupport(scene, options = {}) {
    const mode = options.mode ?? 'warn';
    const issues = [];
    for (const layer of scene.layers ?? []) {
        for (const component of layer.components ?? []) {
            const capability = getComponentCapability(component.type);
            if (!capability)
                continue;
            if (capability.visual && capability.renderers.preview === 'none') {
                issues.push(issue(mode, component, layer.id, {
                    code: 'runtime-renderer-missing',
                    capabilityId: `component.${component.type}.runtime.rendered`,
                    path: `layers.${layer.id}.components.${component.id}`,
                    message: `${component.type} is accepted by schema but has no component render hook.`
                }));
            }
            const animations = component.animations;
            const enabledAnimations = animations?.enabled === false
                ? []
                : (animations?.list ?? []).filter((entry) => entry != null && entry.enabled !== false);
            if (enabledAnimations.length > 0 && !capability.animation.attached) {
                issues.push(issue(mode, component, layer.id, {
                    code: 'runtime-animation-unsupported',
                    capabilityId: `component.${component.type}.animation.attachment`,
                    path: `layers.${layer.id}.components.${component.id}.animations`,
                    message: `${component.type} animation data validates but is not attached to a runtime animation target.`
                }));
            }
            for (const [animationIndex, entry] of enabledAnimations.entries()) {
                const basePath = `layers.${layer.id}.components.${component.id}.animations.list.${animationIndex}`;
                const animation = entry.animation;
                if (typeof animation === 'string') {
                    // System presets are resolved at construction time. Their concrete timeline is not
                    // duplicated here; unresolved names are surfaced by the runtime explain path.
                    continue;
                }
                const animationObject = animation;
                const keyframe = animationObject.tween;
                if (keyframe) {
                    const target = selectorKind(animationObject.target);
                    if (!capability.animation.selectors.includes(target)) {
                        issues.push(issue(mode, component, layer.id, {
                            code: 'runtime-animation-selector-unsupported',
                            capabilityId: `component.${component.type}.animation.selector.${target}`,
                            path: `${basePath}.target`,
                            message: `${component.type} animation target "${String(animationObject.target)}" collapses to or misses the runtime target.`
                        }));
                    }
                    inspectTween(keyframe.vars, `${basePath}.tween.vars`, capability, component, layer.id, mode, issues);
                }
                for (const [itemIndex, item] of (animationObject.timeline ?? []).entries()) {
                    const sequence = item;
                    const target = selectorKind(sequence.target);
                    if (!capability.animation.selectors.includes(target)) {
                        issues.push(issue(mode, component, layer.id, {
                            code: 'runtime-animation-selector-unsupported',
                            capabilityId: `component.${component.type}.animation.selector.${target}`,
                            path: `${basePath}.timeline.${itemIndex}.target`,
                            message: `${component.type} does not support animation selector "${String(sequence.target)}".`
                        }));
                    }
                    for (const [tweenIndex, tween] of (sequence.tweens ?? []).entries()) {
                        inspectTween(tween.vars, `${basePath}.timeline.${itemIndex}.tweens.${tweenIndex}.vars`, capability, component, layer.id, mode, issues);
                    }
                }
            }
            if (component.effects?.enabled !== false) {
                for (const [effectId, effect] of Object.entries(component.effects?.map ?? {})) {
                    const effectType = effect?.type;
                    if (effectType && !capability.effects.supported.includes(effectType)) {
                        issues.push(issue(mode, component, layer.id, {
                            code: 'runtime-effect-unsupported',
                            capabilityId: `component.${component.type}.effect.${effectType}`,
                            path: `layers.${layer.id}.components.${component.id}.effects.map.${effectId}`,
                            message: `${effectType} is accepted for ${component.type} but is not in its runtime-supported effect set.`
                        }));
                    }
                }
            }
            if (component.type === 'TEXT' || component.type === 'SUBTITLES') {
                const text = component.appearance.text;
                if (text.activeWord?.enabled && text.activeLine?.enabled) {
                    issues.push(issue(mode, component, layer.id, {
                        code: 'runtime-text-highlight-conflict',
                        capabilityId: `component.${component.type}.text.activeHighlight.precedence`,
                        path: `layers.${layer.id}.components.${component.id}.appearance.text`,
                        message: 'activeWord and activeLine target the same glyphs; activeWord takes deterministic precedence.'
                    }));
                }
                if (text.highlightColors?.some((color) => typeof color !== 'string')) {
                    issues.push(issue(mode, component, layer.id, {
                        code: 'runtime-text-highlight-gradient-unsupported',
                        capabilityId: `component.${component.type}.text.highlightColors.gradient`,
                        path: `layers.${layer.id}.components.${component.id}.appearance.text.highlightColors`,
                        message: 'highlightColors currently cycles solid CSS colors only; gradient palette entries are not evaluated.'
                    }));
                }
                const background = component.appearance.background;
                if (background &&
                    typeof background === 'object' &&
                    'color' in background &&
                    background.target === 'element' &&
                    typeof background.color === 'object' &&
                    typeof text.color === 'object') {
                    issues.push(issue(mode, component, layer.id, {
                        code: 'runtime-text-gradient-conflict',
                        capabilityId: `component.${component.type}.text.compositing.elementGradientBackgroundWithGradientGlyph`,
                        path: `layers.${layer.id}.components.${component.id}.appearance`,
                        message: 'Element-target gradient background and gradient glyph fill compete for CSS background-image. Use wrapper target.'
                    }));
                }
            }
        }
    }
    return { supported: issues.length === 0, issues };
}
