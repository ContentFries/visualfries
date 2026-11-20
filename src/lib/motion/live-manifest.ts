import { footageMap, type FootageMap } from './footage-map.js';
import type { ResolvedBrand } from './brand.js';
import type { ResolvedProgram } from './program.js';
import type { FootageFrames, FootageRange, SubjectBox } from './resolve.js';
import { segmentStage, wholeProgram, type StageSegment } from './segments.js';
import type { StageFont } from './stage.js';

/**
 * A live preview folder (`visualfries live`): everything a page needs to play a program in real
 * time, with no extracted frames. `manifest.json` names every other file relative to itself, so
 * the folder can be served from anywhere; `resolveLiveManifest` makes those names URLs.
 */

/** Version of `manifest.json`; a player refuses other versions. */
export const LIVE_MANIFEST_VERSION = 1;

/**
 * A proxy video of one footage source, at the project frame rate (frame n of the video is
 * source frame n). `packed`: the picture in the left half and its matte in the right half of the
 * same frame, so the subject cut-out can never be a frame off its picture.
 */
export type LiveSource = {
	url: string;
	packed: boolean;
	/** Size of the picture (one half of a packed proxy). */
	size: [number, number];
	/** Frames of the whole source at the project rate, and its own size. */
	total: number;
	width: number;
	height: number;
};

/**
 * The source frames of a footage the program draws, as `extract` would cut them (same ranges,
 * so frames outside them hold the same edge), with the subject box of each frame when the
 * footage has a matte.
 */
export type LiveRange = { first: number; last: number; boxes?: (SubjectBox | null)[] };

export type LiveManifest = {
	version: typeof LIVE_MANIFEST_VERSION;
	fps: number;
	frames: number;
	/** Seconds. */
	duration: number;
	size: [number, number];
	/** The ES module with the blocks and the player (`createPlayer`). */
	bundle: string;
	/** Its stylesheet, when blocks import CSS; null otherwise. */
	styles: string | null;
	/** The whole program as one stage segment; its `footage` comes from `footage` and `boxes`. */
	segment: StageSegment;
	footage: Record<string, LiveSource>;
	boxes: Record<string, LiveRange[]>;
	fonts: StageFont[];
	/** The project's CSS. */
	css: string;
	/** The program's sound mix; null when it has no sound. */
	audio: string | null;
	/** Files the segment and the CSS name (fonts, images), relative to the manifest. */
	files: string[];
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Replaces each of `files` where it starts a string or follows a quote, a parenthesis or a
 * space (`url("assets/1-logo.png")`, a prop that is the file) with `url(file)`.
 */
function fileSwapper(files: string[], url: (file: string) => string) {
	if (!files.length) return (s: string) => s;
	const names = [...files].sort((a, b) => b.length - a.length).map(escape);
	const re = new RegExp(`(^|["'(\\s])(${names.join('|')})`, 'g');
	return (s: string) => s.replace(re, (_all, lead: string, file: string) => lead + url(file));
}

function swapStrings<T>(value: T, swap: (s: string) => string): T {
	if (typeof value === 'string') return swap(value) as T;
	if (Array.isArray(value)) return value.map((v) => swapStrings(v, swap)) as T;
	if (value && typeof value === 'object')
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [k, swapStrings(v, swap)])
		) as T;
	return value;
}

/**
 * The manifest with every file it names as a URL against `base` (the manifest's own URL): the
 * bundle, proxies, sound, fonts, and the files the segment's props, brand tokens and CSS name.
 */
export function resolveLiveManifest(manifest: LiveManifest, base: string): LiveManifest {
	if (manifest.version !== LIVE_MANIFEST_VERSION)
		throw new Error(
			`Live preview version ${manifest.version} is not supported (this player reads ${LIVE_MANIFEST_VERSION}).`
		);
	const url = (file: string) => new URL(file, base).href;
	const swap = fileSwapper(manifest.files, url);
	return {
		...manifest,
		bundle: url(manifest.bundle),
		styles: manifest.styles === null ? null : url(manifest.styles),
		segment: swapStrings(manifest.segment, swap),
		footage: Object.fromEntries(
			Object.entries(manifest.footage).map(([name, f]) => [name, { ...f, url: url(f.url) }])
		),
		fonts: manifest.fonts.map((f) => ({ ...f, url: url(f.url) })),
		css: swap(manifest.css),
		audio: manifest.audio === null ? null : url(manifest.audio),
		files: manifest.files.map(url)
	};
}

/**
 * Footage frames for the stage from proxies and ranges instead of extracted files: no URLs (the
 * live pictures draw from the videos), the same ranges and subject boxes as extraction.
 */
export function liveFootageFrames(
	footage: Record<string, LiveSource>,
	boxes: Record<string, LiveRange[]> = {}
): Record<string, FootageFrames> {
	const frames: Record<string, FootageFrames> = {};
	for (const [name, source] of Object.entries(footage)) {
		const ranges: FootageRange[] = (boxes[name] ?? []).map((r) => ({
			url: '',
			first: r.first,
			last: r.last,
			...(r.boxes ? { boxes: r.boxes } : {})
		}));
		frames[name] = {
			url: '',
			first: ranges[0]?.first ?? 0,
			last: ranges[0]?.last ?? -1,
			ranges,
			total: source.total,
			width: source.width,
			height: source.height,
			startFrame: 0,
			subject: source.packed,
			boxes: ranges[0]?.boxes
		};
	}
	return frames;
}

/** A resolved program, not yet a stage segment (see `liveSegment`). */
export type LiveProgram = Pick<
	ResolvedProgram,
	| 'fps'
	| 'frames'
	| 'format'
	| 'background'
	| 'shots'
	| 'clips'
	| 'transitions'
	| 'excerpt'
	| 'sources'
	| 'cuts'
>;

const isSegment = (input: StageSegment | LiveProgram): input is StageSegment =>
	'footageMap' in input && 'size' in input;

/**
 * The segment a live player draws: a stage segment as it is, or a whole resolved program as one
 * segment (`brand` its tokens), with the footage frames of the proxies.
 */
export function liveSegment(
	input: StageSegment | LiveProgram,
	footage: Record<string, LiveSource>,
	boxes?: Record<string, LiveRange[]>,
	brand?: ResolvedBrand
): StageSegment {
	const frames = liveFootageFrames(footage, boxes);
	if (isSegment(input)) return { ...input, footage: frames };
	const totals = Object.fromEntries(Object.entries(footage).map(([n, f]) => [n, f.total]));
	const map: FootageMap = footageMap(input, totals);
	return segmentStage(input, wholeProgram(input), { frames, map }, brand);
}
