import { describe, expect, it, vi } from 'vitest';

import {
	mediaFrameIndexAtSceneTime,
	sceneTimeAfterSeek,
	sceneTimeAtBuild,
	sceneTimesOutsideWindow,
	type SceneTimeMedia,
	type SceneTimeSettings
} from '$lib/agent/sceneTime.ts';
import { SeekCommand } from '$lib/commands/SeekCommand.ts';
import { ComponentContext } from '$lib/components/ComponentContext.svelte.ts';
import { StateManager } from '$lib/managers/StateManager.svelte.ts';
import { TimeManager } from '$lib/managers/TimeManager.svelte.ts';
import { TimelineManager } from '$lib/managers/TimelineManager.svelte.ts';

// The local renderer prepares media frames for the scene times the page shows. These tests
// hold its arithmetic against the runtime itself: the real state, timeline and seek command.

const settingsOf = (overrides: Partial<SceneTimeSettings> = {}): SceneTimeSettings => ({
	fps: 30,
	duration: 100,
	...overrides
});

const createRuntime = (settings: SceneTimeSettings) => {
	const eventManager = { emit: () => {}, on: () => {} } as any;
	const stateManager = new StateManager({
		sceneData: {
			id: 'scene-time',
			settings: { width: 64, height: 48, backgroundColor: '#000000', ...settings },
			layers: [],
			assets: [],
			transitions: [],
			audioTracks: []
		} as any,
		environment: 'server',
		scale: 1,
		eventManager,
		loop: false,
		timeManager: new TimeManager(),
		layersManager: { getData: () => [] } as any
	});
	const timelineManager = new TimelineManager({ stateManager, eventManager, loop: false });
	const seekCommand = new SeekCommand({
		timelineManager,
		stateManager,
		renderManager: { render: vi.fn(async () => undefined) } as any,
		componentsManager: { getAll: () => [] } as any,
		deterministicMediaManager: { isEnabled: () => false, config: {} } as any
	});
	return { stateManager, seek: (time: number) => seekCommand.execute({ time }) };
};

const createMediaContext = (stateManager: StateManager, media: SceneTimeMedia) => {
	const context = new ComponentContext({ stateManager, eventManager: { emit: () => {} } as any });
	const timeline = { startAt: media.timelineStartAt, endAt: media.timelineEndAt };
	context.setComponentProps({
		id: 'media',
		type: media.type,
		timeline,
		getData: () => ({
			id: 'media',
			type: media.type,
			timeline,
			source: { url: 'https://example.com/media', startAt: media.sourceStartAt }
		})
	} as any);
	return context;
};

const settingsCases: Array<[string, SceneTimeSettings]> = [
	['a plain scene', settingsOf()],
	['an in-point on a frame', settingsOf({ startAt: 20 })],
	['an in-point between two frames', settingsOf({ startAt: 20.015 })],
	['an out-point', settingsOf({ endAt: 60.02 })],
	['an in-point and an out-point', settingsOf({ startAt: 10.05, endAt: 90 })],
	['a trim zone', settingsOf({ trimZones: [{ start: 30, end: 40.01 }] })],
	[
		'a trim zone that touches the in-point',
		settingsOf({ startAt: 20, trimZones: [{ start: 20, end: 25 }] })
	],
	[
		'trim zones that overlap, and one that reaches the end',
		settingsOf({
			trimZones: [
				{ start: 30, end: 40 },
				{ start: 35, end: 50.5 },
				{ start: 90, end: 100 }
			]
		})
	],
	['24 frames a second', settingsOf({ fps: 24, startAt: 3.34 })]
];

const requestedTimes = [
	-1,
	0,
	0.0333,
	1 / 30,
	10,
	19.99,
	20,
	20.015,
	22.4,
	22.6,
	25,
	29.99,
	30,
	34.9,
	35.1,
	40,
	45.03,
	50.5,
	60.02,
	60.5,
	89.2,
	95,
	100,
	120
];

