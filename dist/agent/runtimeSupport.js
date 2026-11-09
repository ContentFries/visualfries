import { getComponentCapability } from './capabilities.js';
const TWEEN_CONTROL_KEYS = new Set([
    'from',
    'duration',
    'ease',
    'delay',
    'stagger',
    'repeat',
    'yoyo',
    'repeatDelay',
    'overwrite',
    'onStart',
    'onUpdate',
    'onComplete',
    'onRepeat',
    'onReverseComplete'
]);
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
function report(ctx, data) {
    ctx.issues.push(issue(ctx.mode, ctx.component, ctx.layerId, data));
}
function inspectTweenVars(ctx, vars, path) {
    inspectTween(vars, path, ctx.capability, ctx.component, ctx.layerId, ctx.mode, ctx.issues);
}
function inspectRendererHook(ctx) {
    const { capability, component } = ctx;
    if (!capability.visual || capability.renderers.preview !== 'none')
        return;
    report(ctx, {
        code: 'runtime-renderer-missing',
        capabilityId: `component.${component.type}.runtime.rendered`,
        path: ctx.componentPath,
        message: `${component.type} is accepted by schema but has no component render hook.`
    });
}
function enabledAnimationEntries(component) {
    const animations = component.animations;
    if (animations?.enabled === false)
        return [];
    return (animations?.list ?? []).filter((entry) => entry != null && entry.enabled !== false);
}
function inspectAnimationAttachment(ctx, enabledCount) {
    if (enabledCount === 0 || ctx.capability.animation.attached)
        return;
    report(ctx, {
        code: 'runtime-animation-unsupported',
        capabilityId: `component.${ctx.component.type}.animation.attachment`,
        path: `${ctx.componentPath}.animations`,
        message: `${ctx.component.type} animation data validates but is not attached to a runtime animation target.`
    });
}
function inspectSingleTween(ctx, animationObject, keyframe, basePath) {
    const target = selectorKind(animationObject.target);
    if (!ctx.capability.animation.selectors.includes(target)) {
        report(ctx, {
            code: 'runtime-animation-selector-unsupported',
            capabilityId: `component.${ctx.component.type}.animation.selector.${target}`,
            path: `${basePath}.target`,
            message: `${ctx.component.type} animation target "${String(animationObject.target)}" collapses to or misses the runtime target.`
        });
    }
    inspectTweenVars(ctx, keyframe.vars, `${basePath}.tween.vars`);
}
function inspectTimeline(ctx, timeline, basePath) {
    for (const [itemIndex, item] of timeline.entries()) {
        const sequence = item;
        const target = selectorKind(sequence.target);
        if (!ctx.capability.animation.selectors.includes(target)) {
            report(ctx, {
                code: 'runtime-animation-selector-unsupported',
                capabilityId: `component.${ctx.component.type}.animation.selector.${target}`,
                path: `${basePath}.timeline.${itemIndex}.target`,
                message: `${ctx.component.type} does not support animation selector "${String(sequence.target)}".`
            });
        }
        for (const [tweenIndex, tween] of (sequence.tweens ?? []).entries()) {
            inspectTweenVars(ctx, tween.vars, `${basePath}.timeline.${itemIndex}.tweens.${tweenIndex}.vars`);
        }
    }
}
function inspectAnimationEntry(ctx, entry, animationIndex) {
    const animation = entry.animation;
    // System presets are resolved at construction time. Their concrete timeline is not
    // duplicated here; unresolved names are surfaced by the runtime explain path.
    if (typeof animation === 'string')
        return;
    const basePath = `${ctx.componentPath}.animations.list.${animationIndex}`;
    const animationObject = animation;
    const keyframe = animationObject.tween;
    if (keyframe)
        inspectSingleTween(ctx, animationObject, keyframe, basePath);
    inspectTimeline(ctx, animationObject.timeline ?? [], basePath);
}
function inspectEffects(ctx) {
    const { component, capability } = ctx;
    if (component.effects?.enabled === false)
        return;
    for (const [effectId, effect] of Object.entries(component.effects?.map ?? {})) {
        const effectType = effect?.type;
        if (!effectType || capability.effects.supported.includes(effectType))
            continue;
        report(ctx, {
            code: 'runtime-effect-unsupported',
            capabilityId: `component.${component.type}.effect.${effectType}`,
            path: `${ctx.componentPath}.effects.map.${effectId}`,
            message: `${effectType} is accepted for ${component.type} but is not in its runtime-supported effect set.`
        });
    }
}
function inspectTextConflicts(ctx) {
    const { component } = ctx;
    if (component.type !== 'TEXT' && component.type !== 'SUBTITLES')
        return;
    const text = component.appearance.text;
    if (text.activeWord?.enabled && text.activeLine?.enabled) {
        report(ctx, {
            code: 'runtime-text-highlight-conflict',
            capabilityId: `component.${component.type}.text.activeHighlight.precedence`,
            path: `${ctx.componentPath}.appearance.text`,
            message: 'activeWord and activeLine target the same glyphs; activeWord takes deterministic precedence.'
        });
    }
    if (text.highlightColors?.some((color) => typeof color !== 'string')) {
        report(ctx, {
            code: 'runtime-text-highlight-gradient-unsupported',
            capabilityId: `component.${component.type}.text.highlightColors.gradient`,
            path: `${ctx.componentPath}.appearance.text.highlightColors`,
            message: 'highlightColors currently cycles solid CSS colors only; gradient palette entries are not evaluated.'
        });
    }
    const background = component.appearance.background;
    if (background &&
        typeof background === 'object' &&
        'color' in background &&
        background.target === 'element' &&
        typeof background.color === 'object' &&
        typeof text.color === 'object') {
        report(ctx, {
            code: 'runtime-text-gradient-conflict',
            capabilityId: `component.${component.type}.text.compositing.elementGradientBackgroundWithGradientGlyph`,
            path: `${ctx.componentPath}.appearance`,
            message: 'Element-target gradient background and gradient glyph fill compete for CSS background-image. Use wrapper target.'
        });
    }
}
function inspectComponent(ctx) {
    inspectRendererHook(ctx);
    const enabledAnimations = enabledAnimationEntries(ctx.component);
    inspectAnimationAttachment(ctx, enabledAnimations.length);
    for (const [animationIndex, entry] of enabledAnimations.entries()) {
        inspectAnimationEntry(ctx, entry, animationIndex);
    }
    inspectEffects(ctx);
    inspectTextConflicts(ctx);
}
export function analyzeRuntimeSupport(scene, options = {}) {
    const mode = options.mode ?? 'warn';
    const issues = [];
    for (const [layerIndex, layer] of (scene.layers ?? []).entries()) {
        for (const [componentIndex, component] of (layer.components ?? []).entries()) {
            const capability = getComponentCapability(component.type);
            if (!capability)
                continue;
            inspectComponent({
                mode,
                component,
                layerId: layer.id,
                capability,
                componentPath: `layers.${layerIndex}.components.${componentIndex}`,
                issues
            });
        }
    }
    return { supported: issues.length === 0, issues };
}
