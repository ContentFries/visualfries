import type { HookType, IComponentContext, IComponentHook } from '../..';
import type { StateManager } from '../../managers/StateManager.svelte.ts';
import type { SubtitlesManager } from '../../managers/SubtitlesManager.svelte.ts';
import type { EventManager } from '../../managers/EventManager.ts';
export declare class SubtitlesHook implements IComponentHook {
    #private;
    types: HookType[];
    priority: number;
    private subtitlesManager;
    private state;
    constructor(cradle: {
        subtitlesManager: SubtitlesManager;
        stateManager: StateManager;
        eventManager: EventManager;
    });
    get activeSubtitle(): {
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
    } | undefined;
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
