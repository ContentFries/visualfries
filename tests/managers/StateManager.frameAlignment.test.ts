import { describe, expect, it } from 'vitest';

import { ComponentContext } from '$lib/components/ComponentContext.svelte.ts';
import { StateManager } from '$lib/managers/StateManager.svelte.ts';
import { TimeManager } from '$lib/managers/TimeManager.svelte.ts';

const createStateManager = () =>
	new StateManager({
		sceneData: {
			id: 'scene-frame-alignment',
			settings: {
				fps: 30,
				duration: 1000,
				width: 1920,
				height: 1080,
				backgroundColor: '#000000'
			},
			layers: [],
			assets: [],
			transitions: [],
			audioTracks: []
		} as any,
		environment: 'server',
		scale: 1,
		eventManager: { emit: () => {} } as any,
		loop: false,
		timeManager: new TimeManager(),
		layersManager: { getData: () => [] } as any
	});

const createVideoContext = (
	stateManager: StateManager,
	id: string,
	startAt: number,
	endAt: number
) => {
	const context = new ComponentContext({
		stateManager,
		eventManager: { emit: () => {} } as any
	});

	context.setComponentProps({
		id,
		type: 'VIDEO',
		duration: endAt - startAt,
		timeline: { startAt, endAt },
		getData: () =>
			({
				id,
				type: 'VIDEO',
				timeline: { startAt, endAt },
				source: { url: 'https://example.com/video.mp4', startAt: 0 },
				appearance: { x: 0, y: 0, width: 1920, height: 1080 },
				animations: {},
				effects: {},
				visible: true,
				order: 0
			}) as any
	} as any);

	return context;
};

describe('StateManager frame alignment', () => {
	it('snaps raw times to the nearest frame boundary consistently for currentTime and currentFrame', () => {
		const stateManager = createStateManager();

		// With 'nearest' (round) quantization at 30fps:
		// 650.01*30=19500.3 → round=19500, frame%30=0, time=650+0/30
		// 650.04*30=19501.2 → round=19501, frame%30=1, time=650+1/30
		// 650.07*30=19502.1 → round=19502, frame%30=2, time=650+2/30
		// 650.1*30=19503.0  → round=19503, frame%30=3, time=650+3/30
		const cases = [
			{ rawTime: 650.01, expectedFrameInSecond: 0, expectedTime: 650 + 0 / 30 },
			{ rawTime: 650.04, expectedFrameInSecond: 1, expectedTime: 650 + 1 / 30 },
			{ rawTime: 650.07, expectedFrameInSecond: 2, expectedTime: 650 + 2 / 30 },
			{ rawTime: 650.1, expectedFrameInSecond: 3, expectedTime: 650 + 3 / 30 }
		];

		for (const { rawTime, expectedFrameInSecond, expectedTime } of cases) {
			stateManager.setCurrentTime(rawTime);
			expect(stateManager.currentFrame % stateManager.data.settings.fps).toBe(expectedFrameInSecond);
			expect(stateManager.currentTime).toBeCloseTo(expectedTime, 10);
			expect(stateManager.currentTime).toBeCloseTo(
				stateManager.currentFrame / stateManager.data.settings.fps,
				10
			);
		}
	});

	it('exposes frame-aligned public values even when the internal raw time sits between frame boundaries', () => {
		const stateManager = createStateManager();
		(stateManager as any).currentTimeRune = 650.07;

		// 650.07*30=19502.1, round=19502, frame%30=2, time=650+2/30≈650.0667
		expect(stateManager.currentFrame % stateManager.data.settings.fps).toBe(2);
		expect(stateManager.currentTime).toBeCloseTo(650 + 2 / 30, 10);
		expect(stateManager.currentTime).not.toBe(650.1);
	});

	it('only reports frame-3 at the exact frame-3 boundary, not before', () => {
		const stateManager = createStateManager();

		// 650.07 rounds to frame 19502 (frame-in-second=2)
		stateManager.setCurrentTime(650.07);
		expect(stateManager.currentFrame % stateManager.data.settings.fps).toBe(2);
		expect(stateManager.currentTime).toBeCloseTo(650 + 2 / 30, 10);

		// 650.1 rounds to frame 19503 (frame-in-second=3)
		stateManager.setCurrentTime(650.1);
		expect(stateManager.currentFrame % stateManager.data.settings.fps).toBe(3);
		expect(stateManager.currentTime).toBeCloseTo(650.1, 10);
	});

	it('hands off adjacent components exactly on the frame boundary with no early activation', () => {
		const stateManager = createStateManager();
		const outgoing = createVideoContext(stateManager, 'outgoing', 0, 650.1);
		const incoming = createVideoContext(stateManager, 'incoming', 650.1, 700);

		// 650.07 rounds to frame 19502, time≈650.0667 — before the 650.1 boundary
		stateManager.setCurrentTime(650.07);
		expect(outgoing.isActive).toBe(true);
		expect(incoming.isActive).toBe(false);

		// 650.1 rounds to frame 19503, time=650.1 — exactly at the boundary
		stateManager.setCurrentTime(650.1);
		expect(outgoing.isActive).toBe(false);
		expect(incoming.isActive).toBe(true);
	});
});
