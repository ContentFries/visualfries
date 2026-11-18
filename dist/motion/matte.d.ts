import type { FrameRange } from './footage-map.js';
/** One piece of the input video to segment. */
export type MatteChunk = {
    /** Constant-frame-rate H.264 MP4 of this piece, without sound. */
    input: string;
    /** Where the provider writes its mask video. */
    output: string;
    index: number;
    /** First and last frame of the piece in the input video. */
    first: number;
    last: number;
    frames: number;
    fps: number;
    width: number;
    height: number;
};
/**
 * Turns a video into a mask video. VisualFries splits the input into pieces of at most
 * `maxFrames`, checks each mask's frame count, normalises it (size, frame rate, greyscale,
 * a missing last frame or two) and joins the pieces, so a provider only segments one file.
 */
export type MatteProvider = {
    name: string;
    /**
     * What decides the masks (model and settings, not speed): partial mattes cache each range
     * under it. Default: `name`.
     */
    id?: string;
    /** Longest piece the provider accepts, in frames. */
    maxFrames: number;
    /** Pieces worth running at once. */
    parallel?: number;
    /**
     * How the mask encodes the subject: `luma` (white = subject, the default) or `alpha`
     * (a video with transparency, e.g. ProRes 4444 or VP9 WebM).
     */
    output?: 'luma' | 'alpha';
    /** File extension of the mask the provider writes. Default `.mp4`, `.mov` for alpha. */
    extension?: string;
    /**
     * Whether a frame's mask depends on the frames before it (a recurrent model). Pieces of a
     * partial matte then start a second early and those frames are thrown away. Default true;
     * false for a model that segments every frame on its own (nothing extra is segmented).
     */
    recurrent?: boolean;
    segment(chunk: MatteChunk): Promise<void>;
    /**
     * Segments several pieces in one run (the model loads once). Each piece is segmented on its
     * own, from a fresh start, so its mask is the one `segment` would give. Calls `onPiece` with
     * a piece's position in `chunks` once its mask is written, if it can tell. Optional.
     */
    segmentMany?(chunks: MatteChunk[], onPiece?: (index: number) => void): Promise<void>;
};
export type BiRefNetModel = 'Matting' | 'Portrait' | 'General Use (Light)' | 'General Use (Light 2K)' | 'General Use (Heavy)' | 'General Use (Dynamic)';
/** @deprecated Use BiRefNetModel. */
export type MatteModel = BiRefNetModel;
/**
 * BiRefNet v2 on fal.ai (`FAL_KEY`). `Matting` keeps hair and microphones; `Portrait` is tuned
 * for people. The API accepts at most 512 frames per request.
 */
export declare function falBiRefNet(opts?: {
    key?: string;
    model?: BiRefNetModel;
    resolution?: '1024x1024' | '2048x2048' | '2304x2304';
    /** Injected in tests. */
    fetch?: typeof fetch;
}): MatteProvider;
/**
 * Runs any local tool once per piece. `template` is a shell command with placeholders:
 * `{input}`, `{output}` (paths), `{fps}`, `{width}`, `{height}`, `{frames}`.
 * The tool must write a video to `{output}`: greyscale with white = subject (`output: 'luma'`)
 * or a video with transparency (`output: 'alpha'`; set `extension` to `.webm` for VP9).
 *
 *   commandMatte('python rvm.py --in {input} --out {output}')
 */
export declare function commandMatte(template: string, opts?: {
    maxFrames?: number;
    parallel?: number;
    output?: 'luma' | 'alpha';
    extension?: string;
    /** False when the tool segments every frame on its own (no warm-up). Default true. */
    recurrent?: boolean;
}): MatteProvider;
/**
 * Local matte with RobustVideoMatting (mobilenetv3) on the CPU: no API key, no account, temporally
 * stable. Runs the bundled `scripts/rvm-matte.py` through `uv`, which brings Python, torch,
 * torchvision and numpy on first use (current CPU wheels); the model code (v1.0.0 tag) and the
 * weights (its GitHub release, SHA-256 checked) are fetched once into torch.hub's cache.
 * Needs `uv` and `ffmpeg`, and network on the first run.
 * About 3 fps at 1080p and 16 fps at 540p on a 12-core server. RVM is recurrent, so long chunks keep
 * it stable; 480 frames per chunk by default.
 */
export declare function rvmMatte(opts?: {
    threads?: number;
    maxFrames?: number;
    uv?: string;
    script?: string;
}): MatteProvider;
/**
 * Which provider `visualfries matte` uses: the one named, else `command` when a command is given,
 * `fal` when a fal-only option (model, resolution) is given, else local `rvm`.
 */
