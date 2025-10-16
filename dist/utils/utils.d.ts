import type { Appearance, SceneLayer, SubtitleCollection } from '..';
import * as PIXI from 'pixi.js-legacy';
export declare function changeIdDeep<T>(obj: T): T;
export declare const buildCharactersListFromComponentsAndSubtitles: (layers: SceneLayer[], subtitles: Record<string, SubtitleCollection>) => string[];
export declare const setPlacementAndOpacity: (obj: PIXI.Sprite | PIXI.Graphics, c: Appearance) => void;
