import { describe, test, expect } from 'vitest';
import {
	TextComponentShape,
	ImageComponentShape,
	VideoComponentShape,
	ComponentShape,
	ComponentTimelineShape,
	ShapeComponentShape
} from '$lib';

describe('Component schemas', () => {
	const validTimeline = {
		startAt: 0,
		endAt: 5
	};

	const validAppearance = {
		x: 100,
		y: 200,
		width: 300,
		height: 200
	};

	describe('ComponentTimelineShape', () => {
		test('should validate valid timeline', () => {
			const result = ComponentTimelineShape.safeParse(validTimeline);
			expect(result.success).toBe(true);
		});

		test('should reject negative time values', () => {
			const invalidTimeline = {
				startAt: -1, // Negative time is invalid
				endAt: 5
			};

			const result = ComponentTimelineShape.safeParse(invalidTimeline);
			expect(result.success).toBe(false);
		});
	});

	describe('TextComponentShape', () => {
		test('should validate valid text component', () => {
			const validTextComponent = {
				id: 'text-1',
				type: 'TEXT',
				text: 'Hello world',
				timeline: validTimeline,
				appearance: {
					...validAppearance,
					text: {
						fontFamily: 'Arial',
						fontSize: 18,
						fontWeight: 'normal',
						lineHeight: 1.2,
						color: '#000000',
						textAlign: 'left'
					},
					verticalAlign: 'center',
					horizontalAlign: 'center'
				}
			};

			const result = TextComponentShape.safeParse(validTextComponent);
			expect(result.success).toBe(true);
		});
	});

	describe('ImageComponentShape', () => {
		test('should validate valid image component', () => {
			const validImageComponent = {
				id: 'image-1',
				type: 'IMAGE',
				timeline: validTimeline,
				appearance: validAppearance,
				source: {
					url: 'https://example.com/image.jpg',
					type: 'url',
					metadata: {
						width: 1200,
						height: 800,
						format: 'jpg'
					}
				}
			};

			const result = ImageComponentShape.safeParse(validImageComponent);
			expect(result.success).toBe(true);
		});
	});

	describe('VideoComponentShape', () => {
		test('should validate valid video component', () => {
			const validVideoComponent = {
				id: 'video-1',
				type: 'VIDEO',
				timeline: validTimeline,
				appearance: validAppearance,
				source: {
					url: 'https://example.com/video.mp4',
					type: 'url',
					metadata: {
						width: 1920,
						height: 1080,
						duration: 30,
						format: 'mp4',
						codec: 'h264',
						framerate: 30
					}
				},
				playback: {
					autoplay: true,
					loop: false,
					muted: true,
					volume: 1,
					playbackRate: 1,
					startAt: 0
				}
			};

			const result = VideoComponentShape.safeParse(validVideoComponent);
			expect(result.success).toBe(true);
		});
	});

	describe('ComponentShape', () => {
		test('should validate different component types via discriminated union', () => {
			const validTextComponent = {
				id: 'text-1',
				type: 'TEXT',
				text: 'Hello world',
				timeline: validTimeline,

				appearance: {
					...validAppearance,
					text: {
						fontFamily: 'Arial',
						fontSize: {
							value: 18,
							unit: 'px'
						},
						fontWeight: 'normal',
						lineHeight: 1.2,
						color: '#000000',
						textAlign: 'left'
					},
					verticalAlign: 'center',
					horizontalAlign: 'center'
				}
			};

			const validImageComponent = {
				id: 'image-1',
				type: 'IMAGE',
				timeline: validTimeline,
				appearance: validAppearance,
				source: {
					url: 'https://example.com/image.jpg'
				}
			};

			const textResult = ComponentShape.safeParse(validTextComponent);
			expect(textResult.success).toBe(true);

			const imageResult = ComponentShape.safeParse(validImageComponent);
			expect(imageResult.success).toBe(true);

			if (textResult.success && imageResult.success) {
				// Should correctly identify component types
				expect(textResult.data.type).toBe('TEXT');
				expect(imageResult.data.type).toBe('IMAGE');
			}
		});

		test('should reject component with invalid type', () => {
			const invalidComponent = {
				id: 'invalid-1',
				type: 'INVALID_TYPE', // Invalid component type
				timeline: validTimeline,
				appearance: validAppearance
			};

			const result = ComponentShape.safeParse(invalidComponent);
			expect(result.success).toBe(false);
		});
	});

	describe('Background property validation', () => {
		test('should validate component without background property', () => {
			const componentWithoutBackground = {
				id: 'shape-1',
				type: 'SHAPE',
				timeline: validTimeline,
				appearance: {
					...validAppearance,
					color: '#000000'
				},
				shape: {
					type: 'rectangle'
				}
			};

			const result = ComponentShape.safeParse(componentWithoutBackground);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.appearance.background).toBeUndefined();
			}
		});

		test('should validate component with null background', () => {
			const componentWithNullBackground = {
				id: 'shape-2',
				type: 'SHAPE',
				timeline: validTimeline,
				appearance: {
					...validAppearance,
					color: '#000000',
					background: null
				},
				shape: {
					type: 'rectangle'
				}
			};

			const result = ComponentShape.safeParse(componentWithNullBackground);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.appearance.background).toBeNull();
			}
		});

		test('should validate component with string color background', () => {
			const componentWithStringBackground = {
				id: 'shape-3',
				type: 'SHAPE',
				timeline: validTimeline,
				appearance: {
					...validAppearance,
					color: '#000000',
					background: '#ff0000'
				},
				shape: {
					type: 'rectangle'
				}
			};

			const result = ComponentShape.safeParse(componentWithStringBackground);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.appearance.background).toEqual({
					enabled: true,
					color: '#ff0000',
					target: 'wrapper',
					radius: 0
				});
			}
		});

		test('should validate component with BgShape object background', () => {
			const componentWithBgShapeBackground = {
				id: 'shape-4',
				type: 'SHAPE',
				timeline: validTimeline,
				appearance: {
					...validAppearance,
					color: '#000000',
					background: {
						enabled: true,
						color: '#00ff00',
						target: 'element',
						radius: 5
					}
				},
				shape: {
					type: 'rectangle'
				}
			};

			const result = ComponentShape.safeParse(componentWithBgShapeBackground);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.appearance.background).toEqual({
					enabled: true,
					color: '#00ff00',
					target: 'element',
					radius: 5
				});
			}
		});

		test('should reject component with invalid background color', () => {
			const componentWithInvalidBackground = {
				id: 'shape-5',
				type: 'SHAPE',
				timeline: validTimeline,
				appearance: {
					...validAppearance,
					color: '#000000',
					background: 'invalid-color'
				},
				shape: {
					type: 'rectangle'
				}
			};

			const result = ComponentShape.safeParse(componentWithInvalidBackground);
			expect(result.success).toBe(false);
		});

		test('should validate the original failing component', () => {
			// This is the exact component that was failing validation
			const originalFailingComponent = {
				id: '32df244a-2359-4591-a091-5d4216344b28',
				name: 'rectangle',
				timeline: { startAt: 0, endAt: 10 },
				visible: true,
				order: 1,
				type: 'SHAPE',
				appearance: {
					x: 100,
					y: 100,
					width: 300,
					height: 300,
					opacity: 1,
					rotation: 0,
					scaleX: 1,
					scaleY: 1,
					color: '#000000'
				},
				shape: { type: 'rectangle' },
				animations: { enabled: true, list: [] },
				effects: { enabled: true, map: {} }
			};

			const result = ComponentShape.safeParse(originalFailingComponent);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.appearance.background).toBeUndefined();
				expect(result.data.type).toBe('SHAPE');
				expect(result.data.shape.type).toBe('rectangle');
			}
		});

		test('should validate component with RGBA background color', () => {
			// Test component with RGBA background color in BgShape format
			const componentWithRGBABackground = {
				id: '4e3c904e-3ec8-405d-95b0-61b4c174e376',
				name: 'Rectangle',
				type: 'SHAPE',
				timeline: { startAt: 0, endAt: 24.567 },
				animations: { enabled: true, list: [] },
				effects: { enabled: true, map: {} },
				visible: true,
				order: 1,
				checksum: 'bf8d549c-5b1b-4e58-b9e9-3b16ecd164e6',
				shape: { type: 'rectangle' },
				appearance: {
					x: -481,
					y: 280.88888888888886,
					width: 860,
					height: 320,
					opacity: 1,
					rotation: 73,
					scaleX: 1,
					scaleY: 1,
					background: {
						enabled: true,
						color: 'rgba(235,36,122,1)',
						target: 'wrapper',
						radius: 0
					},
					verticalAlign: 'center',
					horizontalAlign: 'center',
					backgroundAlwaysVisible: false
				}
			};

			const result = ComponentShape.safeParse(componentWithRGBABackground);
			expect(result.success).toBe(true);

			if (result.success) {
				expect(result.data.appearance.background).toEqual({
					enabled: true,
					color: 'rgba(235,36,122,1)',
					target: 'wrapper',
					radius: 0
				});
				expect(result.data.type).toBe('SHAPE');
				expect(result.data.shape.type).toBe('rectangle');
			}
		});
	});
});
