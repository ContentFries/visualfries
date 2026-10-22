import fs from 'node:fs/promises';
import { rmSync } from 'node:fs';
import path from 'node:path';

/**
 * Temporary files of renders (partial encodes, intermediates, join lists): removed when the
 * process is interrupted, and swept by the next render when a killed process left them behind.
 */

/** Temporary files of this process, removed when it is interrupted. */
const partials = new Set<string>();
let onSignal: ((signal: NodeJS.Signals) => void) | null = null;
/** Set by SIGINT or SIGTERM: no render of this process writes another temporary file. */
let interrupted: NodeJS.Signals | null = null;

/**
 * Registers a temporary file: SIGINT or SIGTERM removes it before the process exits, and a
 * render still running then stops at its next file. Returns the call that unregisters it.
 */
export function trackPartial(file: string): () => void {
	if (interrupted) throw new Error(`Render stopped by ${interrupted}.`);
	partials.add(file);
	if (!onSignal) {
		onSignal = (signal) => {
			interrupted = signal;
			for (const f of partials) rmSync(f, { force: true });
			partials.clear();
			process.off('SIGINT', onSignal!);
			process.off('SIGTERM', onSignal!);
			onSignal = null;
			// Others listening (Playwright closes its browsers) end the process; else end it as
			// the signal would have.
			if (!process.listenerCount(signal)) process.kill(process.pid, signal);
		};
		process.on('SIGINT', onSignal);
		process.on('SIGTERM', onSignal);
	}
	return () => {
		partials.delete(file);
		if (!partials.size && onSignal) {
			process.off('SIGINT', onSignal);
			process.off('SIGTERM', onSignal);
			onSignal = null;
		}
	};
}

const alive = (pid: number) => {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === 'EPERM';
	}
};

/**
 * Removes temporary files and folders (partial intermediates and encodes, join lists, footage
 * being extracted) whose name carries the id of a process no longer running: `pattern`
 * captures it.
 */
export async function removeOrphans(dir: string, pattern: RegExp) {
	const names = await fs.readdir(dir).catch(() => [] as string[]);
	await Promise.all(
		names.map(async (name) => {
			const m = pattern.exec(name);
			if (!m || Number(m[1]) === process.pid || alive(Number(m[1]))) return;
			await fs.rm(path.join(dir, name), { force: true, recursive: true });
		})
	);
}
