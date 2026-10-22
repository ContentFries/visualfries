/**
 * Registers a temporary file: SIGINT or SIGTERM removes it before the process exits, and a
 * render still running then stops at its next file. Returns the call that unregisters it.
 */
export declare function trackPartial(file: string): () => void;
/**
 * Removes temporary files (partial intermediates and encodes, join lists) whose name carries
 * the id of a process no longer running: `pattern` captures it.
 */
export declare function removeOrphans(dir: string, pattern: RegExp): Promise<void>;
