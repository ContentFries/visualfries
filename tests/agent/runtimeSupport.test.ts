import { describe, expect, it, vi } from 'vitest';
import type { Scene } from '$lib/schemas/scene';

const capabilityOverrides = vi.hoisted(() => ({ previewNone: false }));

// The real catalog has no visual component without a preview renderer, so the
// "renderer missing" branch can only be reached by faking one.
vi.mock('$lib/agent/capabilities.js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/agent/capabilities.js')>();
	return {
		...actual,
		getComponentCapability: (type: string) => {
			const capability = actual.getComponentCapability(type);
			if (!capability || !capabilityOverrides.previewNone || type !== 'SHAPE') return capability;
			return { ...capability, renderers: { ...capability.renderers, preview: 'none' as const } };
		}
	};
});

const { analyzeRuntimeSupport } = await import('$lib/agent/runtimeSupport.js');

type LooseComponent = Record<string, unknown> & { id: string; type: string };

const sceneWith = (components: LooseComponent[], layerId = 'layer-a'): Scene =>
	({
		id: 'scene',
		settings: { width: 100, height: 100, duration: 1, fps: 10 },
		assets: [],
		layers: [{ id: layerId, components }]
	}) as unknown as Scene;

const textComponent = (overrides: Record<string, unknown> = {}): LooseComponent => ({
	id: 'text-1',
	type: 'TEXT',
	appearance: { text: {} },
	...overrides
});

const codes = (scene: Scene, mode?: 'warn' | 'strict') =>
	analyzeRuntimeSupport(scene, { mode }).issues.map((item) => item.code);

