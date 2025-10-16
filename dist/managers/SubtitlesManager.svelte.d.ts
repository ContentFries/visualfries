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
        text: string;
        start_at: number;
        end_at: number;
        visible?: boolean | undefined;
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
        words?: [string, number, number, ...(import("zod").objectOutputType<{
            s: import("zod").ZodOptional<import("zod").ZodNumber>;
            si: import("zod").ZodOptional<import("zod").ZodNumber>;
            c: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodEffects<import("zod").ZodString, string, string>, import("zod").ZodObject<{
                type: import("zod").ZodEnum<["linear", "radial"]>;
                colors: import("zod").ZodArray<import("zod").ZodEffects<import("zod").ZodString, string, string>, "many">;
                stops: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodNumber, "many">>;
                angle: import("zod").ZodOptional<import("zod").ZodNumber>;
                position: import("zod").ZodOptional<import("zod").ZodString>;
                shape: import("zod").ZodOptional<import("zod").ZodEnum<["ellipse", "circle"]>>;
            }, "strip", import("zod").ZodTypeAny, {
                type: "linear" | "radial";
                colors: string[];
                stops?: number[] | undefined;
                angle?: number | undefined;
                position?: string | undefined;
                shape?: "ellipse" | "circle" | undefined;
            }, {
                type: "linear" | "radial";
                colors: string[];
                stops?: number[] | undefined;
                angle?: number | undefined;
                position?: string | undefined;
                shape?: "ellipse" | "circle" | undefined;
            }>]>>;
            e: import("zod").ZodOptional<import("zod").ZodString>;
            w: import("zod").ZodOptional<import("zod").ZodString>;
            f: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod").ZodAny, "strip"> | null | undefined)[]][] | undefined;
        emoji?: string | undefined;
        enlarge?: number | undefined;
    } | {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        visible?: boolean | undefined;
        color?: string | undefined;
        background?: string | undefined;
        words?: {
            id: string;
            text: string;
            start_at: number;
            end_at: number;
            position?: number | undefined;
        }[] | undefined;
        emoji?: string | undefined;
        enlarge?: number | undefined;
    })[]>>;
    get settings(): {
        punctuation: boolean;
        data?: Record<string, Record<string, ({
            id: string;
            text: string;
            start_at: number;
            end_at: number;
            visible?: boolean | undefined;
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
            words?: [string, number, number, ...(import("zod").objectOutputType<{
                s: import("zod").ZodOptional<import("zod").ZodNumber>;
                si: import("zod").ZodOptional<import("zod").ZodNumber>;
                c: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodEffects<import("zod").ZodString, string, string>, import("zod").ZodObject<{
                    type: import("zod").ZodEnum<["linear", "radial"]>;
                    colors: import("zod").ZodArray<import("zod").ZodEffects<import("zod").ZodString, string, string>, "many">;
                    stops: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodNumber, "many">>;
                    angle: import("zod").ZodOptional<import("zod").ZodNumber>;
                    position: import("zod").ZodOptional<import("zod").ZodString>;
                    shape: import("zod").ZodOptional<import("zod").ZodEnum<["ellipse", "circle"]>>;
                }, "strip", import("zod").ZodTypeAny, {
                    type: "linear" | "radial";
                    colors: string[];
                    stops?: number[] | undefined;
                    angle?: number | undefined;
                    position?: string | undefined;
                    shape?: "ellipse" | "circle" | undefined;
                }, {
                    type: "linear" | "radial";
                    colors: string[];
                    stops?: number[] | undefined;
                    angle?: number | undefined;
                    position?: string | undefined;
                    shape?: "ellipse" | "circle" | undefined;
                }>]>>;
                e: import("zod").ZodOptional<import("zod").ZodString>;
                w: import("zod").ZodOptional<import("zod").ZodString>;
                f: import("zod").ZodOptional<import("zod").ZodString>;
            }, import("zod").ZodAny, "strip"> | null | undefined)[]][] | undefined;
            emoji?: string | undefined;
            enlarge?: number | undefined;
        } | {
            id: string;
            text: string;
            start_at: number;
            end_at: number;
            visible?: boolean | undefined;
            color?: string | undefined;
            background?: string | undefined;
            words?: {
                id: string;
                text: string;
                start_at: number;
                end_at: number;
                position?: number | undefined;
            }[] | undefined;
            emoji?: string | undefined;
            enlarge?: number | undefined;
        })[]>> | undefined;
        mergeGap?: number | undefined;
    };
    setAssetId(assetId: string): string;
    setLanguage(language: string): string;
    getAssetSubtitlesForSceneData(assetId: string): Array<{
        language_code: string;
        subtitles: Subtitle[];
    }>;
    getAssetSubtitles(assetId: string): Record<string, ({
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        visible?: boolean | undefined;
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
        words?: [string, number, number, ...(import("zod").objectOutputType<{
            s: import("zod").ZodOptional<import("zod").ZodNumber>;
            si: import("zod").ZodOptional<import("zod").ZodNumber>;
            c: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodEffects<import("zod").ZodString, string, string>, import("zod").ZodObject<{
                type: import("zod").ZodEnum<["linear", "radial"]>;
                colors: import("zod").ZodArray<import("zod").ZodEffects<import("zod").ZodString, string, string>, "many">;
                stops: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodNumber, "many">>;
                angle: import("zod").ZodOptional<import("zod").ZodNumber>;
                position: import("zod").ZodOptional<import("zod").ZodString>;
                shape: import("zod").ZodOptional<import("zod").ZodEnum<["ellipse", "circle"]>>;
            }, "strip", import("zod").ZodTypeAny, {
                type: "linear" | "radial";
                colors: string[];
                stops?: number[] | undefined;
                angle?: number | undefined;
                position?: string | undefined;
                shape?: "ellipse" | "circle" | undefined;
            }, {
                type: "linear" | "radial";
                colors: string[];
                stops?: number[] | undefined;
                angle?: number | undefined;
                position?: string | undefined;
                shape?: "ellipse" | "circle" | undefined;
            }>]>>;
            e: import("zod").ZodOptional<import("zod").ZodString>;
            w: import("zod").ZodOptional<import("zod").ZodString>;
            f: import("zod").ZodOptional<import("zod").ZodString>;
        }, import("zod").ZodAny, "strip"> | null | undefined)[]][] | undefined;
        emoji?: string | undefined;
        enlarge?: number | undefined;
    } | {
        id: string;
        text: string;
        start_at: number;
        end_at: number;
        visible?: boolean | undefined;
        color?: string | undefined;
        background?: string | undefined;
        words?: {
            id: string;
            text: string;
            start_at: number;
            end_at: number;
            position?: number | undefined;
        }[] | undefined;
        emoji?: string | undefined;
        enlarge?: number | undefined;
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
