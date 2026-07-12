import type { Scene } from '../schemas/scene/index.js';
import {
	getComponentCapability,
	type AnimationTransform,
	type ComponentCapability
} from './capabilities.js';

const TWEEN_CONTROL_KEYS = new Set(['from', 'duration', 'ease', 'delay', 'stagger']);
const KNOWN_TRANSFORMS = new Set<AnimationTransform>([
	'x',
	'y',
	'opacity',
	'rotation',
	'scale',
	'scaleX',
	'scaleY'
]);

export type RuntimeSupportMode = 'warn' | 'strict';

export type RuntimeSupportIssue = {
	level: 'warning' | 'error';
	type: 'runtime-support';
	code:
		| 'runtime-renderer-missing'
		| 'runtime-animation-unsupported'
		| 'runtime-animation-selector-unsupported'
		| 'runtime-animation-property-unsupported'
		| 'runtime-animation-reference-unresolved'
		| 'runtime-effect-unsupported'
		| 'runtime-text-highlight-conflict'
		| 'runtime-text-gradient-conflict'
		| 'runtime-text-highlight-gradient-unsupported';
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

function levelFor(mode: RuntimeSupportMode): RuntimeSupportIssue['level'] {
	return mode === 'strict' ? 'error' : 'warning';
}

function issue(
	mode: RuntimeSupportMode,
	component: { id: string; type: string },
	layerId: string,
	data: Omit<RuntimeSupportIssue, 'level' | 'type' | 'componentId' | 'layerId'>
): RuntimeSupportIssue {
	return {
		level: levelFor(mode),
		type: 'runtime-support',
		componentId: component.id,
		layerId,
		...data
	};
}

function selectorKind(target: unknown): string {
	if (typeof target !== 'string' || target === '' || target === 'container') return 'container';
	if (target === 'words' || target === 'lines' || target === 'chars') return target;
	return 'css';
}

function inspectTween(
	vars: Record<string, unknown> | undefined,
	path: string,
	capability: ComponentCapability,
	component: { id: string; type: string },
	layerId: string,
	mode: RuntimeSupportMode,
	issues: RuntimeSupportIssue[]
) {
	if (!vars) return;
	const states = [vars, typeof vars.from === 'object' && vars.from ? vars.from : undefined];
	for (const [stateIndex, state] of states.entries()) {
		if (!state) continue;
		for (const property of Object.keys(state)) {
			if (TWEEN_CONTROL_KEYS.has(property)) continue;
			if (!KNOWN_TRANSFORMS.has(property as AnimationTransform)) {
				issues.push(
					issue(mode, component, layerId, {
						code: 'runtime-animation-property-unsupported',
						capabilityId: `component.${component.type}.animation.property.${property}`,
						path: `${path}${stateIndex === 1 ? '.from' : ''}.${property}`,
						message: `${component.type} does not guarantee animation property "${property}" at runtime.`
					})
				);
				continue;
			}
			if (!capability.animation.transforms.includes(property as AnimationTransform)) {
				issues.push(
					issue(mode, component, layerId, {
						code: 'runtime-animation-property-unsupported',
						capabilityId: `component.${component.type}.animation.property.${property}`,
						path: `${path}${stateIndex === 1 ? '.from' : ''}.${property}`,
						message: `${component.type} accepts "${property}" in schema but does not evaluate it at runtime.`
					})
				);
			}
		}
	}
}

export function analyzeRuntimeSupport(
	scene: Scene,
	options: { mode?: RuntimeSupportMode } = {}
): RuntimeSupportReport {
	const mode = options.mode ?? 'warn';
	const issues: RuntimeSupportIssue[] = [];

	for (const layer of scene.layers ?? []) {
		for (const component of layer.components ?? []) {
			const capability = getComponentCapability(component.type);
			if (!capability) continue;

			if (capability.visual && capability.renderers.preview === 'none') {
				issues.push(
					issue(mode, component, layer.id, {
						code: 'runtime-renderer-missing',
						capabilityId: `component.${component.type}.runtime.rendered`,
						path: `layers.${layer.id}.components.${component.id}`,
						message: `${component.type} is accepted by schema but has no component render hook.`
					})
				);
			}

			const animations = component.animations;
			const enabledAnimations =
				animations?.enabled === false
					? []
					: (animations?.list ?? []).filter((entry) => entry != null && entry.enabled !== false);
			if (enabledAnimations.length > 0 && !capability.animation.attached) {
				issues.push(
					issue(mode, component, layer.id, {
						code: 'runtime-animation-unsupported',
						capabilityId: `component.${component.type}.animation.attachment`,
						path: `layers.${layer.id}.components.${component.id}.animations`,
						message: `${component.type} animation data validates but is not attached to a runtime animation target.`
					})
				);
			}

			for (const [animationIndex, entry] of enabledAnimations.entries()) {
				const basePath = `layers.${layer.id}.components.${component.id}.animations.list.${animationIndex}`;
				const animation = entry.animation;
				if (typeof animation === 'string') {
					// System presets are resolved at construction time. Their concrete timeline is not
					// duplicated here; unresolved names are surfaced by the runtime explain path.
					continue;
				}
				const animationObject = animation as Record<string, unknown>;
				const keyframe = animationObject.tween as Record<string, unknown> | undefined;
				if (keyframe) {
					const target = selectorKind(animationObject.target);
					if (!capability.animation.selectors.includes(target as never)) {
						issues.push(
							issue(mode, component, layer.id, {
								code: 'runtime-animation-selector-unsupported',
								capabilityId: `component.${component.type}.animation.selector.${target}`,
								path: `${basePath}.target`,
								message: `${component.type} animation target "${String(animationObject.target)}" collapses to or misses the runtime target.`
							})
						);
					}
					inspectTween(
						keyframe.vars as Record<string, unknown> | undefined,
						`${basePath}.tween.vars`,
						capability,
						component,
						layer.id,
						mode,
						issues
					);
				}

				for (const [itemIndex, item] of ((animationObject.timeline as unknown[]) ?? []).entries()) {
					const sequence = item as Record<string, unknown>;
					const target = selectorKind(sequence.target);
					if (!capability.animation.selectors.includes(target as never)) {
						issues.push(
							issue(mode, component, layer.id, {
								code: 'runtime-animation-selector-unsupported',
								capabilityId: `component.${component.type}.animation.selector.${target}`,
								path: `${basePath}.timeline.${itemIndex}.target`,
								message: `${component.type} does not support animation selector "${String(sequence.target)}".`
							})
						);
					}
					for (const [tweenIndex, tween] of ((sequence.tweens as unknown[]) ?? []).entries()) {
						inspectTween(
							(tween as Record<string, unknown>).vars as Record<string, unknown> | undefined,
							`${basePath}.timeline.${itemIndex}.tweens.${tweenIndex}.vars`,
							capability,
							component,
							layer.id,
							mode,
							issues
						);
					}
				}
			}

			if (component.effects?.enabled !== false) {
				for (const [effectId, effect] of Object.entries(component.effects?.map ?? {})) {
					const effectType = (effect as { type?: string })?.type;
					if (effectType && !capability.effects.supported.includes(effectType)) {
						issues.push(
							issue(mode, component, layer.id, {
								code: 'runtime-effect-unsupported',
								capabilityId: `component.${component.type}.effect.${effectType}`,
								path: `layers.${layer.id}.components.${component.id}.effects.map.${effectId}`,
								message: `${effectType} is accepted for ${component.type} but is not in its runtime-supported effect set.`
							})
						);
					}
				}
			}

			if (component.type === 'TEXT' || component.type === 'SUBTITLES') {
				const text = component.appearance.text;
				if (text.activeWord?.enabled && text.activeLine?.enabled) {
					issues.push(
						issue(mode, component, layer.id, {
							code: 'runtime-text-highlight-conflict',
							capabilityId: `component.${component.type}.text.activeHighlight.precedence`,
							path: `layers.${layer.id}.components.${component.id}.appearance.text`,
							message:
								'activeWord and activeLine target the same glyphs; activeWord takes deterministic precedence.'
						})
					);
				}
				if (text.highlightColors?.some((color) => typeof color !== 'string')) {
					issues.push(
						issue(mode, component, layer.id, {
							code: 'runtime-text-highlight-gradient-unsupported',
							capabilityId: `component.${component.type}.text.highlightColors.gradient`,
							path: `layers.${layer.id}.components.${component.id}.appearance.text.highlightColors`,
							message:
								'highlightColors currently cycles solid CSS colors only; gradient palette entries are not evaluated.'
						})
					);
				}
				const background = component.appearance.background;
				if (
					background &&
					typeof background === 'object' &&
					'color' in background &&
					background.target === 'element' &&
					typeof background.color === 'object' &&
					typeof text.color === 'object'
				) {
					issues.push(
						issue(mode, component, layer.id, {
							code: 'runtime-text-gradient-conflict',
							capabilityId: `component.${component.type}.text.compositing.elementGradientBackgroundWithGradientGlyph`,
							path: `layers.${layer.id}.components.${component.id}.appearance`,
							message:
								'Element-target gradient background and gradient glyph fill compete for CSS background-image. Use wrapper target.'
						})
					);
				}
			}
		}
	}

	return { supported: issues.length === 0, issues };
}
