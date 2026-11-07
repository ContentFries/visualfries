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
import type { ProgramChunk } from './chunks.js';
import { removeOrphans, trackPartial } from './partials.js';
import { STEMS, encodeProgramMix, writeWav, type MixReport, type StemName } from './audio.js';
import { assertProgramRenders, openSegment } from './program-node.js';

/**
 * `render --export video`: the whole program as one video. Each chunk of the grid (see
 * `programChunks`) is drawn part by part on pages of its segments and encoded once, with the
 * settings of every other render, to `.visualfries/segments/`, where it stays as a cache: a
 * later render draws and encodes only chunks whose hash changed. The video is the chunks
 * joined as they are (stream copy) with the program audio: no frame is encoded twice.
 */

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * A chunk's encode: the final video settings, each chunk a file of its own that starts on a
 * keyframe, so chunks join by stream copy. No `+faststart` here: the joined video gets it.
 */
const CHUNK_ENCODE = H264_FINAL.filter(
	(a, i, all) => a !== '-movflags' && all[i - 1] !== '-movflags'
);

/** A chunk of the grid as the render drew or found it. */
export type RenderedChunk = {
	id: string;
	startFrame: number;
	frames: number;
	hash: string;
	/** The parts of segments it is drawn from, in order: each on a page of its segment. */
	parts: ProgramChunk['parts'];
	/** The encoded chunk in the cache. */
	file: string;
	/** True when the chunk came from an earlier render. */
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
	/** Every chunk of the program, in order. */
	chunks: RenderedChunk[];
	/** Seconds for the whole render, and for the final join alone. */
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
	/** Seconds of a chunk; the project's `chunkSeconds` (15 by default) when omitted. */
	chunkSeconds?: number;
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
	 * How pages share the work: `auto` (whole parts of chunks per page when there are at least
	 * as many parts to draw as jobs, none much longer than its share), or always `segments`
	 * (whole parts) or always `frames`. For measurements.
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
	if (opts.chunkSeconds !== undefined && !(opts.chunkSeconds > 0))
		throw new Error(`--chunk-seconds must be a positive number, got ${opts.chunkSeconds}.`);
	const { program } = await motionProgram(loaded, {
		format: opts.format,
		excerpt: opts.excerpt,
		chunkSeconds: opts.chunkSeconds,
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
	await removeOrphans(cacheDir, /\.(?:partial|concat)-(\d+)-[^/]*\.(?:mkv|mp4|txt)$/);
	await removeOrphans(
		path.dirname(file),
		/^\..+\.partial-(\d+)\.(?:mp4|m4a|wav|(?:speech|sfx|music)\.wav)$/
	);
	const engine = await engineHash(opts.invalidate);
	const chunks: RenderedChunk[] = program.chunks.map((c) => {
		const cached = path.join(cacheDir, `${c.hash}-${engine}.mp4`);
		return {
			id: c.id,
			startFrame: c.startFrame,
			frames: c.frames,
			hash: c.hash,
			parts: c.parts,
			file: cached,
			cached: !opts.fresh && existsSync(cached),
			seconds: 0
		};
	});
	const todo = chunks.filter((s) => !s.cached);
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
		for (const s of chunks.filter((x) => x.cached))
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
				mode = await renderChunks(browser, bundle, program, todo, {
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
		await join(program, chunks, file, mix ? audioFile : null);
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
		await pruneChunks(cacheDir, recordName(loaded, opts.excerpt), program.format.name, chunks, t0);
		log(
			`joined ${chunks.length} chunks (${program.frames} frames) in ${encodeSeconds.toFixed(1)} s${mix ? '' : ' (silent)'}`
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
			chunks,
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
 * What a chunk depends on besides its own hash: the VisualFries runtime that draws it (stage,
 * shots, transitions, built-in blocks), the Svelte and GSAP it is bundled with, the bundler, the
 * browser binary, the stage invalidation, the encoder settings and the ffmpeg that encodes.
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
	hash.update(
		JSON.stringify({
			invalidate: invalidate ?? null,
			encode: CHUNK_ENCODE,
			ffmpeg: await ffmpegVersion()
		})
	);
	return hash.digest('hex').slice(0, 12);
}

/**
 * Draws and encodes chunks, part by part (a part: the frames of one segment in one chunk). With
 * at least as many parts as jobs and none much longer than its share, each page takes whole
 * parts (no reorder buffer across pages, every page encodes its own file); otherwise the parts
 * go one after another with their frames spread over `jobs` pages. Each part is encoded on its
 * own, starting on a keyframe, and a chunk's parts are joined into it by stream copy. The first
 * failure, a crashed page included, stops every other page at its next frame.
 */
async function renderChunks(
	browser: BrowserLike,
	bundle: BundleResult,
	program: ResolvedProgram,
	todo: RenderedChunk[],
	opts: {
		jobs: number;
		invalidate?: string;
		schedule: 'auto' | 'segments' | 'frames';
		log: (msg: string) => void;
	}
): Promise<string> {
	const abort = new AbortController();
	let mode = '';
	// Pages of a segment draw its next part too (opening one sets up every clip of the segment);
	// the last part of a segment closes them. At most `jobs` pages are open, closing ones
	// included: at the limit an idle page of another segment closes first, or the page waits
	// for one to close.
	type Page = Awaited<ReturnType<typeof openSegment>>;
	const idle = new Map<string, Page[]>();
	let live = 0;
	let waiting: (() => void)[] = [];
	const wake = () => {
		const w = waiting;
		waiting = [];
		w.forEach((f) => f());
	};
	const left = new Map<string, number>();
	for (const c of todo)
		for (const p of c.parts) left.set(p.segment, (left.get(p.segment) ?? 0) + 1);
	const close = async (page: Page) => {
		try {
			await page.close();
		} finally {
			live--;
			wake();
		}
	};
	const closeIdle = async (segment: string) => {
		const pages = idle.get(segment) ?? [];
		idle.delete(segment);
		await Promise.all(pages.map(close));
	};
	const take = async (segment: ProgramSegment): Promise<Page> => {
		for (;;) {
			const own = idle.get(segment.id)?.pop();
			if (own) return own;
			if (live < opts.jobs) break;
			const other = [...idle.values()].find((pages) => pages.length);
			if (other) await close(other.pop()!);
			else await new Promise<void>((r) => waiting.push(r));
		}
		// Counted before any wait, so pages opening at the same time see each other.
		live++;
		try {
			return await openSegment(browser, bundle, program, segment, {
				invalidate: opts.invalidate
			});
		} catch (error) {
			live--;
			wake();
			throw error;
		}
	};
	/**
	 * A part of a chunk is drawn and encoded on its own, into a file that starts on a keyframe;
	 * when the last part of a chunk is done, the parts are joined by stream copy into the chunk.
	 */
	type Unit = { chunk: RenderedChunk; part: ProgramChunk['parts'][number]; file: string };
	const units: Unit[] = todo.flatMap((c) =>
		c.parts.map((part, k) => ({
			chunk: c,
			part,
			file:
				c.parts.length === 1
					? c.file.replace(/\.mp4$/, `.partial-${process.pid}-${c.id}.mp4`)
					: c.file.replace(/\.mp4$/, `.partial-${process.pid}-${c.id}-${k + 1}.mp4`)
		}))
	);
	const pending = new Map(todo.map((c) => [c.id, c.parts.length]));
	const started = new Map<string, number>();
	const untrack = units.map((u) => trackPartial(u.file));
	const finish = async (c: RenderedChunk) => {
		const own = units.filter((u) => u.chunk === c);
		const files = own.map((u) => u.file);
		if (files.length === 1) await fs.rename(files[0], c.file);
		else {
			const joined = c.file.replace(/\.mp4$/, `.partial-${process.pid}-${c.id}.mp4`);
			const done = trackPartial(joined);
			try {
				await concatCopy(
					own.map((u) => ({ file: u.file, frames: u.part.frames })),
					program.fps,
					joined,
					['-map', '0:v']
				);
				await fs.rename(joined, c.file);
			} finally {
				await fs.rm(joined, { force: true });
				done();
			}
			for (const f of files) await fs.rm(f, { force: true });
		}
		c.seconds = (Date.now() - started.get(c.id)!) / 1000;
		opts.log(
			`${c.id}: frames ${span(c)} rendered in ${c.seconds.toFixed(1)} s (${(c.frames / c.seconds).toFixed(1)} fps)`
		);
	};
	const one = async (u: Unit, pages: number) => {
		const { chunk: c, part } = u;
		if (!started.has(c.id)) started.set(c.id, Date.now());
		const segment = program.segments.find((x) => x.id === part.segment) as ProgramSegment;
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
			...CHUNK_ENCODE,
			u.file
		]);
		const open = async () => {
			const page = await take(segment);
			mode = page.mode;
			return {
				// Pipe frames count from 0; the page takes program frames.
				capture: (i: number) => page.capture(part.startFrame + i),
				close: async () => {
					if (abort.signal.aborted) return close(page);
					idle.set(segment.id, [...(idle.get(segment.id) ?? []), page]);
					wake();
				}
			};
		};
		await pipeFrames(part.frames, Math.min(pages, part.frames), open, sink, {
			signal: abort.signal
		});
		const rest = left.get(part.segment)! - 1;
		left.set(part.segment, rest);
		if (!rest) await closeIdle(part.segment);
		const parts = pending.get(c.id)! - 1;
		pending.set(c.id, parts);
		if (!parts) await finish(c);
	};
	let failed: unknown = null;
	const guard = (work: Promise<void>) =>
		work.catch((error) => {
			failed ??= error;
			abort.abort(error);
		});
	// Whole parts per page only pay off when they balance: one long part on one page while the
	// others idle is slower than sharing its frames (measured: 22.6 s against 15.9 s).
	const total = units.reduce((sum, u) => sum + u.part.frames, 0);
	const balanced = Math.max(...units.map((u) => u.part.frames)) <= (1.5 * total) / opts.jobs;
	const whole =
		opts.schedule === 'segments' ||
		(opts.schedule === 'auto' && units.length >= opts.jobs && balanced);
	try {
		if (whole) {
			const queue = [...units];
			const worker = async () => {
				for (let u = queue.shift(); u && !failed; u = queue.shift()) await one(u, 1);
			};
			const workers = Math.min(opts.jobs, units.length);
			await Promise.all(Array.from({ length: workers }, () => guard(worker())));
		} else {
			for (const u of units) {
				await guard(one(u, opts.jobs));
				if (failed) break;
			}
		}
	} finally {
		await Promise.all([...idle.keys()].map(closeIdle));
		for (const u of units) await fs.rm(u.file, { force: true });
		for (const done of untrack) done();
	}
	if (failed) throw failed;
	return mode;
}

/**
 * Joins the encoded chunks in order by stream copy (the concat demuxer: no decode, no encode)
 * and muxes the encoded program audio (copied as it is). Writes beside the target and replaces
 * it only on success.
 */
async function join(
	program: ResolvedProgram,
	chunks: RenderedChunk[],
	file: string,
	audio: string | null
): Promise<void> {
	const partial = path.join(
		path.dirname(file),
		`.${path.basename(file, '.mp4')}.partial-${process.pid}.mp4`
	);
	const untrack = trackPartial(partial);
	try {
		await concatCopy(
			chunks.map((c) => ({ file: c.file, frames: c.frames })),
			program.fps,
			partial,
			[
				// The audio as encoded and measured before: copied, never encoded twice.
				...(audio ? ['-i', audio, '-map', '0:v', '-map', '1:a'] : ['-map', '0:v']),
				// A hard end: the sound must never run past the picture.
				'-t',
				(program.frames / program.fps).toFixed(6),
				'-movflags',
				'+faststart'
			]
		);
		await fs.rename(partial, file);
	} finally {
		await fs.rm(partial, { force: true });
		untrack();
	}
}

/**
 * Joins encoded files in order into `output` by stream copy (the concat demuxer: no decode, no
 * encode); `args` go between the input and the output (more inputs, mapping, muxer options).
 * Each file's length is given as its frames at `fps`: the length an MP4 states is rounded to
 * the millisecond, and over many short files the rounding would move later frames off their
 * time.
 */
async function concatCopy(
	files: { file: string; frames: number }[],
	fps: number,
	output: string,
	args: string[]
) {
	const list = path.join(
		path.dirname(files[0].file),
		`.concat-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`
	);
	const untrack = trackPartial(list);
	try {
		await fs.writeFile(
			list,
			files
				.map(
					(f) => `file '${f.file.replace(/'/g, "'\\''")}'\nduration ${(f.frames / fps).toFixed(9)}`
				)
				.join('\n') + '\n'
		);
		await run(['-y', '-f', 'concat', '-safe', '0', '-i', list, ...args, '-c', 'copy', output]);
	} finally {
		await fs.rm(list, { force: true });
		untrack();
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
async function pruneChunks(
	cacheDir: string,
	name: string,
	format: string,
	chunks: RenderedChunk[],
	since: number
) {
	await fs.writeFile(
		path.join(cacheDir, `${name}.${format}.json`),
		JSON.stringify({ files: chunks.map((s) => path.basename(s.file)) }, null, 2) + '\n'
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
			// Chunks of earlier versions were lossless .mkv files; they go once no record names them.
			.filter((n) => /^[0-9a-f]{40}-[0-9a-f]{12}\.(?:mkv|mp4)$/.test(n) && !used.has(n))
			.map(async (n) => {
				const st = await fs.stat(path.join(cacheDir, n)).catch(() => null);
				if (st && st.mtimeMs < since - MTIME_SLACK)
					await fs.rm(path.join(cacheDir, n), { force: true });
			})
	);
}

const ffmpegIds = new Map<string, Promise<string>>();
/**
 * The ffmpeg that encodes, by path and the first line of `ffmpeg -version`: another build may
 * encode the same frames differently.
 */
function ffmpegVersion(): Promise<string> {
	const bin = process.env.FFMPEG_PATH || 'ffmpeg';
	const known = ffmpegIds.get(bin);
	if (known) return known;
	const id = new Promise<string>((resolve) => {
		const p = spawn(bin, ['-version'], {
			stdio: ['ignore', 'pipe', 'ignore']
		});
		let out = '';
		p.stdout.on('data', (d) => (out += d));
		p.on('error', () => resolve(`${bin}:-`));
		p.on('close', () => resolve(`${bin}:${out.split('\n')[0] || '-'}`));
	});
	ffmpegIds.set(bin, id);
	return id;
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
