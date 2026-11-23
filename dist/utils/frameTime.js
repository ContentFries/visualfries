/** Keeps a time that float error left a hair under a frame boundary on that frame. */
export const FRAME_EPSILON = 1e-4;
/** The frame a scene time falls on. Every time the runtime shows is quantized through this. */
export const frameIndexAtTime = (time, fps) => Math.max(0, Math.floor(Math.max(time, 0) * fps + FRAME_EPSILON));
