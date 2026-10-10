import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { findChromium } from './node.js';
import type { MatteChunk, MatteProvider } from './matte.js';

// MediaPipe Image Segmenter (selfie segmentation) run locally: the WASM build of
// @mediapipe/tasks-vision inside the headless Chromium that VisualFries already renders with.
// Frames stream to the page over a loopback HTTP server and the masks come back the same way,
// so nothing goes through the DevTools protocol and no Python is involved.

export type MediaPipeModel = 'selfie' | 'selfie-landscape';

type ModelEntry = {
	file: string;
	url: string;
	sha256: string;
	/** Input size of the network; frames are scaled to it before they reach the page. */
	width: number;
	height: number;
};

/** Apache-2.0 models published by Google; pinned to version 1 and checked by hash. */
export const MEDIAPIPE_MODELS: Record<MediaPipeModel, ModelEntry> = {
	selfie: {
		file: 'selfie_segmenter.tflite',
		url: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite',
		sha256: '191ac9529ae506ee0beefa6b2c945a172dab9d07d1e802a290a4e4038226658b',
		width: 256,
		height: 256
	},
	'selfie-landscape': {
		file: 'selfie_segmenter_landscape.tflite',
		url: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/1/selfie_segmenter_landscape.tflite',
		sha256: '490e9ea734313e0de10fa0cd9e3c6133e36ea4db2b7a49bde9ef019f72796b8e',
		width: 256,
		height: 144
	}
};

const DOWNLOAD_TIMEOUT_MS = 60 * 1000;
/** A page that sends nothing for this long has stalled. */
const STALL_TIMEOUT_MS = 2 * 60 * 1000;
/**
 * Mean change of the mask (0–1) above which smoothing restarts. A talking head moving fast
 * changes about 0.015 between frames, a jump cut 0.09.
 */
const CUT_CHANGE = 0.025;
/** Masks the page collects before it posts them. */
const MASK_BATCH = 30;

/** `$VISUALFRIES_CACHE_DIR`, else the platform cache folder, plus `visualfries`. */
export function visualfriesCacheDir(): string {
	if (process.env.VISUALFRIES_CACHE_DIR) return process.env.VISUALFRIES_CACHE_DIR;
	const base =
		process.platform === 'win32'
			? process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
			: process.platform === 'darwin'
				? path.join(os.homedir(), 'Library', 'Caches')
				: process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache');
	return path.join(base, 'visualfries');
}

const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');

/**
 * Path of a model file in `dir`, downloaded on first use. A cached file is used only when its
 * hash matches; a download is checked before it replaces anything.
 */
