import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
import { CLEAN_DEFAULTS, CLEAN_VERSION, cleanPlate, defaultGrow } from './clean-plate.js';
import type { FrameRange } from './footage-map.js';

/**
 * Clean plates in Node: every frame of an extracted footage range with the subject removed (see
 * `clean-plate.ts`), written as JPEGs next to the range's plates, once. The footage and its matte
 * are decoded straight from their files with the same filters as the plates and cut-outs, so
 * clean frame n belongs to plate n; the frames are cleaned on worker threads and cached under a
 * key of the method and its settings (the range folder itself is keyed by the source and matte).
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** How a footage's clean plate is made (`footage.<name>.clean` in the project). */
export type CleanSpec = {
	/** A still of the empty background (absolute path): the hole shows it. Default: filled. */
	image?: string;
	/** Pixels the hole grows past the matte's soft edge. Default about 1.1 % of the short side. */
	grow?: number;
};

export type CleanSource = {
	name: string;
	src: string;
	matte: string;
	width: number;
	height: number;
	/** Same rate as the project: seek straight to the range (see `extractFootageRange`). */
	direct: boolean;
};

/** Folder name of the clean frames of a range for `spec` (its settings and the image file). */
export async function cleanFolder(spec: CleanSpec, size: [number, number]): Promise<string> {
	const image = spec.image
		? await fs.stat(spec.image).then(
				(st) => [spec.image, st.size, st.mtimeMs],
				() => {
					throw new Error(`Clean plate image not found: ${spec.image}`);
				}
			)
		: null;
	const key = createHash('sha1')
		.update(
			JSON.stringify({
				version: CLEAN_VERSION,
				threshold: CLEAN_DEFAULTS.threshold,
				grow: spec.grow ?? defaultGrow(size[0], size[1]),
				image
			})
		)
		.digest('hex')
		.slice(0, 12);
	return `clean-${key}`;
}

/** What one range's clean plates cost. */
export type CleanReport = { frames: number; seconds: number; cached: boolean; full: number[] };

/**
 * Cleans frames `range` of `source` into `<dir>/<folder>/` (JPEG, numbered like the plates),
 * unless they are there. `full` lists frames whose matte covers the whole picture: nothing is
 * left to fill from, so they keep the footage (`check` reports them).
 */
