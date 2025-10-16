import type { AnimationPreset, AnimationSequenceItem, SetupStep, TweenVars } from '../..';
export declare class AnimationPresetFactory {
    static create(id: string): PresetComposer;
    static from(preset: AnimationPreset): PresetComposer;
}
declare class PresetComposer {
    private _id;
    private _data;
    private _setup;
    private _timeline;
    private _description?;
    constructor(id: string);
    withData(data: Record<string, any>): PresetComposer;
    withSetup(setup: SetupStep[]): PresetComposer;
    withTimeline(timeline: AnimationSequenceItem[]): PresetComposer;
    withDescription(description: string): PresetComposer;
    resetTimeline(): PresetComposer;
    timeline(): TimelineComposer;
    build(): AnimationPreset;
}
declare class TimelineComposer {
    private _presetComposer;
    private _timeline;
    constructor(presetComposer: PresetComposer, existingTimeline?: any[]);
    target(targetQuery: string): TargetComposer;
    get timeline(): any[];
    updateTimeline(): PresetComposer;
    build(): AnimationPreset;
}
declare class TargetComposer {
    private _timelineComposer;
    private _timelineIndex;
    private _timeline;
    constructor(timelineComposer: TimelineComposer, timelineIndex: number);
    to(vars: TweenVars, position?: string | number): TargetComposer;
    from(vars: TweenVars, position?: string | number): TargetComposer;
    fromTo(vars: TweenVars, position?: string | number): TargetComposer;
    set(vars: TweenVars, position?: string | number): TargetComposer;
    position(pos: string | number): TargetComposer;
    timeline(): TimelineComposer;
    build(): AnimationPreset;
}
export {};
