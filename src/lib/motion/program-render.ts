import fs from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
	H264_FINAL,
	bundleMotionProject,
	ffmpegFramePipe,
	findChromium,
	launch,
	motionProgram,
	pipeFrames,
	type BrowserLike,
	type BundleResult,
	type LoadedMotionProject
} from './node.js';
import type { AudioPiece, ProgramSegment, ResolvedProgram } from './program.js';
import { assertProgramRenders, openSegment } from './program-node.js';

/**
 * `render --export video`: the whole program as one video. Each segment is drawn on its own
 * pages and encoded losslessly to `.visualfries/segments/`, where it stays as a cache: a later
 * render draws only segments whose hash changed. The segments are then joined without
 * re-encoding and go through one final encode with the settings of every other render.
 */

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Lossless intermediate: H.264 in RGB with quantiser 0, so decoded frames are the captured
 * pixels exactly (no colour conversion).
 */
const INTERMEDIATE = ['-c:v', 'libx264rgb', '-qp', '0', '-preset', 'veryfast', '-pix_fmt', 'rgb24'];

export type RenderedSegment = {
	id: string;
	startFrame: number;
	frames: number;
	hash: string;
	/** The lossless intermediate in the segment cache. */
	file: string;
	/** True when the intermediate came from an earlier render. */
	cached: boolean;
	/** Seconds spent drawing and encoding it (0 when cached). */
	seconds: number;
};

export type RenderedProgram = {
	file: string;
	/** The resolved program saved beside the video (`<name>.program.json`). */
	program: string;
	format: string;
	fps: number;
	frames: number;
	/** `speech`: the cut list's sound, placed per cut (no music, effects or loudness yet). */
	audio: 'speech' | 'silent';
	mode: string;
	segments: RenderedSegment[];
	/** Seconds for the whole render, and for the final join and encode alone. */
	seconds: number;
	encodeSeconds: number;
};

export type ProgramRenderOptions = {
	/** A `.mp4` file, or a directory that gets `<project name>[.<format>].mp4`. */
	output: string;
	/** `WIDTHxHEIGHT`; the project size when omitted. */
	format?: string;
	jobs?: number;
	invalidate?: string;
	/** Draw every segment again, replacing what the cache holds. */
	fresh?: boolean;
	/**
	 * How pages share the work: `auto` (whole segments per page when there are at least as many
	 * segments to draw as jobs, none much longer than its share), or always `segments` or always
	 * `frames`. For measurements.
	 */
	schedule?: 'auto' | 'segments' | 'frames';
	onProgress?: (msg: string) => void;
};

/** Renders the program of a project with `cuts` or `shots` into one video. */
export async function renderProgramVideo(
	loaded: LoadedMotionProject,
	opts: ProgramRenderOptions
): Promise<RenderedProgram> {
	if (opts.jobs !== undefined && !(Number.isInteger(opts.jobs) && opts.jobs > 0))
		throw new Error(`--jobs must be a positive integer, got ${opts.jobs}.`);
	const t0 = Date.now();
	const { program } = await motionProgram(loaded, { format: opts.format, write: true });
	assertProgramRenders(program);
	// Saved as resolved: bundling attaches extracted footage to the clips.
	const resolved = JSON.stringify(program, null, 2) + '\n';
	const [w, h] = program.format.size;
	if (w % 2 || h % 2)
		throw new Error(
			`Format ${program.format.name} must have even dimensions for H.264; use an even width and height.`
		);
	const file = outputFile(loaded, opts);
	const sidecar = file.replace(/\.mp4$/i, '.program.json');
	await fs.mkdir(path.dirname(file), { recursive: true });

	const cacheDir = path.join(loaded.dir, '.visualfries', 'segments');
	await fs.mkdir(cacheDir, { recursive: true });
	const engine = await engineHash(opts.invalidate);
	const segments: RenderedSegment[] = program.segments.map((s) => {
		const cached = path.join(cacheDir, `${s.hash}-${engine}.mkv`);
		return {
			id: s.id,
			startFrame: s.startFrame,
			frames: s.frames,
			hash: s.hash,
			file: cached,
			cached: !opts.fresh && existsSync(cached),
			seconds: 0
		};
	});
	const todo = segments.filter((s) => !s.cached);
	const log = opts.onProgress ?? (() => {});
	for (const s of segments.filter((x) => x.cached))
		log(`${s.id}: frames ${span(s)} cached (${s.hash.slice(0, 12)})`);

	let mode = 'cached';
	if (todo.length) {
		const bundle = await bundleMotionProject(loaded, program.clips);
		const browser = await launch();
		try {
			mode = await renderSegments(browser, bundle, program, todo, {
				jobs: opts.jobs ?? Math.min(6, os.cpus().length),
				invalidate: opts.invalidate,
				schedule: opts.schedule ?? 'auto',
				log
			});
		} finally {
			await browser.close();
			await fs.rm(bundle.dir, { recursive: true, force: true });
		}
	}

	const t1 = Date.now();
	const audio = await joinAndEncode(loaded, program, segments, file);
	const encodeSeconds = (Date.now() - t1) / 1000;
	await fs.writeFile(sidecar, resolved);
	log(
		`final encode: ${program.frames} frames in ${encodeSeconds.toFixed(1)} s${audio === 'silent' ? ' (silent)' : ''}`
	);
	return {
		file,
		program: sidecar,
		format: program.format.name,
		fps: program.fps,
		frames: program.frames,
		audio,
		mode,
		segments,
		seconds: (Date.now() - t0) / 1000,
		encodeSeconds
	};
}