export async function buildCleanRange(
	dir: string,
	folder: string,
	source: CleanSource,
	spec: CleanSpec,
	fps: number,
	range: FrameRange,
	opts: { jobs?: number } = {}
): Promise<CleanReport> {
	const target = path.join(dir, folder);
	const doneFile = path.join(target, 'done.json');
	if (existsSync(doneFile)) {
		const done = JSON.parse(await fs.readFile(doneFile, 'utf8'));
		return { frames: done.frames, seconds: 0, cached: true, full: done.full ?? [] };
	}
	const started = Date.now();
	const { width: w, height: h, direct } = source;
	const count = range.last - range.first + 1;
	const seek = direct ? ['-ss', (range.first / fps).toFixed(6)] : [];
	const pick = direct
		? `fps=${fps}`
		: `fps=${fps},trim=start_frame=${range.first}:end_frame=${range.last + 1},setpts=PTS-STARTPTS`;
	const image = spec.image ? await decodeImage(spec.image, w, h) : null;
	const tmp = `${target}.tmp-${process.pid}-${randomUUID()}`;
	await fs.mkdir(tmp, { recursive: true });
	const procs: ChildProcess[] = [];
	const pool = new CleanPool(
		opts.jobs ?? Math.max(1, Math.min(8, os.cpus().length - 1)),
		spec.grow,
		image
	);
	try {
		const picture = decoder(
			[...seek, '-i', source.src, '-vf', pick, '-frames:v', String(count)],
			'rgb24',
			procs
		);
		const matte = decoder(
			[
				'-i',
				source.matte,
				'-vf',
				// As the cut-outs: decoded from its start and padded before it is cut, so a matte a
				// frame or two short holds its last frame.
				`fps=${fps},scale=${w}:${h},format=gray,tpad=stop_mode=clone:stop_duration=2,trim=start_frame=${range.first}:end_frame=${range.last + 1},setpts=PTS-STARTPTS`,
				'-frames:v',
				String(count)
			],
			'gray',
			procs
		);
		const encoder = spawn(
			process.env.FFMPEG_PATH || 'ffmpeg',
			[
				'-y',
				'-loglevel',
				'error',
				'-f',
				'rawvideo',
				'-pix_fmt',
				'rgb24',
				'-s',
				`${w}x${h}`,
				'-framerate',
				String(fps),
				'-i',
				'pipe:0',
				'-start_number',
				String(range.first),
				'-q:v',
				'2',
				path.join(tmp, '%06d.jpg')
			],
			{ stdio: ['pipe', 'ignore', 'pipe'] }
		);
		procs.push(encoder);
		const encoded = exited(encoder, 'Clean plate encoder');
		// An encoder that dies mid-range fails the build at once: its exit is watched from the
		// start, a broken pipe is not an uncaught error, and a write waiting to drain gives up.
		let stopped: unknown = null;
		encoded.catch((error) => (stopped ??= error));
		encoder.stdin!.on('error', (error) => (stopped ??= error));
		const pictures = frames(picture, w * h * 3);
		const mattes = frames(matte, w * h);
		const full: number[] = [];
		// Frames go to the workers in order and come back in order; a few are in flight at once.
		const inFlight: Promise<{ rgb: Uint8Array; full: boolean }>[] = [];
		let n = 0;
		const write = async (job: Promise<{ rgb: Uint8Array; full: boolean }>) => {
			const done = await job;
			if (stopped) throw stopped;
			// With a picture of the empty scene, a frame the matte covers still gets a plate.
			if (done.full && !spec.image) full.push(range.first + n);
			n++;
			if (!encoder.stdin!.write(done.rgb))
				await Promise.race([
					new Promise((r) => encoder.stdin!.once('drain', r)),
					encoded.then(() => {
						throw new Error('Clean plate encoder ended before every frame was written.');
					})
				]);
		};
		for (;;) {
			const [rgb, gray] = await Promise.all([pictures.next(), mattes.next()]);
			if (rgb.done || gray.done) break;
			inFlight.push(pool.run(rgb.value, gray.value, w, h));
			if (inFlight.length >= pool.size * 2) await write(inFlight.shift()!);
		}
		while (inFlight.length) await write(inFlight.shift()!);
		if (stopped) throw stopped;
		encoder.stdin!.end();
		await encoded;
		const written = (await fs.readdir(tmp)).filter((f) => f.endsWith('.jpg')).length;
		if (written !== count)
			throw new Error(
				`Footage "${source.name}": ${written} clean plate frames for frames ${range.first}–${range.last}; the footage or its matte ends early.`
			);
		await fs.writeFile(path.join(tmp, 'done.json'), JSON.stringify({ frames: written, full }));
		await fs.rename(tmp, target).catch(async (error) => {
			if (!existsSync(doneFile)) throw error;
		});
		return { frames: written, seconds: (Date.now() - started) / 1000, cached: false, full };
	} finally {
		for (const p of procs) if (p.exitCode === null) p.kill('SIGKILL');
		await pool.close();
		await fs.rm(tmp, { recursive: true, force: true });
	}
}

/** An ffmpeg process decoding to raw frames of `format` on its stdout. */
function decoder(args: string[], format: 'rgb24' | 'gray', procs: ChildProcess[]): ChildProcess {
	const p = spawn(
		process.env.FFMPEG_PATH || 'ffmpeg',
		['-loglevel', 'error', ...args, '-f', 'rawvideo', '-pix_fmt', format, 'pipe:1'],
		{ stdio: ['ignore', 'pipe', 'pipe'] }
	);
	procs.push(p);
	let err = '';
	p.stderr!.on('data', (d) => (err += d));
	p.on('close', (code) => {
		if (code) p.stdout!.destroy(new Error(`ffmpeg failed (${code}): ${err.slice(-400)}`));
	});
	return p;
}

/** Whole frames of `size` bytes from a process's stdout, each copied once into its own array. */
async function* frames(p: ChildProcess, size: number): AsyncGenerator<Uint8Array> {
	let frame = new Uint8Array(size);
	let filled = 0;
	for await (const chunk of p.stdout!) {
		let data = chunk as Buffer;
		while (data.length) {
			const take = Math.min(size - filled, data.length);
			frame.set(data.subarray(0, take), filled);
			filled += take;
			data = data.subarray(take);
			if (filled === size) {
				yield frame;
				frame = new Uint8Array(size);
				filled = 0;
			}
		}
	}
}

function exited(p: ChildProcess, label: string): Promise<void> {
	let err = '';
	p.stderr?.on('data', (d) => (err += d));
	return new Promise((resolve, reject) => {
		p.on('error', reject);
		p.on('close', (code) =>
			code === 0 ? resolve() : reject(new Error(`${label} failed (${code}): ${err.slice(-400)}`))
		);
	});
}

