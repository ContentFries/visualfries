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
	chromiumExecutable,
	ffmpegFramePipe,
	launch,
	motionProgram,
	pipeFrames,
	type BrowserLike,
	type BundleResult,
	type LoadedMotionProject
} from './node.js';
import type { ProgramSegment, ResolvedProgram } from './program.js';
import { removeOrphans, trackPartial } from './partials.js';
import { STEMS, encodeProgramMix, writeWav, type MixReport, type StemName } from './audio.js';
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
	/** `mixed`: speech, effects and music, normalised; `silent`: the program has no sound. */
	audio: 'mixed' | 'silent';
	/** Levels and loudness of the mix; null when silent. */
	mix: MixReport | null;
	/** With `stems`: the WAV file of each stem beside the video. */
	stems: Record<StemName, string> | null;
	mode: string;
	segments: RenderedSegment[];
	/** Seconds for the whole render, and for the final join and encode alone. */
	seconds: number;
	encodeSeconds: number;
};

export type ProgramRenderOptions = {
	/**
	 * A `.mp4` file, or a directory that gets `<project name>[.<format>].mp4`
	 * (`<project name>.<excerpt>[.<format>].mp4` for an excerpt).
	 */
	output: string;
	/** `WIDTHxHEIGHT`; the project size (an excerpt's own format) when omitted. */
	format?: string;
	/** An excerpt's id: that range of the program, sliced from the whole (see `excerpt.ts`). */
	excerpt?: string;
	jobs?: number;
	invalidate?: string;
	/** Draw every segment again, replacing what the cache holds. */
	fresh?: boolean;
	/**
	 * Also write the stems beside the video (`<name>.speech.wav`, `.sfx.wav`, `.music.wav`):
	 * 48 kHz 32-bit float, with the master gain and limiter applied, so they add up to the mix
	 * before encoding (within about 1e-5). Without it, stems of that name are removed.
	 */
	stems?: boolean;
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
	const { program } = await motionProgram(loaded, {
		format: opts.format,
		excerpt: opts.excerpt,
		write: true
	});
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
	// Left by a render that was killed before it could clean up.
	await removeOrphans(cacheDir, /\.(?:partial|concat)-(\d+)-[^/]*\.(?:mkv|txt)$/);
	await removeOrphans(
		path.dirname(file),
		/^\..+\.partial-(\d+)\.(?:mp4|m4a|wav|(?:speech|sfx|music)\.wav)$/
	);
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

	// Sound first: a missing or unreadable sound file fails the render before any picture is
	// drawn. The encoded audio and the stems wait in partial files beside the target.
	const partial = path.join(
		path.dirname(file),
		`.${path.basename(file, '.mp4')}.partial-${process.pid}`
	);
	const audioFile = `${partial}.m4a`;
	const stemFile = (stem: StemName) => `${partial}.${stem}.wav`;
	const temporary = [audioFile, `${partial}.wav`, ...STEMS.map(stemFile)];
	const untrack = temporary.map(trackPartial);
	try {
		const tMix = Date.now();
		const mixed = await encodeProgramMix(program, {
			dir: loaded.dir,
			stems: opts.stems,
			wav: `${partial}.wav`,
			output: audioFile
		});
		const mix = mixed?.report ?? null;
		if (mixed?.stems) for (const stem of STEMS) await writeWav(stemFile(stem), mixed.stems[stem]);
		if (mix) {
			const d = mix.delivered!;
			log(
				`mix in ${((Date.now() - tMix) / 1000).toFixed(1)} s: speech ${mix.speech ?? '–'} LUFS, delivered ${d.lufs} LUFS and ${d.truePeak} dBTP after ${mix.gain} dB${mix.limiter ? ` (limiter ${mix.limiter} dB)` : ''}`
			);
			for (const warning of mix.warnings) log(`warning: ${warning}`);
		}
		return await renderPictures(mix);
	} finally {
		for (const f of temporary) await fs.rm(f, { force: true });
		for (const done of untrack) done();
	}

	async function renderPictures(mix: MixReport | null): Promise<RenderedProgram> {
		for (const s of segments.filter((x) => x.cached))
			log(`${s.id}: frames ${span(s)} cached (${s.hash.slice(0, 12)})`);

		let mode = 'cached';
		if (todo.length) {
			const bundle = await bundleMotionProject(
				loaded,
				program.clips,
				opts.excerpt === undefined ? undefined : program
			);
			for (const message of bundle.footage.warnings ?? []) log(`warning: ${message}`);
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
		await joinAndEncode(program, segments, file, mix ? audioFile : null);
		const encodeSeconds = (Date.now() - t1) / 1000;
		// Stems beside the video replace earlier ones; without --stems earlier ones are removed, as
		// they no longer match the video.
		let stems: RenderedProgram['stems'] = null;
		if (mix && opts.stems) stems = {} as Record<StemName, string>;
		for (const stem of STEMS) {
			const target = file.replace(/\.mp4$/i, `.${stem}.wav`);
			if (stems) {
				await fs.rename(stemFile(stem), target);
				stems[stem] = target;
			} else await fs.rm(target, { force: true });
		}
		await fs.writeFile(sidecar, resolved);
		await pruneSegments(
			cacheDir,
			recordName(loaded, opts.excerpt),
			program.format.name,
			segments,
			t0
		);
		log(
			`final encode: ${program.frames} frames in ${encodeSeconds.toFixed(1)} s${mix ? '' : ' (silent)'}`
		);
		return {
			file,
			program: sidecar,
			format: program.format.name,
			fps: program.fps,
			frames: program.frames,
			audio: mix ? 'mixed' : 'silent',
			mix,
			stems,
			mode,
			segments,
			seconds: (Date.now() - t0) / 1000,
			encodeSeconds
		};
	}
}

const span = (s: { startFrame: number; frames: number }) =>
	`${s.startFrame}–${s.startFrame + s.frames - 1}`;

function outputFile(loaded: LoadedMotionProject, opts: ProgramRenderOptions): string {
	if (/\.mp4$/i.test(opts.output)) return path.resolve(opts.output);
	if (path.extname(opts.output))
		throw new Error(
			`--output ${opts.output}: a program renders an .mp4; name one, or a directory.`
		);
	return path.resolve(
		opts.output,
		`${recordName(loaded, opts.excerpt)}${opts.format ? `.${opts.format}` : ''}.mp4`
	);
}

/** The project's name, and the excerpt's id after it: `<project>[.<excerpt>]`. */
const recordName = (loaded: LoadedMotionProject, excerpt?: string) =>
	`${path.basename(loaded.file).replace(/(\.vf)?\.json$/i, '')}${excerpt ? `.${excerpt}` : ''}`;

/**
 * What the pixels of a segment depend on besides its own hash: the VisualFries runtime that
 * draws it (stage, shots, transitions, built-in blocks), the Svelte and GSAP it is bundled with,
 * the bundler, the browser binary, the stage invalidation and the intermediate encoding.
 */
async function engineHash(invalidate?: string): Promise<string> {
	const hash = createHash('sha1');
	const files = (await fs.readdir(HERE, { recursive: true }))
		.filter((f) => /\.(js|ts|svelte|css)$/.test(f) && !f.endsWith('.d.ts'))
		.sort();
	for (const f of files) hash.update(f).update(await fs.readFile(path.join(HERE, f)));
	for (const pkg of ['svelte', 'gsap', 'playwright', 'esbuild']) {
		try {
			hash.update(`${pkg}@${require(`${pkg}/package.json`).version}`);
		} catch {
			hash.update(`${pkg}@-`);
		}
	}
	// The binary pages really run in (a system Chromium or Playwright's own build).
	const chromium = await chromiumExecutable();
	if (chromium) {
		const st = statSync(chromium);
		hash.update(`${chromium}:${st.size}:${st.mtimeMs}`);
	} else hash.update('chromium:-');
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
		const untrack = trackPartial(partial);
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
			untrack();
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
 * segments) and encodes the result once, with the encoded program audio when there is one
 * (copied as it is). Encodes beside the target and replaces it only on success.
 */
async function joinAndEncode(
	program: ResolvedProgram,
	segments: RenderedSegment[],
	file: string,
	audio: string | null
): Promise<void> {
	const list = path.join(
		path.dirname(segments[0].file),
		`.concat-${process.pid}-${Date.now()}.txt`
	);
	const partial = path.join(
		path.dirname(file),
		`.${path.basename(file, '.mp4')}.partial-${process.pid}.mp4`
	);
	const untrack = [trackPartial(list), trackPartial(partial)];
	await fs.writeFile(
		list,
		segments.map((s) => `file '${s.file.replace(/'/g, "'\\''")}'`).join('\n') + '\n'
	);
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
			// The audio as encoded and measured before: copied, never encoded twice.
			...(audio ? ['-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'copy'] : ['-map', '0:v']),
			// Number frames by count: timestamps of joined files must not drop or repeat a frame.
			'-vf',
			`setpts=N/(${program.fps}*TB)`,
			'-r',
			String(program.fps),
			// A hard end: the sound must never keep the encode running past the picture.
			'-t',
			seconds.toFixed(6),
			...H264_FINAL,
			partial
		]);
		await fs.rename(partial, file);
	} finally {
		await fs.rm(list, { force: true });
		await fs.rm(partial, { force: true });
		for (const done of untrack) done();
	}
}

