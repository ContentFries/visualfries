export type MatteModel = 'Matting' | 'Portrait' | 'General Use (Light)' | 'General Use (Light 2K)' | 'General Use (Heavy)' | 'General Use (Dynamic)';
export type MatteOptions = {
    output: string;
    /** BiRefNet model. `Matting` keeps hair; `Portrait` is tuned for people. */
    model?: MatteModel;
    resolution?: '1024x1024' | '2048x2048' | '2304x2304';
    /** Frames per fal.ai request (at most 512). */
    chunkFrames?: number;
    /** Requests running at once. */
    jobs?: number;
    falKey?: string;
    onProgress?: (message: string) => void;
    /** Injected in tests. */
    fetch?: typeof fetch;
};
export type MatteResult = {
    output: string;
    frames: number;
    fps: number;
    width: number;
    height: number;
    chunks: number;
    model: MatteModel;
    seconds: number;
};
/** Frame ranges `[first, last]` that cover `frames` in chunks of at most `size`. */
export declare function planMatteChunks(frames: number, size: number): {
    first: number;
    last: number;
}[];
/**
 * Makes a greyscale matte video of `input` (white = subject) with BiRefNet v2 on fal.ai:
 * splits the video into chunks the API accepts, keeps each chunk's frame count exact and
 * joins them, so the matte has the same size, frame rate and frame count as the input.
 */
export declare function createSubjectMatte(input: string, opts: MatteOptions): Promise<MatteResult>;