/** A picture scaled to cover `w` × `h` and cropped to it, as RGB. */
async function decodeImage(file: string, w: number, h: number): Promise<Uint8Array> {
	const p = spawn(
		process.env.FFMPEG_PATH || 'ffmpeg',
		[
			'-loglevel',
			'error',
			'-i',
			file,
			'-vf',
			`scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
			'-frames:v',
			'1',
			'-f',
			'rawvideo',
			'-pix_fmt',
			'rgb24',
			'pipe:1'
		],
		{ stdio: ['ignore', 'pipe', 'pipe'] }
	);
	const chunks: Buffer[] = [];
	p.stdout!.on('data', (d) => chunks.push(d));
	await exited(p, `Decoding clean plate image ${file}`);
	const out = Buffer.concat(chunks);
	if (out.length !== w * h * 3) throw new Error(`Clean plate image ${file} could not be decoded.`);
	return new Uint8Array(out);
}

/** The clean-plate module as workers import it: .js in the package, .ts in the sources. */
const cleanModule = () =>
	pathToFileURL(
		existsSync(path.join(HERE, 'clean-plate.js'))
			? path.join(HERE, 'clean-plate.js')
			: path.join(HERE, 'clean-plate.ts')
	).href;

const WORKER = `
const { parentPort, workerData } = require('node:worker_threads');
import(workerData.module).then(({ cleanPlate }) => {
	const { grow, image } = workerData;
	parentPort.on('message', ({ id, rgb, matte, w, h }) => {
		const out = cleanPlate(rgb, matte, w, h, { grow, image });
		let full = true;
		for (let i = 0; i < matte.length && full; i++) if (matte[i] < 6) full = false;
		parentPort.postMessage({ id, rgb: out, full }, [out.buffer]);
	});
	parentPort.postMessage({ ready: true });
});
`;

/** Worker threads cleaning one frame each; `size` 1 cleans on the main thread. */
class CleanPool {
	readonly size: number;
	#workers: { worker: Worker; ready: Promise<void>; busy: number }[] = [];
	#next = 0;
	#pending = new Map<
		number,
		{ resolve: (v: { rgb: Uint8Array; full: boolean }) => void; reject: (e: Error) => void }
	>();

	readonly #grow: number | undefined;
	readonly #image: Uint8Array | null;

	constructor(size: number, grow: number | undefined, image: Uint8Array | null) {
		this.size = size;
		this.#grow = grow;
		this.#image = image;
		if (size <= 1) return;
		for (let i = 0; i < size; i++) {
			const worker = new Worker(WORKER, {
				eval: true,
				workerData: { module: cleanModule(), grow, image }
			});
			const ready = new Promise<void>((resolve, reject) => {
				worker.once('error', reject);
				const first = (m: { ready?: boolean }) => {
					if (!m.ready) return;
					worker.off('message', first);
					resolve();
				};
				worker.on('message', first);
			});
			worker.on('message', (m: { id?: number; rgb: Uint8Array; full: boolean }) => {
				if (m.id === undefined) return;
				const p = this.#pending.get(m.id);
				this.#pending.delete(m.id);
				slot.busy--;
				p?.resolve({ rgb: m.rgb, full: m.full });
			});
			worker.on('error', (error) => {
				for (const p of this.#pending.values()) p.reject(error);
				this.#pending.clear();
			});
			const slot = { worker, ready, busy: 0 };
			this.#workers.push(slot);
		}
	}

	async run(
		rgb: Uint8Array,
		matte: Uint8Array,
		w: number,
		h: number
	): Promise<{ rgb: Uint8Array; full: boolean }> {
		if (!this.#workers.length) {
			const full = !matte.some((v) => v < CLEAN_DEFAULTS.threshold);
			return { rgb: cleanPlate(rgb, matte, w, h, { grow: this.#grow, image: this.#image }), full };
		}
		const slot = this.#workers.reduce((a, b) => (b.busy < a.busy ? b : a));
		await slot.ready;
		slot.busy++;
		const id = this.#next++;
		return new Promise((resolve, reject) => {
			this.#pending.set(id, { resolve, reject });
			slot.worker.postMessage({ id, rgb, matte, w, h }, [
				rgb.buffer as ArrayBuffer,
				matte.buffer as ArrayBuffer
			]);
		});
	}

	async close() {
		await Promise.all(this.#workers.map((s) => s.worker.terminate()));
	}
}
