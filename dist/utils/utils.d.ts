import type { Appearance, SceneLayer } from '..';
import * as PIXI from 'pixi.js-legacy';
export declare function changeIdDeep<T>(obj: T): T;
export declare const buildCharactersListFromComponentsAndSubtitles: (layers: SceneLayer[], subtitlesCharactersList: string[]) => string[];
export declare const setPlacementAndOpacity: (obj: PIXI.Sprite | PIXI.Graphics, c: Appearance) => void;
