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
    } | undefined;
    handle(type: HookType, context: IComponentContext): Promise<void>;
}