export async function ensureModelFile(
	entry: Pick<ModelEntry, 'file' | 'url' | 'sha256'>,
	dir: string,
	doFetch: typeof fetch = fetch
): Promise<string> {
	const file = path.join(dir, entry.file);
	try {
		if (sha256(await fs.readFile(file)) === entry.sha256) return file;
	} catch {
		// not cached yet
	}
	let bytes: Uint8Array;
	try {
		const response = await doFetch(entry.url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		bytes = new Uint8Array(await response.arrayBuffer());
	} catch (error) {
		throw new Error(
			`Could not download the MediaPipe model from ${entry.url} (${(error as Error).message}). ` +
				`It is downloaded once and cached. Offline, download it on another machine and save it as ${file} ` +
				`(or point VISUALFRIES_CACHE_DIR at a folder with models/${entry.file}).`
		);
	}
	const got = sha256(bytes);
	if (got !== entry.sha256)
		throw new Error(
			`The MediaPipe model downloaded from ${entry.url} has SHA-256 ${got}, expected ${entry.sha256}. Not using it.`
		);
	await fs.mkdir(dir, { recursive: true });
	const temp = `${file}.${process.pid}.${randomUUID()}.part`;
	await fs.writeFile(temp, bytes);
	await fs.rename(temp, file);
	return file;
}

/** Folder of the installed @mediapipe/tasks-vision package. */
function tasksVisionDir(): string {
	for (const from of [import.meta.url, path.join(process.cwd(), 'package.json')]) {
		try {
			return path.dirname(createRequire(from).resolve('@mediapipe/tasks-vision'));
		} catch {
			// try the next place
		}
	}
	throw new Error(
		'The MediaPipe matte needs @mediapipe/tasks-vision. Install it with `npm install @mediapipe/tasks-vision` (an optional peer dependency, like playwright).'
	);
}

/** Picks the network whose input shape is closer to the video's. */
export function pickMediaPipeModel(width: number, height: number): MediaPipeModel {
	// 4:3 is the geometric middle between the square and the 16:9 landscape network.
	return width / height > 4 / 3 ? 'selfie-landscape' : 'selfie';
}

/**
 * MediaPipe selfie segmentation, free and local: no key, no Python. Runs the
 * `@mediapipe/tasks-vision` WASM build (optional peer dependency) in headless Chromium through
 * Playwright, about 70 frames per second per piece on one CPU core. The model (≈250 KB,
 * Apache-2.0) is downloaded once into `cacheDir`. Edges are softer than BiRefNet's and hair
 * is rougher, which suits small cut-outs and picture-in-picture.
 *
 *   mediapipeMatte({ model: 'selfie', smoothing: 0.5 })
 */
export function mediapipeMatte(
	opts: {
		/**
		 * `selfie` (256×256 network) or `selfie-landscape` (256×144, faster, for wide video).
		 * Default: whichever matches the video's shape.
		 */
		model?: MediaPipeModel | 'auto';
		/**
		 * Blends each mask with the previous one to calm flickering edges: 0 = off, 0.5 by
		 * default (halves the edge flicker on a talking head); above 0.7 fast moves leave a
		 * trail. Restarts at every piece.
		 */
		smoothing?: number;
		/** Pieces running at once, each in its own browser. Default: a third of the CPU cores, 1–4. */
		parallel?: number;
		/** Where downloaded models are kept. Default: `visualfriesCacheDir()`. */
		cacheDir?: string;
		/** Injected in tests. */
		fetch?: typeof fetch;
	} = {}
): MatteProvider {
	const choice = opts.model ?? 'auto';
	if (choice !== 'auto' && !Object.prototype.hasOwnProperty.call(MEDIAPIPE_MODELS, choice))
		throw new Error(
			`Unknown MediaPipe model "${choice}". Use ${Object.keys(MEDIAPIPE_MODELS).join(', ')} or auto.`
		);
	const smoothing = opts.smoothing ?? 0.5;
	if (!(smoothing >= 0 && smoothing < 1))
		throw new Error(`MediaPipe smoothing must be at least 0 and below 1, got ${smoothing}.`);
	const cores = os.availableParallelism?.() ?? os.cpus().length;
	const parallel = opts.parallel ?? Math.max(1, Math.min(4, Math.floor(cores / 3)));
	const cacheDir = path.join(opts.cacheDir ?? visualfriesCacheDir(), 'models');
	const models = new Map<MediaPipeModel, Promise<string>>();
	const modelFile = (model: MediaPipeModel) => {
		let file = models.get(model);
		if (!file) {
			file = ensureModelFile(MEDIAPIPE_MODELS[model], cacheDir, opts.fetch);
			// A failed download is retried by the next piece instead of being remembered.
			file.catch(() => models.delete(model));
			models.set(model, file);
		}
		return file;
	};
	return {
		name: `MediaPipe selfie segmenter (${choice === 'auto' ? 'auto' : choice}, local)`,
		maxFrames: Number.POSITIVE_INFINITY,
		parallel,
		output: 'luma',
		async segment(chunk) {
			const model = choice === 'auto' ? pickMediaPipeModel(chunk.width, chunk.height) : choice;
			const tasks = tasksVisionDir();
			await segmentWithMediaPipe(chunk, {
				model: MEDIAPIPE_MODELS[model],
				modelFile: await modelFile(model),
				tasks,
				smoothing
			});
		}
	};
}

// ---------------------------------------------------------------- page

/**
 * Runs in the page. Reads RGBA frames from `frames`, segments them in order (VIDEO mode),
 * smooths the person confidence over time and posts 8-bit masks to `masks`.
 */
const PAGE_SCRIPT = `
const base = new URL('./', location.href).href;
const post = (name, body) => fetch(base + name, { method: 'POST', body });
const fail = (error) => post('error', String((error && error.stack) || error));
addEventListener('error', (e) => fail(e.error || e.message));
addEventListener('unhandledrejection', (e) => fail(e.reason));
try {
	const { width, height, fps, smoothing, cut, batch } = await (await fetch(base + 'config.json')).json();
	const { FilesetResolver, ImageSegmenter } = await import(base + 'tasks/vision_bundle.mjs');
	const fileset = await FilesetResolver.forVisionTasks(base + 'tasks/wasm');
	const segmenter = await ImageSegmenter.createFromOptions(fileset, {
		baseOptions: { modelAssetPath: base + 'model.tflite', delegate: 'CPU' },
		runningMode: 'VIDEO',
		outputConfidenceMasks: true,
		outputCategoryMask: false
	});
	const size = width * height * 4;
	const pixels = new Uint8ClampedArray(size);
	const image = new ImageData(pixels, width, height);
	let fill = 0;
	let frames = 0;
	let previous = null;
	let masks = [];
	const send = async () => {
		if (!masks.length) return;
		const response = await post('masks', new Blob(masks));
		masks = [];
		if (!response.ok) throw new Error('Mask upload failed: ' + response.status);
	};
	const segment = () => {
		const before = masks.length;
		segmenter.segmentForVideo(image, (frames * 1000) / fps, (result) => {
			const confidence = result.confidenceMasks[0].getAsFloat32Array();
			if (confidence.length !== width * height)
				throw new Error('Mask has ' + confidence.length + ' pixels, expected ' + width * height);
			let change = 0;
			if (previous) {
				for (let i = 0; i < confidence.length; i++) change += Math.abs(confidence[i] - previous[i]);
				change /= confidence.length;
			}
			// A cut (or a jump in the edit) starts over instead of fading out the old outline.
			if (!previous || change > cut) previous = Float32Array.from(confidence);
			else
				for (let i = 0; i < confidence.length; i++)
					previous[i] = smoothing * previous[i] + (1 - smoothing) * confidence[i];
			const mask = new Uint8ClampedArray(confidence.length);
			for (let i = 0; i < mask.length; i++) mask[i] = previous[i] * 255;
			masks.push(mask);
		});
		// The CPU delegate calls back before segmentForVideo returns; masks must stay in order.
		if (masks.length !== before + 1) throw new Error('MediaPipe returned no mask for frame ' + frames);
		frames++;
	};
	const reader = (await fetch(base + 'frames')).body.getReader();
	for (;;) {
		const { value, done } = await reader.read();
		if (done) break;
		for (let offset = 0; offset < value.length; ) {
			const take = Math.min(size - fill, value.length - offset);
			pixels.set(value.subarray(offset, offset + take), fill);
			fill += take;
			offset += take;
			if (fill === size) {
				segment();
				fill = 0;
				if (masks.length >= batch) await send();
			}
		}
	}
	await send();
	segmenter.close();
	await post('done', JSON.stringify({ frames, leftover: fill }));
} catch (error) {
	await fail(error);
}
`;

const PAGE_HTML =
	'<!doctype html><meta charset="utf-8"><script type="module" src="run.js"></script>';
const WASM_FILE = /^vision_wasm(_nosimd)?_internal\.(js|wasm)$/;

type Launched = { newPage(): Promise<PageLike>; close(): Promise<void> };
type PageLike = {
	goto(url: string): Promise<unknown>;
	on(event: 'pageerror' | 'crash', fn: (e: unknown) => void): void;
};

async function launchChromium(): Promise<Launched> {
	let chromium: { launch(opts: object): Promise<unknown> };
	try {
		({ chromium } = await import('playwright'));
	} catch {
		throw new Error(
			'The MediaPipe matte runs in headless Chromium and needs playwright. Install it with `npm install playwright` (an optional peer dependency).'
		);
	}
	return chromium.launch({ executablePath: findChromium() }) as Promise<Launched>;
}

/** Segments one piece: decoder → page → encoder, with the page served from loopback. */
async function segmentWithMediaPipe(
	chunk: MatteChunk,
	cfg: { model: ModelEntry; modelFile: string; tasks: string; smoothing: number }
): Promise<void> {
	const { width, height } = cfg.model;
	const token = randomUUID();
	const children: { process: ChildProcess; exited: Promise<void> }[] = [];
	// `failed` rejects with the first problem anywhere (page, decoder, encoder, stall);
	// `done` resolves with the page's frame count.
	let fail!: (error: Error) => void;
	const failed = new Promise<never>((_, reject) => (fail = reject));
	failed.catch(() => {});
	let finish!: (frames: number) => void;
	const done = new Promise<number>((resolve) => (finish = resolve));
	let lastActivity = Date.now();

	const encoder = spawnFfmpeg(
		[
			'-y',
			'-f',
			'rawvideo',
			'-pix_fmt',
			'gray',
			'-s',
			`${width}x${height}`,
			'-framerate',
			String(chunk.fps),
			'-i',
			'-',
			'-vf',
			`scale=${chunk.width}:${chunk.height}:flags=bicubic,format=yuv420p`,
			'-c:v',
			'libx264',
			'-crf',
			'10',
			chunk.output
		],
		'MediaPipe mask encoder',
		fail,
		'pipe'
	);
	children.push(encoder);

	const server = http.createServer((req, res) => {
		handle(req, res).catch((error) => {
			fail(error);
			res.destroy();
		});
	});
	async function handle(req: http.IncomingMessage, res: http.ServerResponse) {
		const url = new URL(req.url ?? '/', 'http://localhost');
		const prefix = `/${token}/`;
		if (!url.pathname.startsWith(prefix)) return void res.writeHead(404).end();
		// Only the page (it knows the token) keeps the piece alive.
		lastActivity = Date.now();
		const route = url.pathname.slice(prefix.length);
		const send = (type: string, body: string | Buffer) =>
			void res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }).end(body);
		const body = async () => {
			const parts: Buffer[] = [];
			for await (const part of req) parts.push(part as Buffer);
			return Buffer.concat(parts);
		};
		if (req.method === 'GET') {
			if (route === '') return send('text/html', PAGE_HTML);
			if (route === 'run.js') return send('text/javascript', PAGE_SCRIPT);
			if (route === 'config.json')
				return send(
					'application/json',
					JSON.stringify({
						width,
						height,
						fps: chunk.fps,
						smoothing: cfg.smoothing,
						cut: CUT_CHANGE,
						batch: MASK_BATCH
					})
				);
			if (route === 'model.tflite')
				return send('application/octet-stream', await fs.readFile(cfg.modelFile));
			if (route === 'tasks/vision_bundle.mjs')
				return send(
					'text/javascript',
					await fs.readFile(path.join(cfg.tasks, 'vision_bundle.mjs'))
				);
			const wasm = route.startsWith('tasks/wasm/') ? route.slice('tasks/wasm/'.length) : '';
			if (WASM_FILE.test(wasm))
				return send(
					wasm.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
					await fs.readFile(path.join(cfg.tasks, 'wasm', wasm))
				);
			if (route === 'frames') {
				const decoder = spawnFfmpeg(
					[
						'-i',
						chunk.input,
						'-vf',
						`scale=${width}:${height}:flags=area,format=rgba`,
						'-f',
						'rawvideo',
						'-'
					],
					'MediaPipe frame decoder',
					fail,
					'ignore'
				);
				children.push(decoder);
				res.writeHead(200, { 'content-type': 'application/octet-stream' });
				decoder.process.stdout!.on('data', () => (lastActivity = Date.now()));
				decoder.process.stdout!.pipe(res);
				return;
			}
		} else if (req.method === 'POST') {
			if (route === 'masks') {
				for await (const part of req) {
					lastActivity = Date.now();
					if (!encoder.process.stdin!.write(part))
						await new Promise((resolve) => encoder.process.stdin!.once('drain', resolve));
				}
				return void res.writeHead(204).end();
			}
			if (route === 'done') {
				const { frames, leftover } = JSON.parse(String(await body()));
				res.writeHead(204).end();
				if (leftover)
					return fail(new Error(`MediaPipe: the decoder ended in the middle of a frame.`));
				return finish(frames);
			}
			if (route === 'error') {
				const message = String(await body());
				res.writeHead(204).end();
				return fail(new Error(`MediaPipe page failed: ${message.slice(0, 1000)}`));
			}
		}
		res.writeHead(404).end();
	}

	let launching: Promise<Launched> | undefined;
	const watchdog = setInterval(() => {
		if (Date.now() - lastActivity > STALL_TIMEOUT_MS)
			fail(
				new Error(
					`MediaPipe stopped responding on frames ${chunk.first}–${chunk.last} (nothing for ${STALL_TIMEOUT_MS / 1000} s).`
				)
			);
	}, 1000);
	try {
		await new Promise<void>((resolve, reject) => {
			server.once('error', reject);
			server.listen(0, '127.0.0.1', resolve);
		});
		const { port } = server.address() as { port: number };
		// Every step races the first failure, so a stalled browser cannot hang the piece.
		launching = launchChromium();
		const browser = await Promise.race([launching, failed]);
		const page = await Promise.race([browser.newPage(), failed]);
		page.on('pageerror', (e) => fail(new Error(`MediaPipe page error: ${String(e)}`)));
		page.on('crash', () => fail(new Error('The MediaPipe page crashed.')));
		await Promise.race([page.goto(`http://127.0.0.1:${port}/${token}/`), failed]);
		const frames = await Promise.race([done, failed]);
		encoder.process.stdin!.end();
		await Promise.race([encoder.exited, failed]);
		if (frames !== chunk.frames)
			throw new Error(
				`MediaPipe segmented ${frames} frames of frames ${chunk.first}–${chunk.last}, expected ${chunk.frames}.`
			);
	} finally {
		clearInterval(watchdog);
		// Playwright gives up on a launch after 30 s, so this settles even if the launch stalled.
		const browser = await launching?.catch(() => undefined);
		await browser?.close().catch(() => {});
		for (const child of children)
			if (child.process.exitCode === null) child.process.kill('SIGKILL');
		// Wait until ffmpeg has let go of the piece's files before the pipeline removes them.
		await Promise.all(children.map((child) => child.exited.catch(() => {})));
		server.closeAllConnections?.();
		await new Promise<void>((resolve) => server.close(() => resolve()));
	}
}

function spawnFfmpeg(
	args: string[],
	label: string,
	fail: (error: Error) => void,
	stdin: 'pipe' | 'ignore'
): { process: ChildProcess; exited: Promise<void> } {
	const child = spawn(
		process.env.FFMPEG_PATH || 'ffmpeg',
		[...(stdin === 'ignore' ? ['-nostdin'] : []), '-loglevel', 'error', ...args],
		{ stdio: [stdin, 'pipe', 'pipe'] }
	);
	let err = '';
	child.stderr!.on('data', (d) => (err = (err + d).slice(-2000)));
	// A page that fails stops reading; the resulting EPIPE is reported through `fail` already.
	child.stdin?.on('error', () => {});
	child.stdout!.on('error', () => {});
	const exited = new Promise<void>((resolve, reject) => {
		child.on('error', (error) => {
			fail(error);
			reject(error);
		});
		child.on('close', (code, signal) => {
			if (code === 0) return resolve();
			const error = new Error(`${label} failed (${code ?? signal}): ${err.slice(-600)}`);
			if (signal !== 'SIGKILL') fail(error);
			reject(error);
		});
	});
	exited.catch(() => {});
	return { process: child, exited };
}
