import type { AnimationEngineAdaptor, EngineTarget, EngineStaggerOptions } from './AnimationEngineAdaptor.ts';
import type { AnimationContext } from '../AnimationContext.ts';
type GsapEngineTimeline = gsap.core.Timeline;
export declare class GsapEngineAdaptor implements AnimationEngineAdaptor {
    createTimeline(options?: gsap.TimelineVars): GsapEngineTimeline;
    addTween(timeline: GsapEngineTimeline, targets: EngineTarget | EngineTarget[], method: 'to' | 'from' | 'fromTo' | 'set', vars: gsap.TweenVars, // GSAP's TweenVars is very flexible
    position?: string | number): number;
    resolveStagger(staggerDefinition: Record<string, any> | number, context: AnimationContext, _tweenDuration?: number): EngineStaggerOptions;
    play(timeline: GsapEngineTimeline, position?: string | number): void;
    pause(timeline: GsapEngineTimeline): void;
    resume(timeline: GsapEngineTimeline, position?: string | number): void;
    seek(timeline: GsapEngineTimeline, position: string | number, suppressEvents?: boolean): void;
    totalDuration(timeline: GsapEngineTimeline): number;
    kill(timeline: GsapEngineTimeline): void;
    addPause(timeline: GsapEngineTimeline, duration: number, position?: string | number): void;
    addLabel(timeline: GsapEngineTimeline, label: string, position?: string | number): void;
    addCallback(timeline: GsapEngineTimeline, callback: () => void, position?: string | number): void;
    onComplete(timeline: GsapEngineTimeline, callback: () => void): void;
    repositionLabel(timeline: GsapEngineTimeline, labelName: string, newPosition: string | number): void;
}
export {};
