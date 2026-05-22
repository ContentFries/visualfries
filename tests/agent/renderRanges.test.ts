import { describe, expect, it } from 'vitest';
import { resolveEffectiveRenderRanges } from '$lib/agent';

const baseScene = {
	id: 'render-ranges-test',
	settings: {
		width: 1080,
		height: 1920,
		duration: 10,
		fps: 10,
		backgroundColor: '#000000'
	},
	assets: [],
	layers: []
};

describe('agent render range helpers', () => {
	it('keeps the original frame range when no trim zones exist', () => {
		expect(resolveEffectiveRenderRanges({ scene: baseScene, fromFrame: 0, toFrame: 20 })).toEqual({
			ranges: [{ fromFrame: 0, toFrame: 20, startSec: 0, endSec: 2 }],
			trimAppliedInRanges: false
		});
	});

	it('splits a contiguous frame range around trim zones', () => {
		const result = resolveEffectiveRenderRanges({
			scene: {
				...baseScene,
				settings: {
					...baseScene.settings,
					trimZones: [{ start: 0.5, end: 1 }]
				}
			},
			fromFrame: 0,
			toFrame: 20
		});

		expect(result).toEqual({
			ranges: [
				{ fromFrame: 0, toFrame: 5, startSec: 0, endSec: 0.5 },
				{ fromFrame: 10, toFrame: 20, startSec: 1, endSec: 2 }
			],
			trimAppliedInRanges: true
		});
	});

	it('ignores trim zones outside the requested boundary', () => {
		expect(
			resolveEffectiveRenderRanges({
				scene: {
					...baseScene,
					settings: {
						...baseScene.settings,
						trimZones: [{ start: 3, end: 4 }]
					}
				},
				fromFrame: 0,
				toFrame: 20
			})
		).toEqual({
			ranges: [{ fromFrame: 0, toFrame: 20, startSec: 0, endSec: 2 }],
			trimAppliedInRanges: false
		});
	});
});
