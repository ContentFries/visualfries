/**
 * What `visualfries check` prints, kept out of the CLI so tests can pin it: the CLI's own process
 * is not covered by the unit tests.
 */
type CheckSegment = {
    id: string;
    startFrame: number;
    frames: number;
};
type CheckError = {
    message: string;
    frame?: number;
};
type CheckResult = {
    id: string;
    ok: boolean;
    mode?: string;
    errors: CheckError[];
    warnings: {
        message: string;
    }[];
};
/** `--export` of check: video or inserts, and inserts come from the whole program. */
export declare function checkExport(exportAs: string | undefined, excerpt: string | undefined): 'video' | 'inserts' | undefined;
/** The text report of check, line by line: each clip or segment, its errors and warnings. */
export declare function checkResultLines(program: {
    segments: CheckSegment[];
}, programMode: boolean, results: CheckResult[]): string[];
export {};
