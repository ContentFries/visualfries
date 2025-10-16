import type { AnimationContext } from '../AnimationContext.js';
export type EngineTarget = any;
export type EngineTimeline = any;
export type EngineStaggerOptions = any;
export interface AnimationEngineAdaptor {
    /**
     * Creates a new timeline instance from the animation engine.
     * @param options - Engine-specific timeline options.
     * @returns An instance of the engine's timeline.
     */
    createTimeline(options?: Record<string, any>): EngineTimeline;
    /**
     * Adds a tween to the given timeline.
     * @param timeline - The engine timeline instance to add the tween to.
     * @param targets - The target(s) for the animation.
     * @param method - The animation method ('to', 'from', 'fromTo', 'set').
     * @param vars - An object containing properties to animate and animation parameters (duration, ease, etc.).
     *                 This should include resolved values (e.g., data references already looked up).
     *                 For 'fromTo', 'vars.from' will contain the from-properties.
     * @param position - The position in the timeline where the tween should be inserted (e.g., absolute time, label, relative offset).
     */
    addTween(timeline: EngineTimeline, targets: EngineTarget | EngineTarget[], method: 'to' | 'from' | 'fromTo' | 'set', vars: Record<string, any>, position?: string | number): number;
    /**
     * Resolves stagger options, especially 'fromData' type, into engine-specific stagger configuration.
     * @param staggerDefinition - The stagger object from the JSON preset.
     * @param context - The animation context, for accessing data like `wordTimestamps`.
     * @param tweenDuration - The duration of the individual tween that stagger is applied to (can be undefined).
     * @returns Engine-specific stagger options or a value that the engine understands for staggering.
     */
    resolveStagger(staggerDefinition: Record<string, any> | number, context: AnimationContext, tweenDuration?: number): EngineStaggerOptions;
    /**
     * Plays the given timeline.
     * @param timeline - The engine timeline instance to play.
     * @param position - (Optional) Time or label from which to start playing.
     */
    play(timeline: EngineTimeline, position?: string | number): void;
    /**
     * Pauses the given timeline.
     * @param timeline - The engine timeline instance to pause.
     */
    pause(timeline: EngineTimeline): void;
    /**
     * Resumes the given timeline.
     * @param timeline - The engine timeline instance to resume.
     * @param position - (Optional) Time or label from which to resume playing.
     */
    resume(timeline: EngineTimeline, position?: string | number): void;
    /**
     * Seeks to a specific time or label in the timeline.
     * @param timeline - The engine timeline instance.
     * @param position - Time (seconds) or label to seek to.
     * @param suppressEvents - (Optional) If true, suppress events during the seek (engine dependent).
     */
    seek(timeline: EngineTimeline, position: string | number, suppressEvents?: boolean): void;
    /**
     * Gets the total duration of a timeline.
     * @param timeline - The engine timeline instance.
     * @returns The duration in seconds.
     */
    totalDuration(timeline: EngineTimeline): number;
    /**
     * Kills/destroys the timeline and its animations, removing them from the engine.
     * @param timeline - The engine timeline instance to kill.
     */
    kill(timeline: EngineTimeline): void;
    /**
     * (Optional) Utility to convert a generic property value (which might be a data reference)
     * into its actual value. This might be handled by the AnimationBuilder before calling addTween,
     * or the adaptor can provide a utility if the engine has specific ways to handle dynamic values.
     * For now, let's assume AnimationBuilder resolves data references.
     */
    /**
     * (Optional) Helper to create a "pause" or empty tween in the timeline.
     * @param timeline The engine timeline to add the pause to.
     * @param duration The duration of the pause.
     * @param position The position in the timeline.
     */
    addPause(timeline: EngineTimeline, duration: number, position?: string | number): void;
    /**
     * (Optional) Adds a label to the timeline at the current end or a specific time.
     * @param timeline The engine timeline.
     * @param label The name of the label.
     * @param position The position for the label.
     */
    addLabel(timeline: EngineTimeline, label: string, position?: string | number): void;
    /**
     * (Optional) Adds a callback to the timeline.
     * @param timeline The engine timeline.
     * @param callback The function to call.
     * @param position The position for the callback.
     */
    addCallback(timeline: EngineTimeline, callback: () => void, position?: string | number): void;
    /**
     * (Optional) Adds a callback to the timeline.
     * @param timeline The engine timeline.
     * @param callback The function to call.
     */
    onComplete(timeline: EngineTimeline, callback: () => void): void;
    /**
     * Repositions a label by removing it and adding it again at a new position.
     * This should cause any animations positioned at that label to move to the new position.
     * @param timeline The engine timeline.
     * @param labelName The name of the label to reposition.
     * @param newPosition The new position for the label.
     */
    repositionLabel(timeline: EngineTimeline, labelName: string, newPosition: string | number): void;
}
