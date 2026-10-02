// Browser-side API for motion blocks. Node tooling lives in `visualfries/motion/node`.
export {
	Clip,
	useClip,
	useTimeline,
	useFrame,
	useReady,
	clamp,
	lerp,
	random,
	noise,
	type At,
	type Ease
} from './runtime.svelte.js';
export type { FootageFrames, MotionWordRef, ResolvedClip, ResolvedCue } from './resolve.js';
export { default as Footage } from './Footage.svelte';
export { footageFrameUrl, type FootageLayer } from './footage.js';
