import { type ComponentInput, type Scene, type SceneInput } from '../schemas/scene/index.js';
export type AgentTransitionStyle = 'dip-to-black' | 'flash' | 'swipe-left' | 'swipe-up' | 'focus-pull';
export type AgentTransitionCue = {
    id?: string;
    time: number;
    duration?: number;
    style?: AgentTransitionStyle;
    color?: string;
    layerOrder?: number;
    animated?: boolean;
};
export type AddAgentTransitionsInput = {
    scene: Scene | SceneInput;
    transitions: AgentTransitionCue[];
    layerId?: string;
    layerName?: string;
    layerOrder?: number;
};
export declare function createAgentTransitionComponent(cue: AgentTransitionCue, scene: Scene | SceneInput, index?: number): ComponentInput;
export declare function addAgentTransitions(input: AddAgentTransitionsInput): Scene;
