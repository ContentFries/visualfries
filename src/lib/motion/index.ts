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
export type { MotionWordRef, ResolvedClip, ResolvedCue } from './resolve.js';
