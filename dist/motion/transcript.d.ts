export type MotionWord = {
    /** Stable id: index in the transcript, e.g. "w812". */
    id: string;
    index: number;
    /** Display text with punctuation stripped from the edges. */
    text: string;
    /** Text exactly as transcribed. */
    raw: string;
    /** Program seconds. */
    start: number;
    end: number;
};
export declare function displayText(raw: string): string;
export declare function normalizeToken(raw: string): string;
/** Accepts Soniox-style `{ words: [{ text, startMs, endMs }] }` or `[{ text|word, start, end }]` in seconds. */
export declare function parseTranscriptWords(input: unknown): MotionWord[];
export type PhraseMatch = {
    words: MotionWord[];
    start: number;
    end: number;
};
/** All occurrences of `phrase` whose first word starts within [from, to] (program seconds). */
export declare function findPhrase(words: MotionWord[], phrase: string, from?: number, to?: number): PhraseMatch[];
export declare function describeWords(words: MotionWord[], around: number, span?: number): string;
export type PhraseSuggestion = PhraseMatch & {
    text: string;
    similarity: number;
};
/** Closest spoken phrases to `phrase` (same length ±1 word) for "did you mean" hints. */
export declare function suggestPhrases(words: MotionWord[], phrase: string, from?: number, to?: number, limit?: number): PhraseSuggestion[];
