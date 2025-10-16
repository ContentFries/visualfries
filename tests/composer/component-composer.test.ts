import { describe, it, expect } from 'vitest';
import { createComponentComposer } from '$lib';
import { ComponentShape } from '$lib'; // Adjust path to your schemas

describe('createComponentComposer', () => {
	it('should initialize a basic component with required properties', () => {
		const composer = createComponentComposer('comp-1', 'TEXT', {
			startAt: 0,
			endAt: 10
		});

		const component = composer
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

		// Check for required fields
		expect(component.id).toBe('comp-1');
		expect(component.type).toBe('TEXT');
		expect(component.timeline.endAt).toBe(10);

		// Check that Zod applied default values
		expect(component.visible).toBe(true);
		expect(component.order).toBe(0);
	});

	it('should correctly set and deep-merge appearance properties', () => {
		const composer = createComponentComposer('comp-2', 'TEXT', { startAt: 0, endAt: 5 });

		composer.setText('Hello world');
		// Set initial appearance
		composer.setAppearance({
			x: 100,
			y: 200,
			width: 100,
			height: 50,
			opacity: 1,
			text: {
				fontFamily: 'Arial',
				fontSize: 24,
				color: '#FFFFFF',
				textAlign: 'center'
			}
		});

		// Update a top-level property and a nested property
		composer.setAppearance({
			opacity: 0.8,
			text: {
				color: '#FF0000'
			}
		});

		const component = composer.compose();

		expect(component.appearance.x).toBe(100);
		expect(component.appearance.y).toBe(200);
		expect(component.appearance.opacity).toBe(0.8); // Updated
		expect(component.appearance.text?.fontFamily).toBe('Arial'); // Preserved
		expect(component.appearance.text?.color).toBe('#FF0000'); // Updated
	});

	it('should add animations and effects correctly', () => {
		const animation = { id: 'fade-in', name: 'Fade In', animation: 'fadeInPreset' };
		const effect = { type: 'blur', enabled: true, radius: 10 };

		const component = createComponentComposer('comp-3', 'IMAGE', { startAt: 1, endAt: 2 })
			.addAnimation(animation)
			.addEffect('mainBlur', effect)
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

		expect(component.animations?.list).toHaveLength(1);
		expect(component.animations?.list[0].name).toBe('Fade In');

		expect(component.effects?.map?.mainBlur).toBeDefined();
		expect(component.effects.map.mainBlur.type).toBe('blur');
	});

	it('should set miscellaneous properties via setProps', () => {
		const component = createComponentComposer('comp-4', 'VIDEO', { startAt: 0, endAt: 15 })
			.setProps({
				source: { assetId: 'video-asset-1' },
				volume: 0.75,
				muted: true
			})
			.setAppearance({
				x: 100,
				y: 200,
				width: 100,
				height: 50
			})
			.setSource({
				assetId: 'video-asset-1',
				url: 'https://example.com/video.mp4'
			})
			.compose();

		expect(component.source?.assetId).toBe('video-asset-1');
		expect(component.volume).toBe(0.75);
		expect(component.muted).toBe(true);
	});

	it('should correctly apply convenience methods', () => {
		const component = createComponentComposer('comp-5', 'SHAPE', { startAt: 0, endAt: 5 })
			.setName('My Shape')
			.setOrder(99)
			.setVisible(false)
			.setAppearance({
				x: 100,
				y: 200,
				width: 100,
				height: 50
			})
			.setProps({
				shape: {
					type: 'circle'
				}
			})
			.compose();

		expect(component.name).toBe('My Shape');
		expect(component.order).toBe(99);
		expect(component.visible).toBe(false);
	});

	it('should produce a valid component that passes Zod parsing', () => {
		const composer = createComponentComposer('comp-valid', 'TEXT', { startAt: 0, endAt: 10 })
			.setAppearance({
				x: 0,
				y: 0,
				width: 100,
				height: 50,
				text: { fontFamily: 'Roboto', fontSize: 16, color: 'blue', textAlign: 'center' }
			})
			.setProps({ text: 'Hello' });

		// The .compose() method itself is the test. If it throws, the test fails.
		// We can also explicitly parse it again to be sure.
		const component = composer.compose();
		expect(() => ComponentShape.parse(component)).not.toThrow();
		expect(component.text).toBe('Hello');
	});

	it('should correctly add assetId to subtitles source', () => {
		const assetId = 'abcd';
		const composer = createComponentComposer('subs', 'SUBTITLES', {
			startAt: 0,
			endAt: 10
		})
			.setProps({
				timingAnchor: {
					mode: 'ASSET_USAGE',
					assetId: assetId,
					offset: 0
				}
			})
			.setSource({
				assetId: assetId
			})
			.setAppearance({
				x: 0,
				y: 0,
				width: 100,
				height: 200,
				text: {
					fontFamily: 'Arial',
					fontSize: 24,
					color: '#FFFFFF',
					textAlign: 'center'
				}
			});
		const component = composer.compose();
		expect(() => ComponentShape.parse(component)).not.toThrow();
		expect(component.source?.assetId).toBe(assetId);
	});
});
