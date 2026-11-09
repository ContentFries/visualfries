import { describe, expect, it } from 'vitest';

import { createCaptionScene, inspectScene } from '$lib/agent';

const makeScene = () =>
	createCaptionScene({
		video: { url: 'https://example.com/input.mp4', assetId: 'video-1' },
		transcript: [{ text: 'Inspect me', start: 0, end: 1 }],
		language: 'en'
	}) as any;

const findComponent = (scene: any, type: string) =>
	scene.layers.flatMap((layer: any) => layer.components).find((c: any) => c.type === type);

describe('inspectScene', () => {
	it('reports a schema failure with an empty summary', () => {
		const report = inspectScene({ nope: true });
		expect(report).toMatchObject({
			valid: false,
			schemaValid: false,
			runtimeSupported: false,
			components: [],
			summary: { duration: 0, width: 0, height: 0, layers: 0, components: 0, runtimeWarnings: 0 }
		});
		expect(report.issues).toHaveLength(1);
		expect(report.issues[0]).toMatchObject({ level: 'error', type: 'schema' });
	});

	it('lists components with capabilities and omits them when asked', () => {
		const scene = makeScene();
		const withCaps = inspectScene(scene);
		expect(withCaps.components).toHaveLength(2);
		expect(withCaps.components[0]).toMatchObject({ type: 'VIDEO', layerId: scene.layers[0].id });
		expect(withCaps.components[0].capability).toBeDefined();
		expect(withCaps.summary).toMatchObject({
			duration: scene.settings.duration,
			width: scene.settings.width,
			height: scene.settings.height,
			layers: scene.layers.length,
			components: 2,
			runtimeWarnings: 0
		});

		const without = inspectScene(scene, { includeCapabilities: false });
		for (const component of without.components) {
			expect('capability' in component).toBe(false);
		}
	});

	it('warns when a component ends after the scene', () => {
		const scene = makeScene();
		const video = findComponent(scene, 'VIDEO');
		video.timeline.endAt = scene.settings.duration + 2;

		const report = inspectScene(scene);
		expect(report.valid).toBe(true);
		expect(report.issues).toContainEqual({
			level: 'warning',
			type: 'timeline-outside-scene',
			message: `Component ends after scene duration (${video.timeline.endAt}s > ${scene.settings.duration}s).`,
			componentId: video.id,
			layerId: scene.layers[0].id
		});
	});

	it('warns when a component references an unknown asset', () => {
		const scene = makeScene();
		const video = findComponent(scene, 'VIDEO');
		video.source = { ...video.source, assetId: 'ghost' };

		const report = inspectScene(scene);
		expect(report.issues).toContainEqual({
			level: 'warning',
			type: 'missing-asset',
			message: 'Component references asset "ghost" that is not in scene.assets.',
			componentId: video.id,
			layerId: scene.layers[0].id
		});
	});

	it('errors when subtitles have no anchor asset', () => {
		const scene = makeScene();
		const subtitles = findComponent(scene, 'SUBTITLES');
		subtitles.source = {};
		subtitles.timingAnchor = { mode: 'ASSET_USAGE', offset: 0 };

		const report = inspectScene(scene);
		expect(report.valid).toBe(false);
		expect(report.issues).toContainEqual({
			level: 'error',
			type: 'subtitle-anchor-missing',
			message: 'Subtitles component needs timingAnchor.assetId or source.assetId.',
			componentId: subtitles.id,
			layerId: expect.any(String)
		});
	});

	it('warns when no subtitle data exists for the anchor asset', () => {
		const scene = makeScene();
		const subtitles = findComponent(scene, 'SUBTITLES');
		subtitles.source = { assetId: 'other' };
		subtitles.timingAnchor = { mode: 'ASSET_USAGE', offset: 0, assetId: 'other' };

		const report = inspectScene(scene);
		expect(report.valid).toBe(true);
		expect(report.issues).toContainEqual(
			expect.objectContaining({
				level: 'warning',
				type: 'subtitle-data-missing',
				message: 'No scene.settings.subtitles.data entry found for "other".'
			})
		);
	});

	it('warns when the requested language is missing or empty', () => {
		const scene = makeScene();
		const subtitles = findComponent(scene, 'SUBTITLES');
		subtitles.source = { assetId: 'video-1', languageCode: 'de' };
		expect(inspectScene(scene).issues).toContainEqual(
			expect.objectContaining({ type: 'subtitle-language-data-missing' })
		);

		scene.settings.subtitles.data['video-1'].de = [];
		expect(inspectScene(scene).issues).toContainEqual(
			expect.objectContaining({ type: 'subtitle-language-data-missing' })
		);

		subtitles.source = { assetId: 'video-1', languageCode: 'en' };
		expect(inspectScene(scene).issues).toEqual([]);
	});

	it('flags clipColor on raw input components', () => {
		const scene = makeScene();
		const text = findComponent(scene, 'SUBTITLES');
		text.appearance.text.clipColor = '#f00';
		const layerIndex = scene.layers.findIndex((l: any) => l.components.includes(text));
		const componentIndex = scene.layers[layerIndex].components.indexOf(text);

		const warn = inspectScene(scene);
		expect(warn.runtimeSupported).toBe(false);
		expect(warn.summary.runtimeWarnings).toBe(1);
		expect(warn.issues).toContainEqual({
			level: 'warning',
			type: 'runtime-support',
			code: 'runtime-text-clip-color-unsupported',
			capabilityId: 'component.SUBTITLES.text.clipColor',
			path: `layers.${layerIndex}.components.${componentIndex}.appearance.text.clipColor`,
			message:
				'clipColor has no defined VisualFries runtime semantics and would otherwise be stripped during parsing.',
			componentId: text.id,
			layerId: scene.layers[layerIndex].id
		});
		const strict = inspectScene(scene, { strictRuntimeSupport: true });
		expect(strict.valid).toBe(false);
		expect(strict.issues.find((i) => i.code === 'runtime-text-clip-color-unsupported')?.level).toBe(
			'error'
		);
	});

	it('flags a top-level appearance.clipColor too', () => {
		const scene = makeScene();
		const video = findComponent(scene, 'VIDEO');
		video.appearance.clipColor = '#00f';
		const report = inspectScene(scene);
		expect(report.issues).toContainEqual(
			expect.objectContaining({
				code: 'runtime-text-clip-color-unsupported',
				capabilityId: 'component.VIDEO.text.clipColor',
				componentId: video.id
			})
		);
	});
});
