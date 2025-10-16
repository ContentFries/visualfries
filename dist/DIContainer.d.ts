import { type AwilixContainer } from 'awilix/browser';
import type { Scene as SceneData } from './';
export declare const registerNewContainer: (data: SceneData, instances: [string, unknown][]) => AwilixContainer;
export declare const removeContainer: (sceneId: string) => void;
