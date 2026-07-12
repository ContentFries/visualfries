import { describe, expect, it } from 'vitest';

import {
	COMPONENT_CAPABILITIES,
	COMPONENT_TYPES,
	createCaptionScene,
	getAgentCatalog,
	getCapabilityCatalog,
	inspectScene
} from '$lib/agent';

describe('agent runtime capability truth', () => {
	it('covers every schema component discriminant including nonvisual AUDIO', () => {
		expect(Object.keys(COMPONENT_CAPABILITIES).sort()).toEqual([...COMPONENT_TYPES].sort());
		expect(getCapabilityCatalog()).toHaveLength(COMPONENT_TYPES.length);
		for (const type of COMPONENT_TYPES) {
			expect(COMPONENT_CAPABILITIES[type].type).toBe(type);
		}
		expect(COMPONENT_CAPABILITIES.AUDIO.visual).toBe(false);
		expect(COMPONENT_CAPABILITIES.AUDIO.animation.attached).toBe(false);
	});

	it('filters the catalog to one discoverable component capability', () => {
		const catalog = getAgentCatalog({ component: 'TEXT' });
		expect(catalog.capabilities).toMatchObject({
			type: 'TEXT',
			animation: { attached: true }
		});
		expect(() => getAgentCatalog({ component: 'NOPE' as never })).toThrow(
			'Unknown VisualFries component type'
		);
	});

	it('warns by default and fails the strict gate when valid data is not evaluated', () => {
		const scene = createCaptionScene({
			video: { url: 'https://example.com/input.mp4' },
			transcript: [{ text: 'Runtime truth', start: 0, end: 1 }]
		});
		const video = scene.layers
			.flatMap((layer) => layer.components)
			.find((component) => component.type === 'VIDEO');
		if (!video) throw new Error('fixture VIDEO missing');
		video.animations = {
			enabled: true,
			list: [
				{
					id: 'video-fade',
					name: 'Video fade',
					animation: { tween: { method: 'from', vars: { width: 0, duration: 0.2 } } }
				}
			]
		};

		const compatible = inspectScene(scene);
		expect(compatible.valid).toBe(true);
		expect(compatible.runtimeSupported).toBe(false);
		expect(compatible.issues).toContainEqual(
			expect.objectContaining({
				level: 'warning',
				code: 'runtime-animation-property-unsupported',
				componentId: video.id
			})
		);

		const strict = inspectScene(scene, { strictRuntimeSupport: true });
		expect(strict.valid).toBe(false);
		expect(strict.issues).toContainEqual(
			expect.objectContaining({
				level: 'error',
				capabilityId: 'component.VIDEO.animation.property.width'
			})
		);
	});

	it('accepts proven IMAGE transforms but diagnoses Pixi-only selector misuse', () => {
		const scene = createCaptionScene({
			video: { url: 'https://example.com/input.mp4' },
			transcript: [{ text: 'Runtime truth', start: 0, end: 1 }]
		});
		const image = {
			id: 'image-capability',
			type: 'IMAGE' as const,
			source: { url: 'https://example.com/image.png' },
			timeline: { startAt: 0, endAt: 1 },
			appearance: { x: 0, y: 0, width: 100, height: 100 },
			animations: {
				enabled: true,
				list: [
					{
						id: 'image-enter',
						name: 'Image enter',
						animation: {
							target: 'words',
							tween: {
								method: 'from' as const,
								vars: { x: -10, opacity: 0, scale: 0.8, duration: 0.2 }
							}
						}
					}
				]
			}
		};
		scene.layers[0].components.push(image as never);

		const report = inspectScene(scene);
		expect(report.issues).not.toContainEqual(
			expect.objectContaining({ code: 'runtime-animation-property-unsupported' })
		);
		expect(report.issues).toContainEqual(
			expect.objectContaining({
				code: 'runtime-animation-selector-unsupported',
				componentId: image.id
			})
		);
	});

	it('catches clipColor before permissive nested parsing can silently strip it', () => {
		const scene = createCaptionScene({
			video: { url: 'https://example.com/input.mp4' },
			transcript: [{ text: 'Clip truth', start: 0, end: 1 }]
		}) as any;
		const subtitles = scene.layers
			.flatMap((layer: any) => layer.components)
			.find((component: any) => component.type === 'SUBTITLES');
		subtitles.appearance.text.clipColor = '#FF0000';

		const compatible = inspectScene(scene);
		expect(compatible.valid).toBe(true);
		expect(compatible.runtimeSupported).toBe(false);
		expect(compatible.issues).toContainEqual(
			expect.objectContaining({ code: 'runtime-text-clip-color-unsupported' })
		);
		expect(inspectScene(scene, { strictRuntimeSupport: true }).valid).toBe(false);
	});
});
