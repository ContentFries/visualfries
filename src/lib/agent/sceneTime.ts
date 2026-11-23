import type { Scene } from '../schemas/scene/index.js';
import { frameIndexAtTime } from '../utils/frameTime.js';
import { isTimeWithinTimeline } from '../utils/timelineWindow.js';
import { mergeOverlappingRanges, type TimeRange } from './renderRanges.js';

// The scene times the render page really shows, computed the way the runtime computes them.
// Each function names the runtime code it mirrors; tests/agent/sceneTime.test.ts holds them
// against that code.

export type SceneTimeSettings = Pick<
	Scene['settings'],
	'fps' | 'duration' | 'startAt' | 'endAt' | 'trimZones'
>;

export type SceneTimeMedia = {
	type: 'VIDEO' | 'GIF';
	sourceStartAt: number;
	timelineStartAt: number;
	timelineEndAt: number;
};

// StateManager.startTime and endTime.
const playRange = (settings: SceneTimeSettings): TimeRange => ({
	start: settings.startAt || 0,
	end: Math.min(settings.endAt || settings.duration, settings.duration)
});

// StateManager.disabledTimeZones.
const disabledTimeZones = (settings: SceneTimeSettings): TimeRange[] => {
	const zones: TimeRange[] = [];
	if (settings.startAt && settings.startAt > 0) zones.push({ start: 0, end: settings.startAt });
	for (const zone of settings.trimZones ?? []) {
		if (zone.end < settings.duration) zones.push({ start: zone.start, end: zone.end });
	}
	if (settings.endAt && settings.endAt < settings.duration) {
		zones.push({ start: settings.endAt, end: settings.duration });
	}
	return mergeOverlappingRanges(zones);
};

// StateManager.currentTime: the stored time, kept inside the play range and put on its frame.
// The frame of an in-point that is not on a frame boundary lies before the in-point.
const shownSceneTime = (settings: SceneTimeSettings, storedTime: number): number => {
	const { start, end } = playRange(settings);
	const clamped = Math.max(start, Math.min(storedTime, end));
	return Math.min(frameIndexAtTime(clamped, settings.fps) / settings.fps, end);
};

/** The scene time while the scene tree is built: the stored time is still 0. */
export const sceneTimeAtBuild = (settings: SceneTimeSettings): number =>
	shownSceneTime(settings, 0);

/**
 * The scene time after the page seeks to a time: SeekCommand keeps it inside the scene,
 * TimelineManager.seek inside the play range and out of the disabled zones.
 */
export const sceneTimeAfterSeek = (settings: SceneTimeSettings, requestedTime: number): number => {
	const { start, end } = playRange(settings);
	const inScene = Math.max(0, Math.min(requestedTime, settings.duration));
	let time = Math.max(start, Math.min(inScene, end));
	const zones = disabledTimeZones(settings);
	const zone = zones.find((candidate) => time > candidate.start && time < candidate.end);
	if (zone) time = time - zone.start < zone.end - time ? zone.start : zone.end;
	return shownSceneTime(settings, time);
};

// TimeManager.transformTime without skipDurationCheck.
const frameTimeInScene = (settings: SceneTimeSettings, time: number): number =>
	Math.min(
		frameIndexAtTime(Math.min(time, settings.duration), settings.fps) / settings.fps,
		settings.duration
	);

/**
 * The frame the renderer asks a media component for at a scene time, or null when the
 * component is not on screen then (ComponentContext.isActive and currentComponentTime, and
 * the rounding of DeterministicMediaFrameHook).
 */
export const mediaFrameIndexAtSceneTime = (
	media: SceneTimeMedia,
	sceneTime: number,
	settings: SceneTimeSettings
): number | null => {
	if (!isTimeWithinTimeline(sceneTime, media.timelineStartAt, media.timelineEndAt)) return null;
	const sourceStartAt =
		media.type === 'VIDEO' ? frameIndexAtTime(media.sourceStartAt, settings.fps) / settings.fps : 0;
	const componentTime =
		sourceStartAt + sceneTime - frameTimeInScene(settings, media.timelineStartAt);
	return Math.max(0, Math.round(componentTime * settings.fps));
};

/**
 * The scene times the page shows, split by what it does there. `rendered`: where a seek to one
 * of `renderTimes` lands; the page draws an output frame there. `other`: where the page only
 * looks: it builds the scene tree, seeks to 0 first, and seeks to each of `seekTimes` (frames
 * to explain). Destroying the scene asks for no frame.
 */
export const shownSceneTimes = (input: {
	settings: SceneTimeSettings;
	renderTimes: number[];
	seekTimes?: number[];
}): { rendered: number[]; other: number[] } => {
	const { settings } = input;
	const rendered = new Set(input.renderTimes.map((time) => sceneTimeAfterSeek(settings, time)));
	const other = new Set([sceneTimeAtBuild(settings)]);
	for (const time of [0, ...(input.seekTimes ?? [])]) other.add(sceneTimeAfterSeek(settings, time));
	return { rendered: [...rendered], other: [...other].filter((time) => !rendered.has(time)) };
};
