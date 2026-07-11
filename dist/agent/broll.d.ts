import { type ComponentInput, type Scene, type SceneAssetInput, type SceneInput } from '../schemas/scene/index.js';
export type AgentBrollCue = {
    id?: string;
    url: string;
    type?: 'VIDEO' | 'IMAGE' | 'GIF';
    motion?: 'none' | 'slow-zoom-in' | 'slow-zoom-out' | 'drift-up';
    start: number;
    end: number;
    assetId?: string;
    name?: string;
    order?: number;
    muted?: boolean;
    volume?: number;
    fade?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    sourceStart?: number;
    sourceEnd?: number;
    playbackRate?: number;
    loop?: boolean;
};
export type AddAgentBrollSequenceInput = {
    scene: Scene | SceneInput;
    cues: AgentBrollCue[];
    layerId?: string;
    layerName?: string;
    layerOrder?: number;
};
export declare function createAgentBrollComponent(cue: AgentBrollCue, scene: Scene | SceneInput, index?: number): {
    asset: SceneAssetInput;
    component: ComponentInput;
};
export declare function addAgentBrollSequence(input: AddAgentBrollSequenceInput): Scene;
