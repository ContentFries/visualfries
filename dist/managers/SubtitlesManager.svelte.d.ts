import { EventManager } from './EventManager.js';
import type { SubtitleCollection, Subtitle, Scene, SceneSubtitlesSettings } from '..';
import type { TimeManager } from './TimeManager.svelte.js';
export declare class SubtitlesManager {
    private builder;
    private assetId;
    private language;
    constructor(cradle: {
        timeManager: TimeManager;
        eventManager: EventManager;
        sceneData: Scene;
        subtitles: Record<string, Subtitle[]> | Record<string, SubtitleCollection>;
    });
    get data(): Record<string, Record<string, ({
        id: string;
        start_at: number;
        end_at: number;
        text: string;
        words?: [string, number, number, ...({
            [x: string]: any;
            s?: number | undefined;
            si?: number | undefined;
            c?: string | {
                type: "linear" | "radial";
                colors: string[];
                stops?: number[] | undefined;
                angle?: number | undefined;
                position?: string | undefined;
                shape?: "ellipse" | "circle" | undefined;
            } | undefined;
            e?: string | undefined;
            w?: string | undefined;
            f?: string | undefined;
        } | null | undefined)[]][] | undefined;
        enlarge?: number | undefined;
        visible?: boolean | undefined;
        emoji?: string | undefined;
        color?: string | {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        } | undefined;
        background?: string | {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        } | undefined;
    } | {
        id: string;
        start_at: number;
        end_at: number;
        text: string;
        words?: {
            id: string;
            start_at: number;
            end_at: number;
            text: string;
            position?: number | undefined;
        }[] | undefined;
        enlarge?: number | undefined;
        visible?: boolean | undefined;
        emoji?: string | undefined;
        color?: string | undefined;
        background?: string | undefined;
    })[]>>;
    get settings(): {
        punctuation: boolean;
        mergeGap?: number | undefined;
        data?: Record<string, Record<string, ({
            id: string;
            start_at: number;
            end_at: number;
            text: string;
            words?: [string, number, number, ...({
                [x: string]: any;
                s?: number | undefined;
                si?: number | undefined;
                c?: string | {
                    type: "linear" | "radial";
                    colors: string[];
                    stops?: number[] | undefined;
                    angle?: number | undefined;
                    position?: string | undefined;
                    shape?: "ellipse" | "circle" | undefined;
                } | undefined;
                e?: string | undefined;
                w?: string | undefined;
                f?: string | undefined;
            } | null | undefined)[]][] | undefined;
            enlarge?: number | undefined;
            visible?: boolean | undefined;
            emoji?: string | undefined;
            color?: string | {
                type: "linear" | "radial";
                colors: string[];
                stops?: number[] | undefined;
                angle?: number | undefined;
                position?: string | undefined;
                shape?: "ellipse" | "circle" | undefined;
            } | undefined;
            background?: string | {
                type: "linear" | "radial";
                colors: string[];
                stops?: number[] | undefined;
                angle?: number | undefined;
                position?: string | undefined;
                shape?: "ellipse" | "circle" | undefined;
            } | undefined;
        } | {
            id: string;
            start_at: number;
            end_at: number;
            text: string;
            words?: {
                id: string;
                start_at: number;
                end_at: number;
                text: string;
                position?: number | undefined;
            }[] | undefined;
            enlarge?: number | undefined;
            visible?: boolean | undefined;
            emoji?: string | undefined;
            color?: string | undefined;
            background?: string | undefined;
        })[]>> | undefined;
    };
    setAssetId(assetId: string): string;
    setLanguage(language: string): string;
    getAssetSubtitlesForSceneData(assetId: string): Array<{
        language_code: string;
        subtitles: Subtitle[];
    }>;
    getAssetSubtitles(assetId: string): Record<string, ({
        id: string;
        start_at: number;
        end_at: number;
        text: string;
        words?: [string, number, number, ...({
            [x: string]: any;
            s?: number | undefined;
            si?: number | undefined;
            c?: string | {
                type: "linear" | "radial";
                colors: string[];
                stops?: number[] | undefined;
                angle?: number | undefined;
                position?: string | undefined;
                shape?: "ellipse" | "circle" | undefined;
            } | undefined;
            e?: string | undefined;
            w?: string | undefined;
            f?: string | undefined;
        } | null | undefined)[]][] | undefined;
        enlarge?: number | undefined;
        visible?: boolean | undefined;
        emoji?: string | undefined;
        color?: string | {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        } | undefined;
        background?: string | {
            type: "linear" | "radial";
            colors: string[];
            stops?: number[] | undefined;
            angle?: number | undefined;
            position?: string | undefined;
            shape?: "ellipse" | "circle" | undefined;
        } | undefined;
    } | {
        id: string;
        start_at: number;
        end_at: number;
        text: string;
        words?: {
            id: string;
            start_at: number;
            end_at: number;
            text: string;
            position?: number | undefined;
        }[] | undefined;
        enlarge?: number | undefined;
        visible?: boolean | undefined;
        emoji?: string | undefined;
        color?: string | undefined;
        background?: string | undefined;
    })[]>;
    setAssetSubtitles(assetId: string, subtitles: Subtitle[]): void;
    replaceCollection(assetId: string, newCollection: SubtitleCollection, language?: string): void;
    updateSubtitleText(subtitleId: string, newText: string): void;
    updateSubtitleProps(subtitleId: string, props: Partial<Subtitle>): void;
    splitSubtitle(subtitleId: string, splitAt: number): void;
    mergeSubtitles(sourceSubtitleId: string, mergeTo: 'start' | 'end'): void;
    getSubtitle(timeOrId: string | number): Subtitle | undefined;
    setTimesForSubtitleInAssetAndLanguage(assetId: string, language: string, subtitleId: string, start?: number, end?: number): void;
    setStart(subtitleId: string, start: number): void;
    setEnd(subtitleId: string, end: number): void;
    addNewSubtitleAfter(subtitleId: string, newText: string): void;
    splitByChars(maxChars: number): void;
    getText(): string | undefined;
    updateSettings(newSettings: Partial<SceneSubtitlesSettings>): void;
    findTextChunkTiming(searchText: string, options?: {
        caseSensitive?: boolean;
    }): Array<{
        startTime: number;
        endTime: number;
        startSubtitleId: string;
        endSubtitleId: string;
        matchedText: string;
    }>;
    destroy(): void;
}
