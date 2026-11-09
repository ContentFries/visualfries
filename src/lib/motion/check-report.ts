/**
 * What `visualfries check` prints, kept out of the CLI so tests can pin it: the CLI's own process
 * is not covered by the unit tests.
 */

type CheckSegment = { id: string; startFrame: number; frames: number };
type CheckError = { message: string; frame?: number };
type CheckResult = {
	id: string;
	ok: boolean;
	mode?: string;
	errors: CheckError[];
	warnings: { message: string }[];
};

/** `--export` of check: video or inserts, and inserts come from the whole program. */
export function checkExport(
	exportAs: string | undefined,
	excerpt: string | undefined
): 'video' | 'inserts' | undefined {
	if (exportAs !== undefined && exportAs !== 'inserts' && exportAs !== 'video')
		throw new Error(`--export must be video or inserts, got "${exportAs}".`);
	if (exportAs === 'inserts' && excerpt !== undefined)
		throw new Error('--excerpt renders a video; inserts come from the whole program.');
	return exportAs;
}

/** One error line; a frame is shown when the check knows it. */
function errorLine(e: CheckError): string {
	const at = e.frame !== undefined && e.frame >= 0 ? ` @f${e.frame}` : '';
	return `  error${at}: ${e.message}`;
}

/** The head line of a clip or segment: its result, id, frame span in a program, and mode. */
function resultHead(r: CheckResult, seg: CheckSegment | null | undefined): string {
	const span = seg ? `  frames ${seg.startFrame}–${seg.startFrame + seg.frames - 1}` : '';
	return `${r.ok ? 'ok  ' : 'FAIL'} ${r.id}${span}${r.mode ? `  (${r.mode})` : ''}`;
}

/** The closing line: how many clips (or segments, in a program) need attention. */
function summaryLine(results: CheckResult[], programMode: boolean): string {
	const kind = programMode ? 'segments' : 'clips';
	const failed = results.filter((r) => !r.ok).length;
	return failed
		? `${failed} of ${results.length} ${kind} need attention.`
		: `All ${results.length} ${kind} pass.`;
}

/** The text report of check, line by line: each clip or segment, its errors and warnings. */
export function checkResultLines(
	program: { segments: CheckSegment[] },
	programMode: boolean,
	results: CheckResult[]
): string[] {
	const lines: string[] = [];
	for (const r of results) {
		const seg = programMode ? program.segments.find((s) => s.id === r.id) : null;
		lines.push(resultHead(r, seg));
		for (const e of r.errors) lines.push(errorLine(e));
		for (const w of r.warnings) lines.push(`  warning: ${w.message}`);
	}
	lines.push(summaryLine(results, programMode));
	return lines;
}
