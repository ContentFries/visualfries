/**
 * Safe Hook Runner
 *
 * Utility for safely executing hooks with error boundaries.
 * Prevents one failing hook from crashing the entire component lifecycle.
 */
import type { EventManager } from '../managers/EventManager.js';
export interface HookError {
    hookName: string;
    hookType: string;
    error: Error;
    componentId: string;
    timestamp: number;
}
export interface SafeHookRunnerOptions {
    /**
     * Whether to continue executing remaining hooks after one fails
     * @default true
     */
    continueOnError?: boolean;
    /**
     * Whether to log errors to console
     * @default true
     */
    logErrors?: boolean;
    /**
     * Event manager to emit error events
     */
    eventManager?: EventManager;
}
/**
 * Safely execute a single hook handler with error boundary
 */
export declare function safeExecuteHook<T>(hookName: string, hookType: string, componentId: string, handler: () => Promise<T> | T, options?: SafeHookRunnerOptions): Promise<{
    success: boolean;
    result?: T;
    error?: HookError;
}>;
/**
 * Execute multiple hooks in sequence with error boundaries
 */
export declare function safeExecuteHooks(hooks: Array<{
    name: string;
    handler: () => Promise<void> | void;
}>, hookType: string, componentId: string, options?: SafeHookRunnerOptions): Promise<{
    allSucceeded: boolean;
    errors: HookError[];
}>;
/**
 * Create a wrapped version of a hook handler that catches errors
 */
export declare function createSafeHandler<T extends (...args: any[]) => Promise<any> | any>(hookName: string, hookType: string, componentId: string, handler: T, options?: SafeHookRunnerOptions): T;
