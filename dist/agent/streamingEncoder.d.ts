export type StreamEncoderFrameExtension = 'jpg' | 'png';
export type PipeFrameEncoderOptions = {
    fps: number;
    inputExt: StreamEncoderFrameExtension;
    outputPath: string;
    crf?: number;
    preset?: string;
    debug?: boolean;
};
export declare function createFfmpegImagePipeArgs(options: PipeFrameEncoderOptions): string[];
export declare function createMuxAudioArgs(input: {
    videoPath: string;
    audioPath: string;
    outputPath: string;
}): string[];
export declare class PipeFrameEncoder {
    #private;
    constructor(options: PipeFrameEncoderOptions);
    start(): void;
    writeFrame(buffer: Buffer): Promise<void>;
    finish(): Promise<{
        elapsedMs: number;
    }>;
    abort(): void;
}
export declare function muxAudioWithVideo(input: {
    videoPath: string;
    audioPath: string;
    outputPath: string;
    debug?: boolean;
}): Promise<void>;
