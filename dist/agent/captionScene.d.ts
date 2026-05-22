import { type Scene } from '../schemas/scene/index.js';
import { type TranscriptInput } from './transcripts.js';
export type CaptionScenePreset = 'reels-center' | 'reels-lower' | 'podcast-clean' | 'hidden-engine-center';
export type CaptionSceneInput = {
    id?: string;
    video: {
        url: string;
        assetId?: string;
        width?: number;
        height?: number;
        duration?: number;
        hasAudio?: boolean;
    };
    transcript: TranscriptInput;
    preset?: CaptionScenePreset;
    language?: string;
    width?: number;
    height?: number;
    fps?: number;
    duration?: number;
    backgroundColor?: string;
};
export declare function createCaptionScene(input: CaptionSceneInput): Scene;
