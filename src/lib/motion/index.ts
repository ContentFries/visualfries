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
	type Ease,
	type ClipEvent,
	type CameraView,
	type FootagePicture
} from './runtime.svelte.js';
export type { MotionBeatRef } from './beat-grid.js';
export { ENERGIES, type Energy } from './energy.js';
export { motion } from './motion.js';
export {
	ENERGY,
	type MotionOptions,
	type Entrance,
	type Emphasis,
	type EmphasisSpec,
	type CountSpec,
	type Direction,
	type Split
} from './primitives.js';
export type {
	FootageFrames,
	FootageRange,
	MotionWordRef,
	ResolvedClip,
	ResolvedCue,
	SubjectBox
} from './resolve.js';
export { default as Footage } from './Footage.svelte';
export { default as Captions } from './Captions.svelte';
export { default as Subject } from './Subject.svelte';
export {
	placeRegion,
	regionPivot,
	headOf,
	type Point,
	type RegionLine,
	type RegionShape,
	type SubjectRegion
} from './subject-region.js';
export { drawRegion, drawRim, loadPicture, type Rim } from './subject-canvas.js';
export {
	footageFrameAt,
	footageFrameUrl,
	sourceFrameUrl,
	sourceSubjectBox,
	subjectBox,
	type FootageFrame,
	type FootageLayer
} from './footage.js';
export {
	footageAt,
	programFootageAt,
	sourceFrameAt,
	type FootageMap,
	type FootageView
} from './footage-map.js';
export {
	SHOT_MODULES,
	mixLayouts,
	shotAt,
	shotLayout,
	shotLayoutAt,
	shotModule,
	keyCamera,
	type Rect as ShotRect,
	type ShotInput,
	type ShotLayout,
	type ShotModule,
	type ShotSpan
} from './shots/index.js';
export {
	outline,
	outlineFilter,
	outlineFilterId,
	outlineFilterMarkup,
	outlineStyle,
	type OutlineMode,
	type OutlineOptions
} from './outline.js';
export {
	NEUTRAL_BRAND,
	contrast,
	readableOn,
	solidColor,
	toHex,
	type ResolvedBrand
} from './brand.js';
export { BUILTIN_STYLES, type ResolvedStyle } from './style.js';
export { SAFE_ZONES, SAFE_ZONES_CHECKED } from './safe-zones.js';
export { resolveFormat, type FormatClass, type ResolvedFormat, type SafeInsets } from './format.js';
export type { Brand, Style } from './project.js';
export {
	KEY_EASE,
	buildKeyTracks,
	keyTracks,
	substituteBrand,
	type Animatable,
	type KeyTracks,
	type Placement
} from './keys.js';
