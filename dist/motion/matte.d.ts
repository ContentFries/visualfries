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
    segment(chunk: MatteChunk): Promise<void>;
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
}): MatteProvider;
export type MatteOptions = {
    output: string;
    /** Who segments the video. Default: `falBiRefNet({ model, resolution, key: falKey })`. */
    provider?: MatteProvider;
    /** Frames per piece; at most the provider's `maxFrames`. Default: 480 or the provider limit. */
    chunkFrames?: number;
    /** Pieces running at once. Default: the provider's `parallel`. */
    jobs?: number;
    onProgress?: (message: string) => void;
    /** For the default fal.ai provider. */
    model?: BiRefNetModel;
    resolution?: '1024x1024' | '2048x2048' | '2304x2304';
    falKey?: string;
    fetch?: typeof fetch;
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
 * Makes a greyscale matte video of `input` (white = subject) with a matte provider: splits the
 * video into pieces the provider accepts, checks and normalises every mask and joins them, so
 * the matte has the same size, frame rate and frame count as the input.
 */
export declare function createSubjectMatte(input: string, opts: MatteOptions): Promise<MatteResult>;