// ---------------------------------------------------------------- cache housekeeping

/** Milliseconds a file time may lag the clock it is compared with (see `pruneSegments`). */
const MTIME_SLACK = 100;

/**
 * Keeps the intermediates some render of a project in this folder still uses. Each project (and
 * each of its excerpts) and format records the files of its latest render
 * (`<project>[.<excerpt>].<format>.json`); an intermediate no
 * record names (an edited segment, an older engine) is removed, unless it is newer than this
 * render's start (another render in the folder may still be writing its record). File times
 * come from a coarse kernel clock, up to a few milliseconds behind `Date.now()`: a file written
 * right after the start can look older than it, so "newer" allows `MTIME_SLACK` of that.
 */
async function pruneSegments(
	cacheDir: string,
	name: string,
	format: string,
	segments: RenderedSegment[],
	since: number
) {
	await fs.writeFile(
		path.join(cacheDir, `${name}.${format}.json`),
		JSON.stringify({ files: segments.map((s) => path.basename(s.file)) }, null, 2) + '\n'
	);
	const names = await fs.readdir(cacheDir);
	const used = new Set<string>();
	for (const record of names.filter((n) => n.endsWith('.json'))) {
		try {
			const { files } = JSON.parse(await fs.readFile(path.join(cacheDir, record), 'utf8'));
			for (const f of files ?? []) used.add(f);
		} catch {
			// A record being written by another render: keep everything this round.
			return;
		}
	}
	await Promise.all(
		names
			.filter((n) => /^[0-9a-f]{40}-[0-9a-f]{12}\.mkv$/.test(n) && !used.has(n))
			.map(async (n) => {
				const st = await fs.stat(path.join(cacheDir, n)).catch(() => null);
				if (st && st.mtimeMs < since - MTIME_SLACK)
					await fs.rm(path.join(cacheDir, n), { force: true });
			})
	);
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