describe('analyzeRuntimeSupport', () => {
	it('reports a supported scene with no issues', () => {
		expect(analyzeRuntimeSupport({ id: 'x', layers: undefined } as unknown as Scene)).toEqual({
			supported: true,
			issues: []
		});
		const report = analyzeRuntimeSupport(sceneWith([{ id: 's', type: 'SHAPE' }]));
		expect(report).toEqual({ supported: true, issues: [] });
	});

	it('skips components whose type has no capability entry', () => {
		const scene = sceneWith([
			{ id: 'u', type: 'UNKNOWN', animations: { list: [{ animation: { tween: {} } }] } }
		]);
		expect(analyzeRuntimeSupport(scene).issues).toEqual([]);
	});

	it('uses warning level by default and error level in strict mode', () => {
		const scene = sceneWith([
			{ id: 'a', type: 'AUDIO', animations: { list: [{ animation: 'fade' }] } }
		]);
		expect(analyzeRuntimeSupport(scene).issues[0]).toMatchObject({
			level: 'warning',
			type: 'runtime-support',
			componentId: 'a',
			layerId: 'layer-a'
		});
		const strict = analyzeRuntimeSupport(scene, { mode: 'strict' });
		expect(strict.supported).toBe(false);
		expect(strict.issues[0].level).toBe('error');
	});

	it('flags a visual component that has no preview render hook', () => {
		capabilityOverrides.previewNone = true;
		try {
			const report = analyzeRuntimeSupport(sceneWith([{ id: 's', type: 'SHAPE' }]));
			expect(report.supported).toBe(false);
			expect(report.issues).toEqual([
				{
					level: 'warning',
					type: 'runtime-support',
					code: 'runtime-renderer-missing',
					capabilityId: 'component.SHAPE.runtime.rendered',
					path: 'layers.0.components.0',
					message: 'SHAPE is accepted by schema but has no component render hook.',
					componentId: 's',
					layerId: 'layer-a'
				}
			]);
		} finally {
			capabilityOverrides.previewNone = false;
		}
	});

	describe('animation attachment', () => {
		it('flags enabled animations on a component without an animation target', () => {
			const scene = sceneWith([
				{ id: 'a', type: 'AUDIO', animations: { list: [{ animation: 'fade' }] } }
			]);
			expect(analyzeRuntimeSupport(scene).issues).toEqual([
				expect.objectContaining({
					code: 'runtime-animation-unsupported',
					capabilityId: 'component.AUDIO.animation.attachment',
					path: 'layers.0.components.0.animations',
					message:
						'AUDIO animation data validates but is not attached to a runtime animation target.'
				})
			]);
		});

		it('ignores animations that are disabled globally, per entry, or null', () => {
			const disabledAll = sceneWith([
				{
					id: 'a',
					type: 'AUDIO',
					animations: { enabled: false, list: [{ animation: 'fade' }] }
				}
			]);
			const disabledEntry = sceneWith([
				{
					id: 'a',
					type: 'AUDIO',
					animations: { list: [null, { enabled: false, animation: 'fade' }] }
				}
			]);
			const noList = sceneWith([{ id: 'a', type: 'AUDIO', animations: {} }]);
			expect(codes(disabledAll)).toEqual([]);
			expect(codes(disabledEntry)).toEqual([]);
			expect(codes(noList)).toEqual([]);
		});

		it('does not inspect preset animations given by name', () => {
			const scene = sceneWith([textComponent({ animations: { list: [{ animation: 'fadeIn' }] } })]);
			expect(codes(scene)).toEqual([]);
		});
	});

	describe('tween animations', () => {
		const withTween = (animation: Record<string, unknown>, type = 'IMAGE') =>
			sceneWith([
				{ id: 'c', type, appearance: { text: {} }, animations: { list: [{ animation }] } }
			]);

		it('accepts tweens that use supported transforms and control keys', () => {
			const scene = withTween({
				tween: { vars: { x: 10, opacity: 0, duration: 1, ease: 'none', from: { scale: 0 } } }
			});
			expect(codes(scene)).toEqual([]);
		});

		it('flags a selector the component cannot target, with the css fallback kind', () => {
			expect(
				analyzeRuntimeSupport(withTween({ target: '.foo', tween: { vars: {} } })).issues
			).toEqual([
				expect.objectContaining({
					code: 'runtime-animation-selector-unsupported',
					capabilityId: 'component.IMAGE.animation.selector.css',
					path: 'layers.0.components.0.animations.list.0.target',
					message: 'IMAGE animation target ".foo" collapses to or misses the runtime target.'
				})
			]);
			expect(codes(withTween({ target: 'words', tween: {} }))).toEqual([
				'runtime-animation-selector-unsupported'
			]);
		});

		it('treats missing, empty and container targets as the container', () => {
			expect(codes(withTween({ tween: { vars: {} } }))).toEqual([]);
			expect(codes(withTween({ target: '', tween: { vars: {} } }))).toEqual([]);
			expect(codes(withTween({ target: 'container', tween: { vars: {} } }))).toEqual([]);
			expect(codes(withTween({ target: 42, tween: { vars: {} } }))).toEqual([]);
		});

		it('accepts text selectors on TEXT components', () => {
			for (const target of ['words', 'lines', 'chars', '.glyph']) {
				expect(codes(withTween({ target, tween: { vars: {} } }, 'TEXT'))).toEqual([]);
			}
		});

		it('flags properties outside the known transform list', () => {
			const issues = analyzeRuntimeSupport(
				withTween({ tween: { vars: { width: 5, from: { height: 1 } } } })
			).issues;
			expect(issues).toEqual([
				expect.objectContaining({
					code: 'runtime-animation-property-unsupported',
					capabilityId: 'component.IMAGE.animation.property.width',
					path: 'layers.0.components.0.animations.list.0.tween.vars.width',
					message: 'IMAGE does not guarantee animation property "width" at runtime.'
				}),
				expect.objectContaining({
					capabilityId: 'component.IMAGE.animation.property.height',
					path: 'layers.0.components.0.animations.list.0.tween.vars.from.height'
				})
			]);
		});

		it('flags known transforms that the component does not evaluate', () => {
			// AUDIO has no transforms and no selectors, so it hits every branch at once.
			const audioLike = sceneWith([
				{
					id: 'a',
					type: 'AUDIO',
					animations: { list: [{ animation: { tween: { vars: { x: 1 } } } }] }
				}
			]);
			expect(analyzeRuntimeSupport(audioLike).issues.map((item) => item.code)).toEqual([
				'runtime-animation-unsupported',
				'runtime-animation-selector-unsupported',
				'runtime-animation-property-unsupported'
			]);
			expect(analyzeRuntimeSupport(audioLike).issues[2].message).toBe(
				'AUDIO accepts "x" in schema but does not evaluate it at runtime.'
			);
		});

		it('ignores a tween without vars and a non-object from block', () => {
			expect(codes(withTween({ tween: {} }))).toEqual([]);
			expect(codes(withTween({ tween: { vars: { from: 'x', opacity: 1 } } }))).toEqual([]);
			expect(codes(withTween({ tween: { vars: { from: null, opacity: 1 } } }))).toEqual([]);
		});
	});

	describe('timeline animations', () => {
		const withTimeline = (timeline: unknown[], type = 'IMAGE') =>
			sceneWith([
				{
					id: 'c',
					type,
					appearance: { text: {} },
					animations: { list: [{ animation: { timeline } }] }
				}
			]);

		it('flags sequence targets and tween properties with indexed paths', () => {
			const issues = analyzeRuntimeSupport(
				withTimeline([
					{ target: 'ok', tweens: [] },
					{
						target: 'chars',
						tweens: [{ vars: { opacity: 1 } }, { vars: { skew: 3, from: { y: 0, blur: 1 } } }]
					}
				])
			).issues;
			expect(issues).toEqual([
				expect.objectContaining({
					code: 'runtime-animation-selector-unsupported',
					capabilityId: 'component.IMAGE.animation.selector.css',
					path: 'layers.0.components.0.animations.list.0.timeline.0.target',
					message: 'IMAGE does not support animation selector "ok".'
				}),
				expect.objectContaining({
					code: 'runtime-animation-selector-unsupported',
					capabilityId: 'component.IMAGE.animation.selector.chars',
					path: 'layers.0.components.0.animations.list.0.timeline.1.target'
				}),
				expect.objectContaining({
					capabilityId: 'component.IMAGE.animation.property.skew',
					path: 'layers.0.components.0.animations.list.0.timeline.1.tweens.1.vars.skew'
				}),
				expect.objectContaining({
					capabilityId: 'component.IMAGE.animation.property.blur',
					path: 'layers.0.components.0.animations.list.0.timeline.1.tweens.1.vars.from.blur'
				})
			]);
		});

		it('handles sequences without tweens and tweens without vars', () => {
			expect(codes(withTimeline([{ target: 'container' }, { tweens: [{}] }]))).toEqual([]);
		});

		it('accepts a timeline on text components for every text selector', () => {
			const scene = withTimeline(
				[
					{ target: 'words', tweens: [{ vars: { x: 1 } }] },
					{ target: 'lines', tweens: [] }
				],
				'TEXT'
			);
			expect(codes(scene)).toEqual([]);
		});

		it('reports one entry per animation index', () => {
			const scene = sceneWith([
				{
					id: 'c',
					type: 'IMAGE',
					animations: {
						list: [{ animation: 'preset' }, { animation: { tween: { vars: { width: 1 } } } }]
					}
				}
			]);
			expect(analyzeRuntimeSupport(scene).issues[0].path).toBe(
				'layers.0.components.0.animations.list.1.tween.vars.width'
			);
		});
	});

	describe('effects', () => {
		const withEffects = (effects: unknown, type = 'TEXT') =>
			sceneWith([{ id: 'c', type, appearance: { text: {} }, effects }]);

		it('flags effect types missing from the supported set', () => {
			const report = analyzeRuntimeSupport(
				withEffects({
					map: {
						shadow: { type: 'textShadow' },
						soft: { type: 'blur' },
						untyped: {},
						nothing: null
					}
				})
			);
			expect(report.issues).toEqual([
				expect.objectContaining({
					code: 'runtime-effect-unsupported',
					capabilityId: 'component.TEXT.effect.blur',
					path: 'layers.0.components.0.effects.map.soft',
					message: 'blur is accepted for TEXT but is not in its runtime-supported effect set.'
				})
			]);
		});

		it('skips effects when they are disabled', () => {
			expect(codes(withEffects({ enabled: false, map: { soft: { type: 'blur' } } }))).toEqual([]);
		});

		it('checks effects when the effects block has no map', () => {
			expect(codes(withEffects({}))).toEqual([]);
		});
	});

	describe('text conflicts', () => {
		const withText = (appearance: Record<string, unknown>, type = 'TEXT') =>
			sceneWith([{ id: 't', type, appearance }]);

		it('flags activeWord and activeLine both enabled', () => {
			const scene = withText({
				text: { activeWord: { enabled: true }, activeLine: { enabled: true } }
			});
			expect(analyzeRuntimeSupport(scene).issues).toEqual([
				expect.objectContaining({
					code: 'runtime-text-highlight-conflict',
					capabilityId: 'component.TEXT.text.activeHighlight.precedence',
					path: 'layers.0.components.0.appearance.text',
					message:
						'activeWord and activeLine target the same glyphs; activeWord takes deterministic precedence.'
				})
			]);
			expect(
				codes(
					withText(
						{ text: { activeWord: { enabled: true }, activeLine: { enabled: true } } },
						'SUBTITLES'
					)
				)
			).toEqual(['runtime-text-highlight-conflict']);
		});

		it('does not flag a single active highlight', () => {
			expect(codes(withText({ text: { activeWord: { enabled: true } } }))).toEqual([]);
			expect(codes(withText({ text: { activeLine: { enabled: true } } }))).toEqual([]);
			expect(
				codes(withText({ text: { activeWord: { enabled: true }, activeLine: { enabled: false } } }))
			).toEqual([]);
		});

		it('flags gradient entries among highlight colors', () => {
			const scene = withText({
				text: { highlightColors: ['#fff', { type: 'linear', stops: [] }] }
			});
			expect(analyzeRuntimeSupport(scene).issues).toEqual([
				expect.objectContaining({
					code: 'runtime-text-highlight-gradient-unsupported',
					capabilityId: 'component.TEXT.text.highlightColors.gradient',
					path: 'layers.0.components.0.appearance.text.highlightColors'
				})
			]);
			expect(codes(withText({ text: { highlightColors: ['#fff', '#000'] } }))).toEqual([]);
		});

		it('flags a gradient glyph fill over an element-target gradient background', () => {
			const gradient = { type: 'linear' };
			const scene = withText({
				text: { color: gradient },
				background: { target: 'element', color: gradient }
			});
			expect(analyzeRuntimeSupport(scene).issues).toEqual([
				expect.objectContaining({
					code: 'runtime-text-gradient-conflict',
					capabilityId:
						'component.TEXT.text.compositing.elementGradientBackgroundWithGradientGlyph',
					path: 'layers.0.components.0.appearance',
					message:
						'Element-target gradient background and gradient glyph fill compete for CSS background-image. Use wrapper target.'
				})
			]);
		});

		it('does not flag gradient glyphs when the background differs', () => {
			const gradient = { type: 'linear' };
			const text = { color: gradient };
			expect(codes(withText({ text, background: { target: 'wrapper', color: gradient } }))).toEqual(
				[]
			);
			expect(codes(withText({ text, background: { target: 'element', color: '#000' } }))).toEqual(
				[]
			);
			expect(codes(withText({ text, background: { target: 'element' } }))).toEqual([]);
			expect(codes(withText({ text, background: 'none' }))).toEqual([]);
			expect(codes(withText({ text, background: null }))).toEqual([]);
			expect(
				codes(
					withText({
						text: { color: '#fff' },
						background: { target: 'element', color: gradient }
					})
				)
			).toEqual([]);
		});

		it('does not apply text checks to other component types', () => {
			const scene = withText(
				{ text: { activeWord: { enabled: true }, activeLine: { enabled: true } } },
				'IMAGE'
			);
			expect(codes(scene)).toEqual([]);
		});
	});

	it('collects issues from several layers and components in order', () => {
		const scene = {
			id: 's',
			settings: {},
			assets: [],
			layers: [
				{
					id: 'l1',
					components: [{ id: 'a', type: 'AUDIO', animations: { list: [{ animation: 'x' }] } }]
				},
				{
					id: 'l2',
					components: [
						{ id: 'ok', type: 'SHAPE' },
						{ id: 'b', type: 'AUDIO', animations: { list: [{ animation: 'x' }] } }
					]
				},
				{ id: 'l3' }
			]
		} as unknown as Scene;
		const issues = analyzeRuntimeSupport(scene).issues;
		expect(issues.map((item) => [item.layerId, item.componentId, item.path])).toEqual([
			['l1', 'a', 'layers.0.components.0.animations'],
			['l2', 'b', 'layers.1.components.1.animations']
		]);
	});
});
