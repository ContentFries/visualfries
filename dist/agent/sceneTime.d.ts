import type { Scene } from '../schemas/scene/index.js';
export type SceneTimeSettings = Pick<Scene['settings'], 'fps' | 'duration' | 'startAt' | 'endAt' | 'trimZones'>;
export type SceneTimeMedia = {
    type: 'VIDEO' | 'GIF';
    sourceStartAt: number;
    timelineStartAt: number;
    timelineEndAt: number;
};
/** The scene time while the scene tree is built: the stored time is still 0. */
export declare const sceneTimeAtBuild: (settings: SceneTimeSettings) => number;
/**
 * The scene time after the page seeks to a time: SeekCommand keeps it inside the scene,
 * TimelineManager.seek inside the play range and out of the disabled zones.
 */
export declare const sceneTimeAfterSeek: (settings: SceneTimeSettings, requestedTime: number) => number;
/**
 * The frame the renderer asks a media component for at a scene time, or null when the
 * component is not on screen then (ComponentContext.isActive and currentComponentTime, and
 * the rounding of DeterministicMediaFrameHook).
 */
export declare const mediaFrameIndexAtSceneTime: (media: SceneTimeMedia, sceneTime: number, settings: SceneTimeSettings) => number | null;
/**
 * The scene times the page shows on a frame outside the window `fromFrame..toFrame`: where it
 * builds the scene tree, where its first seek to 0 lands, where the seeks in `seekTimes` land
 * (frames to explain) and where a seek to a window frame lands when the play range or a
 * disabled zone moves it. Destroying the scene asks for no frame.
 */
export declare const sceneTimesOutsideWindow: (input: {
    settings: SceneTimeSettings;
    fromFrame: number;
    toFrame: number;
    seekTimes?: number[];
}) => number[];
