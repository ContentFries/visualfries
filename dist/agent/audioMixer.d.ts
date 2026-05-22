export type AudioMixRange = {
    start: number;
    end: number;
};
export type AudioSourcePlan = {
    id: string;
    kind: 'component' | 'track' | 'scene';
    url: string;
    startInChunkSec: number;
    durationSec: number;
    sourceOffsetSec: number;
    volume: number;
};
export type BuildLocalMixedAudioResult = {
    audioPath: string | null;
    selectedSources: number;
    skippedSources: number;
    plannedSources: AudioSourcePlan[];
};
export declare function resolveAudioMixRanges(sceneInput: unknown, chunkStartSec: number, chunkEndSec: number): AudioMixRange[];
export declare function collectAudioSourcesForRanges(sceneInput: unknown, ranges: AudioMixRange[]): AudioSourcePlan[];
export declare function sourceHasAudio(url: string): Promise<boolean>;
export declare function createPrepareSourceAudioArgs(source: AudioSourcePlan, outputPath: string): string[];
export declare function createMixAudioArgs(inputs: Array<{
    plan: AudioSourcePlan;
    path: string;
}>, outputPath: string, chunkDurationSec: number): string[];
export declare function buildLocalMixedAudioTrack(input: {
    scene: unknown;
    ranges: AudioMixRange[];
    workDir: string;
    renderId?: string;
    debug?: boolean;
}): Promise<BuildLocalMixedAudioResult>;
