import { describe, it, expect } from 'vitest';
import { createSceneComposer } from '$lib/composers/sceneComposer.js';
import { createLayerComposer } from '$lib/composers/layerComposer.js';
import { createComponentComposer } from '$lib/composers/componentComposer.js';
import { SceneShape } from '$lib/index.js'; // Adjust path

describe('createSceneComposer', () => {
	const initialSettings = {
		width: 1920,
		height: 1080,
		duration: 30,
		fps: 30,
		backgroundColor: '#000000'
	};

	it('should initialize a scene with an ID, version, and settings', () => {
		const scene = createSceneComposer('scene-1', initialSettings).compose();

		expect(scene.id).toBe('scene-1');
		expect(scene.settings.width).toBe(1920);
		expect(scene.settings.duration).toBe(30);
	});

	it('should merge new settings with existing ones', () => {
		const scene = createSceneComposer('scene-2', initialSettings)
			.setName('Updated Scene')
			.setSettings({
				duration: 60 // Overwrite
			})
			.compose();

		expect(scene.settings.duration).toBe(60);
		expect(scene.settings.width).toBe(1920); // Should remain
		expect(scene.name).toBe('Updated Scene'); // Should be on the root, not settings
	});

	it('should add assets, audio tracks, and transitions', () => {
		const scene = createSceneComposer('scene-3', initialSettings)
			.addAsset({ id: 'asset-1', type: 'IMAGE', url: '...' })
			.addAudioTrack({ id: 'audio-1', url: '...', startAt: 0 })
			// TODO implement
			// .addTransition({
			// 	id: 'trans-1',
			// 	fromComponentId: 'c1',
			// 	toComponentId: 'c2',
			// 	type: 'fade',
			// 	duration: 1
			// })
			.compose();

		expect(scene.assets).toHaveLength(1);
		expect(scene.assets[0].id).toBe('asset-1');
		expect(scene.audioTracks).toHaveLength(1);
		// expect(scene.transitions).toHaveLength(1);
	});

	it('should set subtitle data within settings', () => {
		const subtitleData = { punctuation: false, data: { 'asset-1': { default: [] } } };
		const scene = createSceneComposer('scene-4', initialSettings)
			.setSubtitles(subtitleData)
			.compose();

		expect(scene.settings.subtitles).toBeDefined();
		expect(scene.settings.subtitles?.punctuation).toBe(false);
		expect(scene.settings.subtitles?.data).toEqual({ 'asset-1': { default: [] } });
	});

	it('should correctly assemble a full scene from composed parts', () => {
		// 1. Compose a component
		const component = createComponentComposer('comp-1', 'TEXT', { startAt: 0, endAt: 5 })
			.setAppearance({
				x: 0,
				y: 0,
				width: 100,
				height: 50,
				text: {
					fontFamily: 'Arial',
					fontSize: 24,
					color: '#FFFFFF',
					textAlign: 'center'
				}
			})
			.setText('Hello world')
			.compose();

		// 2. Compose a layer with that component
		const layer = createLayerComposer('layer-1').addComponent(component).setOrder(5).compose();

		// 3. Compose the scene with that layer
		const scene = createSceneComposer('scene-final', initialSettings).addLayer(layer).compose();

		expect(scene.layers).toHaveLength(1);
		expect(scene.layers[0].id).toBe('layer-1');
		expect(scene.layers[0].order).toBe(5);
		expect(scene.layers[0].components).toHaveLength(1);
		expect(scene.layers[0].components[0].id).toBe('comp-1');
	});

	it('should produce a valid final scene object that passes Zod parsing', () => {
		const sceneComposer = createSceneComposer('scene-valid', initialSettings)
			.addAsset({ id: 'a1', type: 'IMAGE', url: '...' })
			.addLayer(createLayerComposer('l1').compose());

		const scene = sceneComposer.compose();
		expect(() => SceneShape.parse(scene)).not.toThrow();
	});
});