describe('scene times of the local renderer follow the runtime', () => {
	it.each(settingsCases)('where the scene tree is built, with %s', (_name, settings) => {
		const { stateManager } = createRuntime(settings);

		expect(sceneTimeAtBuild(settings)).toBe(stateManager.currentTime);
	});

	it.each(settingsCases)('after a seek, with %s', async (_name, settings) => {
		const { stateManager, seek } = createRuntime(settings);

		for (const time of requestedTimes) {
			await seek(time);
			expect(sceneTimeAfterSeek(settings, time), `seek to ${time}`).toBe(stateManager.currentTime);
		}
	});

	const mediaCases: SceneTimeMedia[] = [
		{ type: 'VIDEO', sourceStartAt: 0, timelineStartAt: 0, timelineEndAt: 20.015 },
		{ type: 'VIDEO', sourceStartAt: 1.51, timelineStartAt: 19.99, timelineEndAt: 45.03 },
		{ type: 'VIDEO', sourceStartAt: 4, timelineStartAt: 40.01, timelineEndAt: 100 },
		{ type: 'GIF', sourceStartAt: 2, timelineStartAt: 10.05, timelineEndAt: 60.02 },
		{ type: 'VIDEO', sourceStartAt: 0, timelineStartAt: 25, timelineEndAt: 25 }
	];

	it.each(settingsCases)(
		'for the frame a media component shows, with %s',
		async (_name, settings) => {
			const { stateManager, seek } = createRuntime(settings);
			const contexts = mediaCases.map((media) => createMediaContext(stateManager, media));
			const expectFramesToMatch = (label: string) => {
				mediaCases.forEach((media, index) => {
					const context = contexts[index];
					const asked = context.isActive
						? Math.max(0, Math.round(context.currentComponentTime * settings.fps))
						: null;
					expect(
						mediaFrameIndexAtSceneTime(media, stateManager.currentTime, settings),
						`${label}, media ${index}`
					).toBe(asked);
				});
			};

			expectFramesToMatch('build');
			for (const time of requestedTimes) {
				await seek(time);
				expectFramesToMatch(`seek to ${time}`);
			}
		}
	);
});

describe('scene times outside the frame window', () => {
	const chunk = { fromFrame: 1351, toFrame: 2676 };

	it('is the build time alone for a plain scene', () => {
		expect(sceneTimesOutsideWindow({ settings: settingsOf(), ...chunk })).toEqual([0]);
		// A window that holds frame 0 has no time outside.
		expect(sceneTimesOutsideWindow({ settings: settingsOf(), fromFrame: 0, toFrame: 30 })).toEqual(
			[]
		);
	});

	it('is the frame of the in-point, also when the in-point lies between two frames', () => {
		expect(sceneTimesOutsideWindow({ settings: settingsOf({ startAt: 20 }), ...chunk })).toEqual([
			20
		]);
		expect(
			sceneTimesOutsideWindow({ settings: settingsOf({ startAt: 20.015 }), ...chunk })
		).toEqual([20]);
	});

	it('holds the place the first seek lands when a trim zone moves it', () => {
		const settings = settingsOf({ startAt: 20, trimZones: [{ start: 20, end: 25 }] });

		// Built at the in-point (20); the seek to 0 lands inside the merged zone 0-25 and
		// leaves it at the nearer end.
		expect(sceneTimesOutsideWindow({ settings, ...chunk })).toEqual([20, 25]);
	});

	it('holds the frames to explain, but not those inside the window', () => {
		expect(
			sceneTimesOutsideWindow({ settings: settingsOf(), ...chunk, seekTimes: [97, 50, 97.01] })
		).toEqual([0, 97]);
	});

	it('holds the place a window frame is moved to by the play range', () => {
		// Frames 0-29 of a scene that starts at second 20 all show second 20.
		expect(
			sceneTimesOutsideWindow({ settings: settingsOf({ startAt: 20 }), fromFrame: 0, toFrame: 30 })
		).toEqual([20]);
		// Frames after the out-point all show the out-point.
		expect(
			sceneTimesOutsideWindow({
				settings: settingsOf({ endAt: 60 }),
				fromFrame: 2700,
				toFrame: 2730
			})
		).toEqual([0, 60]);
	});
});
