/**
 * Safe Hook Runner
 *
 * Utility for safely executing hooks with error boundaries.
 * Prevents one failing hook from crashing the entire component lifecycle.
 */

import type { EventManager } from '$lib/managers/EventManager.js';

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

const defaultOptions: Required<Omit<SafeHookRunnerOptions, 'eventManager'>> = {
	continueOnError: true,
	logErrors: true
};

/**
 * Safely execute a single hook handler with error boundary
 */
export async function safeExecuteHook<T>(
	hookName: string,
	hookType: string,
	componentId: string,
	handler: () => Promise<T> | T,
	options: SafeHookRunnerOptions = {}
): Promise<{ success: boolean; result?: T; error?: HookError }> {
	const opts = { ...defaultOptions, ...options };

	try {
		const result = await handler();
		return { success: true, result };
	} catch (err) {
		const error = err instanceof Error ? err : new Error(String(err));

		const hookError: HookError = {
			hookName,
			hookType,
			error,
			componentId,
			timestamp: Date.now()
		};

		if (opts.logErrors) {
			console.warn(
				`[SafeHookRunner] Hook "${hookName}" failed during "${hookType}" for component "${componentId}":`,
				error.message
			);
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
export async function safeExecuteHooks(
	hooks: Array<{
		name: string;
		handler: () => Promise<void> | void;
	}>,
	hookType: string,
	componentId: string,
	options: SafeHookRunnerOptions = {}
): Promise<{ allSucceeded: boolean; errors: HookError[] }> {
	const opts = { ...defaultOptions, ...options };
	const errors: HookError[] = [];

	for (const hook of hooks) {
		const result = await safeExecuteHook(
			hook.name,
			hookType,
			componentId,
			hook.handler,
			options
		);

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
export function createSafeHandler<T extends (...args: any[]) => Promise<any> | any>(
	hookName: string,
	hookType: string,
	componentId: string,
	handler: T,
	options: SafeHookRunnerOptions = {}
): T {
	const wrapped = async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | undefined> => {
		const result = await safeExecuteHook(
			hookName,
			hookType,
			componentId,
			() => handler(...args),
			options
		);
		return result.result;
	};

	return wrapped as T;
}