export declare function matteProviderName(flags: {
    provider?: string;
    command?: string;
    model?: string;
    resolution?: string;
}): string;
/** The provider the flags of `visualfries matte` ask for (see `matteProviderName`). */
export declare function matteProviderFromFlags(flags: {
    provider?: string;
    command?: string;
    commandOutput?: string;
    commandExt?: string;
    model?: string;
    resolution?: string;
    threads?: number;
    maxFrames?: number;
    jobs?: number;
}): MatteProvider;
export type MatteOptions = {
    output: string;
    /**
     * Who segments the video. Default: `rvmMatte()`, local on the CPU with no key. For a cleaner
     * edge on hair and microphones pass `falBiRefNet()` (fal.ai, paid, `FAL_KEY`).
     */
    provider?: MatteProvider;
    /** Frames per piece; at most the provider's `maxFrames`. Default: 480 or the provider limit. */
    chunkFrames?: number;
    /** Pieces running at once. Default: the provider's `parallel`. */
    jobs?: number;
    onProgress?: (message: string) => void;
};
export type MatteResult = {
    output: string;
    frames: number;
    fps: number;
    width: number;
    height: number;
    chunks: number;
    provider: string;
    seconds: number;
};
/** Frame ranges `[first, last]` that cover `frames` in pieces of at most `size` (≤ `max`). */
export declare function planMatteChunks(frames: number, size: number, max?: number): {
    first: number;
    last: number;
}[];
/**
 * Writes frames `first`–`last` of `input` (its own frames) to `output`. A fast seek to a few
 * seconds before the frames, then `trim` by frame count from there, so a piece late in a long
 * video does not decode it from the start. The seek goes to half a frame before a frame start,
 * so the first frame kept is exactly that frame; `trim` counts the rest frame-exact.
 */
export declare function extractFrames(input: string, fps: number, first: number, last: number, output: string): Promise<void>;
/**
 * Makes a greyscale matte video of `input` (white = subject) with a matte provider: splits the
 * video into pieces the provider accepts, checks and normalises every mask and joins them, so
 * the matte has the same size, frame rate and frame count as the input. A ranges file a partial
 * matte left at `output` (see `createRangeMatte`) is removed: this matte covers every frame.
 */
export declare function createSubjectMatte(input: string, opts: MatteOptions): Promise<MatteResult>;
/**
 * The real path of `file` with symlinks resolved: of the file when it exists, else of the
 * nearest folder above it that does, with the rest of the path as written.
 */
export declare function realPath(file: string): string;
export type RangeMatteOptions = MatteOptions & {
    /** Frames of the input (its own rate) to matte, as sorted inclusive ranges. */
    ranges: FrameRange[];
    /**
     * Frames matted before each stretch and thrown away, so a recurrent model has settled by
     * its first frame. Default: one second.
     */
    warmup?: number;
    /**
     * Frames of the blocks the masks are cached in. The matte covers whole blocks, so a range
     * that grows mattes only its new blocks. Default: four seconds (each block is matted from a second before it).
     */
    blockFrames?: number;
    /** Pieces in one provider run at most, for providers that take several (default 64). */
    batchPieces?: number;
    /** Folder that keeps each block's mask, so a block matted before is not matted again. */
    cacheDir: string;
};
export type RangeMatteResult = MatteResult & {
    /** Frames the matte covers (outside them it is black), and how many were matted now. */
    covered: number;
    matted: number;
    /** The frames covered, as sorted inclusive ranges (whole blocks). */
    ranges: FrameRange[];
    /** False when the matte at `output` already was this one and was left alone. */
    written: boolean;
};
/**
 * A cheap fingerprint of a file's content: its size and a hash of its first and last MiB. It
 * survives copying and renaming, and changes when the file is replaced by another.
 */
export declare function fileFingerprint(file: string): Promise<string>;
/** Cache key of one block's mask: the input's content, the block, the warm-up and the provider. */
export declare function blockMaskKey(input: {
    version: number;
    source: string;
    frames: number;
    fps: number;
    block: number;
    blockFrames: number;
    warmup: number;
    provider: string;
    chunkFrames: number;
}): string;
/** The blocks of `size` frames that hold any frame of `ranges`, in order. */
export declare function blocksOf(ranges: readonly FrameRange[], size: number): number[];
/** Runs of consecutive block numbers, as inclusive `{ first, last }` blocks. */
export declare function blockRuns(blocks: readonly number[]): FrameRange[];
/** The pieces of a full-length matte: masks of `ranges` and the black gaps between them. */
export declare function matteLayout(ranges: readonly FrameRange[], total: number): ({
    range: number;
} | {
    gap: number;
})[];
/**
 * Makes a full-length matte of `input` that covers `ranges` in whole blocks (black, no subject,
 * elsewhere) and writes its ranges file next to it (see `MatteRangesFile`), so `check` and
 * `render` know which frames it covers. Each block's mask is cached in `cacheDir`: running it
 * again after an edit mattes only new blocks, and leaves a matte that would not change alone.
 * The matte and its ranges file are published by renaming, the ranges file first and naming
 * the new matte's fingerprint, so a run stopped half way never passes for another matte.
 */
export declare function createRangeMatte(input: string, opts: RangeMatteOptions): Promise<RangeMatteResult>;
