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
 * The scene times the page shows, split by what it does there. `rendered`: where a seek to one
 * of `renderTimes` lands; the page draws an output frame there. `other`: where the page only
 * looks: it builds the scene tree, seeks to 0 first, and seeks to each of `seekTimes` (frames
 * to explain). Destroying the scene asks for no frame.
 */
export declare const shownSceneTimes: (input: {
    settings: SceneTimeSettings;
    renderTimes: number[];
    seekTimes?: number[];
}) => {
    rendered: number[];
    other: number[];
};
