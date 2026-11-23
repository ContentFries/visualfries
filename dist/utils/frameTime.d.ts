/** Keeps a time that float error left a hair under a frame boundary on that frame. */
export declare const FRAME_EPSILON = 0.0001;
/** The frame a scene time falls on. Every time the runtime shows is quantized through this. */
export declare const frameIndexAtTime: (time: number, fps: number) => number;
