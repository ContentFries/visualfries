import { describe, it, expect } from 'vitest';
import { createLayerComposer } from '$lib';
import { createComponentComposer } from '$lib';
import { SceneLayerShape } from '$lib'; // Adjust path

describe('createLayerComposer', () => {
	it('should initialize a layer with a unique ID', () => {
		const layer = createLayerComposer('layer-1').compose();

		expect(layer.id).toBe('layer-1');

		// Check defaults from Zod schema
		expect(layer.components).toEqual([]);
		expect(layer.visible).toBe(true);
		expect(layer.order).toBe(0);
		expect(layer.muted).toBe(false);
	});

	it('should add pre-composed components to the layer', () => {
		const textComponent = createComponentComposer('c1', 'TEXT', { startAt: 0, endAt: 1 })
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
		const imageComponent = createComponentComposer('c2', 'IMAGE', {
			startAt: 0,
			endAt: 1
		})
			.setAppearance({
				x: 100,
				y: 200,
				width: 100,
				height: 50
			})
			.setSource({
				url: 'https://example.com/image.png'
			})
			.compose();

		const layer = createLayerComposer('layer-2')
			.addComponent(textComponent)
			.addComponent(imageComponent)
			.compose();

		expect(layer.components).toHaveLength(2);
		expect(layer.components[0].id).toBe('c1');
		expect(layer.components[1].type).toBe('IMAGE');
	});

	it('should apply all convenience methods correctly', () => {
		const layer = createLayerComposer('layer-3')
			.setName('Foreground')
			.setOrder(10)
			.setVisible(false)
			.setMuted(true)
			.compose();

		expect(layer.name).toBe('Foreground');
		expect(layer.order).toBe(10);
		expect(layer.visible).toBe(false);
		expect(layer.muted).toBe(true);
	});

	it('should produce a valid layer that passes Zod parsing', () => {
		const component = createComponentComposer('c1', 'TEXT', { startAt: 0, endAt: 1 })
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
			.setSource({
				url: 'https://example.com/image.png'
			})
			.compose();
		const layerComposer = createLayerComposer('layer-valid').addComponent(component);

		// .compose() runs the parse. If it throws, the test fails.
		const layer = layerComposer.compose();
		expect(() => SceneLayerShape.parse(layer)).not.toThrow();
	});
});