const span = (s: { startFrame: number; frames: number }) =>
	`${s.startFrame}–${s.startFrame + s.frames - 1}`;

function outputFile(loaded: LoadedMotionProject, opts: ProgramRenderOptions): string {
	if (/\.mp4$/i.test(opts.output)) return path.resolve(opts.output);
	if (path.extname(opts.output))
		throw new Error(
			`--output ${opts.output}: a program renders an .mp4; name one, or a directory.`
		);
	const name = path.basename(loaded.file).replace(/(\.vf)?\.json$/i, '');
	return path.resolve(opts.output, `${name}${opts.format ? `.${opts.format}` : ''}.mp4`);
}

/**
 * What the pixels of a segment depend on besides its own hash: the VisualFries runtime that
 * draws it (stage, shots, transitions, built-in blocks), the Svelte and GSAP it is bundled with,
 * the browser, the stage invalidation and the intermediate encoding.
 */
async function engineHash(invalidate?: string): Promise<string> {
	const hash = createHash('sha1');
	const files = (await fs.readdir(HERE, { recursive: true }))
		.filter((f) => /\.(js|ts|svelte|css)$/.test(f) && !f.endsWith('.d.ts'))
		.sort();
	for (const f of files) hash.update(f).update(await fs.readFile(path.join(HERE, f)));
	for (const pkg of ['svelte', 'gsap', 'playwright']) {
		try {
			hash.update(`${pkg}@${require(`${pkg}/package.json`).version}`);
		} catch {
			hash.update(`${pkg}@-`);
		}
	}
	const chromium = findChromium();
	if (chromium) {
		const st = statSync(chromium);
		hash.update(`${chromium}:${st.size}:${st.mtimeMs}`);
	}
	hash.update(JSON.stringify({ invalidate: invalidate ?? null, intermediate: INTERMEDIATE }));
	return hash.digest('hex').slice(0, 12);
}

/**
 * Draws segments into their intermediates. With at least as many segments as jobs and none much
 * longer than its share, each page takes whole segments (no reorder buffer across pages, every
 * page encodes its own file);
 * otherwise the segments go one after another with their frames spread over `jobs` pages. The
 * first failure, a crashed page included, stops every other page at its next frame.
 */
async function renderSegments(
	browser: BrowserLike,
	bundle: BundleResult,
	program: ResolvedProgram,
	todo: RenderedSegment[],
	opts: {
		jobs: number;
		invalidate?: string;
		schedule: 'auto' | 'segments' | 'frames';
		log: (msg: string) => void;
	}
): Promise<string> {
	const abort = new AbortController();
	let mode = '';
	const one = async (s: RenderedSegment, pages: number) => {
		const t0 = Date.now();
		const segment = program.segments.find((x) => x.id === s.id) as ProgramSegment;
		const partial = s.file.replace(/\.mkv$/, `.partial-${process.pid}-${s.id}.mkv`);
		try {
			const sink = ffmpegFramePipe([
				'-y',
				'-f',
				'image2pipe',
				'-framerate',
				String(program.fps),
				'-c:v',
				'png',
				'-i',
				'pipe:0',
				...INTERMEDIATE,
				partial
			]);
			const open = async () => {
				const page = await openSegment(browser, bundle, program, segment, {
					invalidate: opts.invalidate
				});
				mode = page.mode;
				// Pipe frames count from 0; the page takes program frames.
				return { capture: (i: number) => page.capture(s.startFrame + i), close: page.close };
			};
			await pipeFrames(s.frames, Math.min(pages, s.frames), open, sink, {
				signal: abort.signal
			});
			await fs.rename(partial, s.file);
		} finally {
			await fs.rm(partial, { force: true });
		}
		s.seconds = (Date.now() - t0) / 1000;
		opts.log(
			`${s.id}: frames ${span(s)} rendered in ${s.seconds.toFixed(1)} s (${(s.frames / s.seconds).toFixed(1)} fps)`
		);
	};
	let failed: unknown = null;
	const guard = (work: Promise<void>) =>
		work.catch((error) => {
			failed ??= error;
			abort.abort(error);
		});
	// Whole segments per page only pay off when they balance: one long segment on one page while
	// the others idle is slower than sharing its frames (measured: 22.6 s against 15.9 s).
	const total = todo.reduce((sum, s) => sum + s.frames, 0);
	const balanced = Math.max(...todo.map((s) => s.frames)) <= (1.5 * total) / opts.jobs;
	const whole =
		opts.schedule === 'segments' ||
		(opts.schedule === 'auto' && todo.length >= opts.jobs && balanced);
	if (whole) {
		const queue = [...todo];
		const worker = async () => {
			for (let s = queue.shift(); s && !failed; s = queue.shift()) await one(s, 1);
		};
		const workers = Math.min(opts.jobs, todo.length);
		await Promise.all(Array.from({ length: workers }, () => guard(worker())));
	} else {
		for (const s of todo) {
			await guard(one(s, opts.jobs));
			if (failed) break;
		}
	}
	if (failed) throw failed;
	return mode;
}

