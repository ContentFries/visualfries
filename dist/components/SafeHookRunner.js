/**
 * Safe Hook Runner
 *
 * Utility for safely executing hooks with error boundaries.
 * Prevents one failing hook from crashing the entire component lifecycle.
 */
const defaultOptions = {
    continueOnError: true,
    logErrors: true
};
/**
 * Safely execute a single hook handler with error boundary
 */
export async function safeExecuteHook(hookName, hookType, componentId, handler, options = {}) {
    const opts = { ...defaultOptions, ...options };
    try {
        const result = await handler();
        return { success: true, result };
    }
    catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const hookError = {
            hookName,
            hookType,
            error,
            componentId,
            timestamp: Date.now()
        };
        if (opts.logErrors) {
            console.warn(`[SafeHookRunner] Hook "${hookName}" failed during "${hookType}" for component "${componentId}":`, error.message);
        }
        if (opts.eventManager) {
            opts.eventManager.emit('hookerror', hookError);
        }
        return { success: false, error: hookError };
    }
}
/**
 * Execute multiple hooks in sequence with error boundaries
 */
export async function safeExecuteHooks(hooks, hookType, componentId, options = {}) {
    const opts = { ...defaultOptions, ...options };
    const errors = [];
    for (const hook of hooks) {
        const result = await safeExecuteHook(hook.name, hookType, componentId, hook.handler, options);
        if (!result.success && result.error) {
            errors.push(result.error);
            if (!opts.continueOnError) {
                break;
            }
        }
    }
    return {
        allSucceeded: errors.length === 0,
        errors
    };
}
/**
 * Create a wrapped version of a hook handler that catches errors
 */
export function createSafeHandler(hookName, hookType, componentId, handler, options = {}) {
    const wrapped = async (...args) => {
        const result = await safeExecuteHook(hookName, hookType, componentId, () => handler(...args), options);
        return result.result;
    };
    return wrapped;
}
