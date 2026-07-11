import type { Subtitle } from '../schemas/scene/subtitles.js';
export type TranscriptWordInput = {
    text?: string;
    word?: string;
    start?: number;
    end?: number;
    start_at?: number;
    end_at?: number;
};
export type TranscriptSegmentInput = {
    id?: string;
    text?: string;
    start?: number;
    end?: number;
    start_at?: number;
    end_at?: number;
    words?: TranscriptWordInput[];
};
export type TranscriptInput = TranscriptSegmentInput[] | {
    language?: string;
    language_code?: string;
    subtitles?: TranscriptSegmentInput[];
    segments?: TranscriptSegmentInput[];
    words?: TranscriptWordInput[];
};
export type TranscriptTextFormat = 'srt' | 'vtt' | 'auto';
export declare function normalizeTranscript(input: TranscriptInput): Subtitle[];
export declare function inferTranscriptDuration(subtitles: Subtitle[]): number;
export declare function parseSubtitleText(input: string, format?: TranscriptTextFormat): TranscriptInput;