/**
 * Joins the intermediates in order (stream copy through the concat demuxer, no decode between
 * segments) and encodes the result once, with the speech of the cut list when the sources have
 * sound. Encodes beside the target and replaces it only on success.
 */
async function joinAndEncode(
	loaded: LoadedMotionProject,
	program: ResolvedProgram,
	segments: RenderedSegment[],
	file: string
): Promise<'speech' | 'silent'> {
	const list = path.join(
		path.dirname(segments[0].file),
		`.concat-${process.pid}-${Date.now()}.txt`
	);
	const partial = path.join(
		path.dirname(file),
		`.${path.basename(file, '.mp4')}.partial-${process.pid}.mp4`
	);
	await fs.writeFile(
		list,
		segments.map((s) => `file '${s.file.replace(/'/g, "'\\''")}'`).join('\n') + '\n'
	);
	const pieces = program.audio.speech;
	const seconds = program.frames / program.fps;
	try {
		await run([
			'-y',
			'-f',
			'concat',
			'-safe',
			'0',
			'-i',
			list,
			...speechInputs(loaded, pieces, seconds),
			// Number frames by count: timestamps of joined files must not drop or repeat a frame.
			'-vf',
			`setpts=N/(${program.fps}*TB)`,
			'-r',
			String(program.fps),
			// A hard end: padded sound must never keep the encode running past the picture.
			'-t',
			seconds.toFixed(6),
			...H264_FINAL,
			partial
		]);
		await fs.rename(partial, file);
	} finally {
		await fs.rm(list, { force: true });
		await fs.rm(partial, { force: true });
	}
	return pieces.length ? 'speech' : 'silent';
}

/**
 * A stand-in for the program mixer: each speech piece trimmed from its file, faded
 * (equal-power), placed at its program time and summed; silence elsewhere. No music, sound
 * effects or loudness normalisation.
 */
function speechInputs(
	loaded: LoadedMotionProject,
	pieces: AudioPiece[],
	seconds: number
): string[] {
	if (!pieces.length) return ['-map', '0:v'];
	const inputs: string[] = [];
	const chains: string[] = [];
	pieces.forEach((p, i) => {
		const src = path.resolve(loaded.dir, p.file);
		inputs.push('-ss', p.srcIn.toFixed(6), ...(p.dur ? ['-t', p.dur.toFixed(6)] : []), '-i', src);
		const filters = ['aresample=48000', 'aformat=sample_fmts=fltp:channel_layouts=stereo'];
		if (p.fadeIn) filters.push(`afade=t=in:d=${p.fadeIn}:curve=qsin`);
		if (p.fadeOut && p.dur)
			filters.push(`afade=t=out:st=${Math.max(0, p.dur - p.fadeOut)}:d=${p.fadeOut}:curve=qsin`);
		if (p.gain) filters.push(`volume=${p.gain}dB`);
		filters.push(`adelay=${Math.round(p.at * 48000)}S:all=1`);
		chains.push(`[${i + 1}:a]${filters.join(',')}[a${i}]`);
	});
	const mix =
		pieces.map((_, i) => `[a${i}]`).join('') +
		`amix=inputs=${pieces.length}:duration=longest:normalize=0,apad=whole_dur=${seconds}[speech]`;
	return [
		...inputs,
		'-filter_complex',
		[...chains, mix].join(';'),
		'-map',
		'0:v',
		'-map',
		'[speech]',
		'-c:a',
		'aac',
		'-b:a',
		'192k'
	];
}

function run(args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, {
			stdio: ['ignore', 'ignore', 'pipe']
		});
		let err = '';
		p.stderr.on('data', (d) => (err = (err + d).slice(-4000)));
		p.on('error', reject);
		p.on('close', (code) =>
			code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${err.slice(-800)}`))
		);
	});
}
