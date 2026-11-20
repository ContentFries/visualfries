import path from 'node:path';
import { createHash } from 'node:crypto';
import type { FrameRange } from './footage-map.js';
import type { SubjectBox } from './resolve.js';
import type { LiveRange } from './live-manifest.js';

/**
 * The decisions of `writeLivePreview` (`live-node.ts`) apart from the files: proxy sizes and
 * encodes, their cache keys, and the relative names the preview folder gives project files.
 */

/** Longest side of a proxy picture: a 1920×1080 source becomes 960×540 (1920×540 packed). */
export const PROXY_LONGEST = 960;
/** Raise when the proxy encode changes, so cached proxies are made again. */
export const PROXY_VERSION = 1;
/** Frames between keyframes: a seek decodes at most this many. */
export const PROXY_GOP = 12;

const even = (n: number) => Math.max(2, 2 * Math.round(n / 2));

/** The proxy picture size of a `width`×`height` source: its aspect, longest side `longest`. */
export function proxySize(
	width: number,
	height: number,
	longest = PROXY_LONGEST
): [number, number] {
	const scale = Math.min(1, longest / Math.max(width, height));
	return [even(width * scale), even(height * scale)];
}

export type ProxySpec = {
	src: string;
	matte: string | null;
	/** Size and mtime of the source and the matte, as the footage cache keys them. */
	sizes: ([number, number] | null)[];
	fps: number;
	total: number;
	size: [number, number];
};

export function proxyCacheKey(spec: ProxySpec): string {
	const { src, matte, sizes, fps, total, size } = spec;
	return createHash('sha1')
		.update(JSON.stringify({ src, matte, sizes, fps, total, size, v: PROXY_VERSION }))
		.digest('hex')
		.slice(0, 12);
}

/**
 * ffmpeg arguments of one proxy: every source frame at the project rate (frame n of the proxy is
 * source frame n, as `extract` numbers them), the picture alone or picture|matte side by side
 * (the matte padded like extraction pads it), H.264 with a short GOP so seeks are quick, and the
 * index first so a page can start before the whole file is in.
 */
export function proxyArgs(spec: ProxySpec, output: string): string[] {
	const { src, matte, fps, total } = spec;
	const [w, h] = spec.size;
	const picture = `[0:v]fps=${fps},scale=${w}:${h}:flags=bicubic,setsar=1,format=yuv420p`;
	const graph = matte
		? `${picture}[c];[1:v]fps=${fps},scale=${w}:${h}:flags=bicubic,format=gray,tpad=stop_mode=clone:stop_duration=2,setsar=1,format=yuv420p[m];[c][m]hstack=inputs=2[v]`
		: `${picture}[v]`;
	return [
		'-y',
		'-i',
		src,
		...(matte ? ['-i', matte] : []),
		'-filter_complex',
		graph,
		'-map',
		'[v]',
		'-frames:v',
		String(total),
		'-an',
		'-c:v',
		'libx264',
		'-preset',
		'fast',
		'-crf',
		'20',
		'-g',
		String(PROXY_GOP),
		'-keyint_min',
		String(PROXY_GOP),
		'-sc_threshold',
		'0',
		'-bf',
		'0',
		'-pix_fmt',
		'yuv420p',
		'-r',
		String(fps),
		'-movflags',
		'+faststart',
		output
	];
}

/**
 * The live ranges of one footage: the ranges extraction would cut, each with its frames' subject
 * boxes from `boxes` (measured over the whole matte; null without a matte).
 */
export function liveRanges(ranges: FrameRange[], boxes: (SubjectBox | null)[] | null): LiveRange[] {
	return ranges.map((r) => ({
		first: r.first,
		last: r.last,
		...(boxes
			? {
					boxes: Array.from({ length: r.last - r.first + 1 }, (_, i) => boxes[r.first + i] ?? null)
				}
			: {})
	}));
}

/** Names inside the preview folder for project files: `assets/<n>-<file name>`, one per file. */
export function assetNames(files: string[]): Map<string, string> {
	const names = new Map<string, string>();
	for (const file of files)
		if (!names.has(file))
			names.set(file, `assets/${names.size}-${path.basename(file).replace(/[^\w.-]+/g, '_')}`);
	return names;
}

/**
 * `text` with every served URL of `names` (see `originUrl`) replaced by the file's name in the
 * folder; throws when one is left, so a preview never points at a page-only URL.
 */
export function relativeUrls(
	text: string,
	names: Map<string, string>,
	served: (abs: string) => string,
	origin: string
): string {
	const pairs = [...names].map(([abs, name]) => [served(abs), name] as const);
	pairs.sort((a, b) => b[0].length - a[0].length);
	let out = text;
	for (const [url, name] of pairs) out = out.split(url).join(name);
	const left = out.indexOf(origin);
	if (left !== -1)
		throw new Error(`A file the preview does not carry: ${out.slice(left, left + 120)}`);
	return out;
}

/** The progress line of one footage: from the cache, or how long its proxy took. */
export function proxyLine(name: string, cached: boolean, ms: number): string {
	return `footage "${name}" ${cached ? 'from cache' : `in ${(ms / 1000).toFixed(1)} s`}`;
}

/** The report of a preview's sound: VisualFries's mix at `file`, or null without sound. */
export function liveAudio(
	mix: { report: { delivered?: { lufs: number } } } | null,
	file: string
): { file: string; source: 'visualfries-mix'; lufs: number | null } | null {
	if (!mix) return null;
	return { file, source: 'visualfries-mix', lufs: mix.report.delivered?.lufs ?? null };
}
