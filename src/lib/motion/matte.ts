import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { probeVideo, type VideoInfo } from './node.js';
import type { FrameRange } from './footage-map.js';
import { MATTE_PLAN, rangesFileOf, type MatteRangesFile } from './matte-use.js';

// ---------------------------------------------------------------- providers

/** One piece of the input video to segment. */
export type MatteChunk = {
	/** Constant-frame-rate H.264 MP4 of this piece, without sound. */
	input: string;
	/** Where the provider writes its mask video. */
	output: string;
	index: number;
	/** First and last frame of the piece in the input video. */
	first: number;
	last: number;
	frames: number;
	fps: number;
	width: number;
	height: number;
};

/**
 * Turns a video into a mask video. VisualFries splits the input into pieces of at most
 * `maxFrames`, checks each mask's frame count, normalises it (size, frame rate, greyscale,
 * a missing last frame or two) and joins the pieces, so a provider only segments one file.
 */
export type MatteProvider = {
	name: string;
	/**
	 * What decides the masks (model and settings, not speed): partial mattes cache each range
	 * under it. Default: `name`.
	 */
	id?: string;
	/** Longest piece the provider accepts, in frames. */
	maxFrames: number;
	/** Pieces worth running at once. */
	parallel?: number;
	/**
	 * How the mask encodes the subject: `luma` (white = subject, the default) or `alpha`
	 * (a video with transparency, e.g. ProRes 4444 or VP9 WebM).
	 */
	output?: 'luma' | 'alpha';
	/** File extension of the mask the provider writes. Default `.mp4`, `.mov` for alpha. */
	extension?: string;
	segment(chunk: MatteChunk): Promise<void>;
};

export type BiRefNetModel =
	| 'Matting'
	| 'Portrait'
	| 'General Use (Light)'
	| 'General Use (Light 2K)'
	| 'General Use (Heavy)'
	| 'General Use (Dynamic)';
/** @deprecated Use BiRefNetModel. */
export type MatteModel = BiRefNetModel;

/** One API call; uploads and downloads get longer. */
const HTTP_TIMEOUT_MS = 60 * 1000;
const TRANSFER_TIMEOUT_MS = 10 * 60 * 1000;
/** A request still queued or running after this long is abandoned. */
const FAL_REQUEST_TIMEOUT_MS = 20 * 60 * 1000;
const FAL_ENDPOINT = 'fal-ai/birefnet/v2/video';

/**
 * BiRefNet v2 on fal.ai (`FAL_KEY`). `Matting` keeps hair and microphones; `Portrait` is tuned
 * for people. The API accepts at most 512 frames per request.
 */
export function falBiRefNet(
	opts: {
		key?: string;
		model?: BiRefNetModel;
		resolution?: '1024x1024' | '2048x2048' | '2304x2304';
		/** Injected in tests. */
		fetch?: typeof fetch;
	} = {}
): MatteProvider {
	const key = opts.key ?? process.env.FAL_KEY;
	if (!key) throw new Error('FAL_KEY is not set. Get a key at https://fal.ai/dashboard/keys.');
	const doFetch = opts.fetch ?? fetch;
	const model = opts.model ?? 'Matting';

	async function json(url: string, init: RequestInit = {}) {
		const response = await doFetch(url, {
			signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
			...init,
			headers: {
				Authorization: `Key ${key}`,
				'Content-Type': 'application/json',
				...(init.headers ?? {})
			}
		});
		const text = await response.text();
		if (!response.ok)
			throw new Error(`fal.ai ${response.status} for ${url}: ${text.slice(0, 500)}`);
		return text ? JSON.parse(text) : {};
	}

	async function upload(file: string): Promise<string> {
		const { upload_url: uploadUrl, file_url: fileUrl } = await json(
			'https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3',
			{
				method: 'POST',
				body: JSON.stringify({ content_type: 'video/mp4', file_name: path.basename(file) })
			}
		);
		const put = await doFetch(uploadUrl, {
			signal: AbortSignal.timeout(TRANSFER_TIMEOUT_MS),
			method: 'PUT',
			body: new Uint8Array(await fs.readFile(file)),
			headers: { 'Content-Type': 'video/mp4' }
		});
		if (!put.ok) throw new Error(`fal.ai upload failed: ${put.status} ${await put.text()}`);
		return fileUrl;
	}

	return {
		name: `fal.ai BiRefNet v2 (${model})`,
		id: `fal-birefnet-v2:${model}:${opts.resolution ?? '1024x1024'}`,
		maxFrames: 512,
		parallel: 3,
		output: 'luma',
		async segment(chunk) {
			const queued = await json(`https://queue.fal.run/${FAL_ENDPOINT}`, {
				method: 'POST',
				body: JSON.stringify({
					video_url: await upload(chunk.input),
					model,
					operating_resolution: opts.resolution ?? '1024x1024',
					output_mask: true,
					refine_foreground: false,
					video_output_type: 'X264 (.mp4)',
					video_quality: 'maximum'
				})
			});
			const deadline = Date.now() + FAL_REQUEST_TIMEOUT_MS;
			for (;;) {
				if (Date.now() > deadline)
					throw new Error(`fal.ai request ${queued.request_id} did not finish within 20 minutes.`);
				const status = await json(queued.status_url);
				if (status.status === 'COMPLETED') break;
				if (status.status !== 'IN_QUEUE' && status.status !== 'IN_PROGRESS')
					throw new Error(`fal.ai request ${queued.request_id} ended as ${status.status}.`);
				await new Promise((r) => setTimeout(r, 2000));
			}
			const result = await json(queued.response_url);
			const maskUrl = result.mask_video?.url;
			if (!maskUrl)
				throw new Error(`fal.ai returned no mask for frames ${chunk.first}–${chunk.last}.`);
			const response = await doFetch(maskUrl, {
				signal: AbortSignal.timeout(TRANSFER_TIMEOUT_MS)
			});
			if (!response.ok) throw new Error(`Mask download failed: ${response.status}`);
			await fs.writeFile(chunk.output, Buffer.from(await response.arrayBuffer()));
		}
	};
}

/**
 * Runs any local tool once per piece. `template` is a shell command with placeholders:
 * `{input}`, `{output}` (paths), `{fps}`, `{width}`, `{height}`, `{frames}`.
 * The tool must write a video to `{output}`: greyscale with white = subject (`output: 'luma'`)
 * or a video with transparency (`output: 'alpha'`; set `extension` to `.webm` for VP9).
 *
 *   commandMatte('python rvm.py --in {input} --out {output}')
 */
export function commandMatte(
	template: string,
	opts: {
		maxFrames?: number;
		parallel?: number;
		output?: 'luma' | 'alpha';
		extension?: string;
	} = {}
): MatteProvider {
	if (!template.includes('{input}') || !template.includes('{output}'))
		throw new Error('The matte command needs {input} and {output} placeholders.');
	if (opts.output && opts.output !== 'luma' && opts.output !== 'alpha')
		throw new Error(`Matte output must be "luma" or "alpha", got "${opts.output}".`);
	const windows = process.platform === 'win32';
	// Paths reach the shell as environment variables, expanded once and never parsed again,
	// so quotes, spaces, `$` or `%` in a path cannot break or extend the command.
	const variable = (name: string) => (windows ? `"%${name}%"` : `"$${name}"`);
	return {
		name: `command: ${template}`,
		id: `command:${opts.output ?? 'luma'}:${opts.extension ?? ''}:${template}`,
		maxFrames: opts.maxFrames ?? Number.POSITIVE_INFINITY,
		parallel: opts.parallel ?? 1,
		output: opts.output ?? 'luma',
		extension: opts.extension,
		async segment(chunk) {
			const command = template.replace(
				/\{(input|output|fps|width|height|frames)\}/g,
				(_, key: keyof MatteChunk) =>
					key === 'input'
						? variable('VF_MATTE_INPUT')
						: key === 'output'
							? variable('VF_MATTE_OUTPUT')
							: String(chunk[key])
			);
			await run(
				windows ? process.env.ComSpec || 'cmd.exe' : 'sh',
				windows ? ['/d', '/s', '/c', `"${command}"`] : ['-c', command],
				'Matte command',
				{
					env: { ...process.env, VF_MATTE_INPUT: chunk.input, VF_MATTE_OUTPUT: chunk.output },
					windowsVerbatimArguments: windows
				}
			);
		}
	};
}

/** `scripts/<name>` of this package, found from dist/ (published) or src/ (tests) alike. */
function bundledScript(name: string): string {
	let dir = path.dirname(fileURLToPath(import.meta.url));
	for (let i = 0; i < 5; i++) {
		const candidate = path.join(dir, 'scripts', name);
		if (existsSync(candidate)) return candidate;
		dir = path.dirname(dir);
	}
	throw new Error(`Bundled script scripts/${name} not found next to the visualfries package.`);
}

/**
 * Local matte with RobustVideoMatting (mobilenetv3) on the CPU: no API key, no account, temporally
 * stable. Runs the bundled `scripts/rvm-matte.py` through `uv`, which brings Python, torch,
 * torchvision and numpy on first use (current CPU wheels); the model code (v1.0.0 tag) and the
 * weights (its GitHub release, SHA-256 checked) are fetched once into torch.hub's cache.
 * Needs `uv` and `ffmpeg`, and network on the first run.
 * About 3 fps at 1080p and 16 fps at 540p on a 12-core server. RVM is recurrent, so long chunks keep
 * it stable; 480 frames per chunk by default.
 */
export function rvmMatte(
	opts: { threads?: number; maxFrames?: number; uv?: string; script?: string } = {}
): MatteProvider {
	const script = opts.script ?? bundledScript('rvm-matte.py');
	const threads = Math.max(1, Math.round(opts.threads ?? Math.min(10, os.cpus().length)));
	const uv = opts.uv ?? 'uv';
	return {
		name: `rvm (local CPU, ${threads} threads)`,
		id: 'rvm:mobilenetv3:v1.0.0',
		maxFrames: opts.maxFrames ?? 480,
		parallel: 1,
		output: 'luma',
		async segment(chunk) {
			// No shell: the script path and the chunk paths are passed as plain arguments.
			await runUv(
				uv,
				[
					'run',
					'-q',
					// Never pick up a pyproject.toml or uv.toml from the folder the video sits in.
					'--no-project',
					'--no-config',
					'--index',
					'https://download.pytorch.org/whl/cpu',
					'--index-strategy',
					'unsafe-best-match',
					'--with',
					'torch',
					'--with',
					'torchvision',
					'--with',
					'numpy',
					'python',
					script,
					chunk.input,
					chunk.output,
					String(threads)
				],
				'RVM matte'
			);
		}
	};
}

async function runUv(uv: string, args: string[], label: string): Promise<void> {
	try {
		await run(uv, args, label);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
		throw new Error(
			`${label}: uv not found ("${uv}"). Install uv (https://docs.astral.sh/uv/) or use --provider fal (fal.ai, FAL_KEY).`
		);
	}
}

/**
 * Which provider `visualfries matte` uses: the one named, else `command` when a command is given,
 * `fal` when a fal-only option (model, resolution) is given, else local `rvm`.
 */
export function matteProviderName(flags: {
	provider?: string;
	command?: string;
	model?: string;
	resolution?: string;
}): string {
	if (flags.provider) return flags.provider;
	if (flags.command) return 'command';
	if (flags.model || flags.resolution) return 'fal';
	return 'rvm';
}

/** The provider the flags of `visualfries matte` ask for (see `matteProviderName`). */
export function matteProviderFromFlags(flags: {
	provider?: string;
	command?: string;
	commandOutput?: string;
	commandExt?: string;
	model?: string;
	resolution?: string;
	threads?: number;
	maxFrames?: number;
	jobs?: number;
}): MatteProvider {
	const name = matteProviderName(flags);
	if (name === 'fal')
		return falBiRefNet({
			model: flags.model as BiRefNetModel | undefined,
			resolution: flags.resolution as '1024x1024' | '2048x2048' | '2304x2304' | undefined
		});
	if (name === 'rvm') return rvmMatte({ threads: flags.threads, maxFrames: flags.maxFrames });
	if (name !== 'command')
		throw new Error(`Unknown matte provider "${name}". Use rvm, fal or command.`);
	if (!flags.command)
		throw new Error('--provider command needs --command "tool {input} {output}".');
	return commandMatte(flags.command, {
		output: (flags.commandOutput ?? 'luma') as 'luma' | 'alpha',
		extension: flags.commandExt,
		maxFrames: flags.maxFrames,
		parallel: flags.jobs
	});
}

const REMOVED_FAL_OPTIONS = ['model', 'resolution', 'falKey', 'fetch'];

/** Options of the old fal.ai default; without a provider they would silently run locally. */
function rejectRemovedFalOptions(opts: MatteOptions): void {
	if (opts.provider) return;
	const found = REMOVED_FAL_OPTIONS.filter((key) => key in opts);
	if (found.length)
		throw new Error(
			`createSubjectMatte no longer takes ${found.join(', ')}: the default provider is local RVM. For fal.ai pass provider: falBiRefNet({ key, model, resolution }).`
		);
}

// ---------------------------------------------------------------- pipeline

export type MatteOptions = {
	output: string;
	/**
	 * Who segments the video. Default: `rvmMatte()`, local on the CPU with no key. For a cleaner
	 * edge on hair and microphones pass `falBiRefNet()` (fal.ai, paid, `FAL_KEY`).
	 */
	provider?: MatteProvider;
	/** Frames per piece; at most the provider's `maxFrames`. Default: 480 or the provider limit. */
	chunkFrames?: number;
	/** Pieces running at once. Default: the provider's `parallel`. */
	jobs?: number;
	onProgress?: (message: string) => void;
};

export type MatteResult = {
	output: string;
	frames: number;
	fps: number;
	width: number;
	height: number;
	chunks: number;
	provider: string;
	seconds: number;
};

/** Frame ranges `[first, last]` that cover `frames` in pieces of at most `size` (≤ `max`). */
export function planMatteChunks(
	frames: number,
	size: number,
	max = Number.POSITIVE_INFINITY
): { first: number; last: number }[] {
	if (!(size > 0 && size <= max))
		throw new Error(`Chunk size must be between 1 and ${max} frames, got ${size}.`);
	const chunks: { first: number; last: number }[] = [];
	for (let first = 0; first < frames; first += size)
		chunks.push({ first, last: Math.min(frames, first + size) - 1 });
	return chunks;
}

function run(
	cmd: string,
	args: string[],
	label = cmd,
	options: { env?: NodeJS.ProcessEnv; windowsVerbatimArguments?: boolean } = {}
): Promise<void> {
	return new Promise((resolve, reject) => {
		const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'], ...options });
		let err = '';
		p.stderr.on('data', (d) => (err += d));
		p.on('error', reject);
		p.on('close', (code) =>
			code === 0 ? resolve() : reject(new Error(`${label} failed (${code}): ${err.slice(-600)}`))
		);
	});
}
const ffmpeg = (args: string[]) => run(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', ...args]);

const ALPHA_PIXEL_FORMATS = /^(yuva|rgba|bgra|argb|abgr|gbrap|ya8|ya16|pal8)/;

/**
 * Throws unless the mask carries an alpha channel; returns the decoder arguments that keep it
 * (FFmpeg's native VP9 decoder drops the alpha of a WebM, libvpx keeps it).
 */
async function checkAlpha(file: string, provider: string): Promise<string[]> {
	const out = await new Promise<string>((resolve, reject) => {
		const p = spawn(process.env.FFPROBE_PATH || 'ffprobe', [
			'-v',
			'error',
			'-select_streams',
			'v:0',
			'-show_entries',
			'stream=codec_name,pix_fmt:stream_tags=alpha_mode',
			'-of',
			'json',
			file
		]);
		let text = '';
		p.stdout.on('data', (d) => (text += d));
		p.on('error', reject);
		p.on('close', (code) =>
			code === 0 ? resolve(text) : reject(new Error(`ffprobe failed for ${file}`))
		);
	});
	const stream = JSON.parse(out).streams?.[0] ?? {};
	const vp9Alpha =
		stream.codec_name === 'vp9' &&
		String(stream.tags?.alpha_mode ?? stream.tags?.ALPHA_MODE) === '1';
	if (!vp9Alpha && !ALPHA_PIXEL_FORMATS.test(String(stream.pix_fmt)))
		throw new Error(
			`${provider}: the mask has no alpha channel (${stream.codec_name}, ${stream.pix_fmt}). Write transparency (ProRes 4444, VP9 WebM with alpha) or use luma output.`
		);
	return vp9Alpha ? ['-c:v', 'libvpx-vp9'] : [];
}

type ChunkPlan = { first: number; last: number };

/**
 * Segments frames `chunks` of `input` with the provider (in pieces at once as `jobs` allows) and
 * returns each piece's checked, normalised mask: greyscale H.264 at the input's size and rate,
 * exactly as many frames as the piece.
 */
async function segmentChunks(
	input: string,
	info: VideoInfo,
	chunks: ChunkPlan[],
	provider: MatteProvider,
	work: string,
	opts: Pick<MatteOptions, 'jobs' | 'onProgress'>
): Promise<string[]> {
	const log = opts.onProgress ?? (() => {});
	const extract = provider.output === 'alpha' ? 'format=rgba,alphaextract' : 'format=gray';
	const done: string[] = new Array(chunks.length);
	let next = 0;
	let failed = false;
	const worker = async () => {
		while (next < chunks.length && !failed) {
			const i = next++;
			const { first, last } = chunks[i];
			const count = last - first + 1;
			const part = path.join(work, `part-${i}.mp4`);
			await ffmpeg([
				'-i',
				input,
				'-vf',
				`trim=start_frame=${first}:end_frame=${last + 1},setpts=PTS-STARTPTS`,
				'-an',
				'-c:v',
				'libx264',
				'-crf',
				'12',
				'-pix_fmt',
				'yuv420p',
				part
			]);
			const raw = path.join(
				work,
				`mask-raw-${i}${provider.extension ?? (provider.output === 'alpha' ? '.mov' : '.mp4')}`
			);
			await provider.segment({
				input: part,
				output: raw,
				index: i,
				first,
				last,
				frames: count,
				fps: info.fps,
				width: info.width,
				height: info.height
			});
			const alphaDecoder = provider.output === 'alpha' ? await checkAlpha(raw, provider.name) : [];
			// Mask frame n belongs to piece frame n whatever rate or time base the provider wrote,
			// so the masks are decoded to numbered images and rebuilt at the piece's rate.
			const frameDir = path.join(work, `mask-frames-${i}`);
			await fs.mkdir(frameDir);
			await ffmpeg([
				...alphaDecoder,
				'-i',
				raw,
				'-vf',
				`scale=${info.width}:${info.height},${extract}`,
				'-fps_mode',
				'passthrough',
				path.join(frameDir, '%06d.png')
			]);
			const decoded = (await fs.readdir(frameDir)).filter((f) => f.endsWith('.png')).sort();
			// Up to two missing frames are normal and hold the last one; more means a wrong mask.
			if (decoded.length < count - 2 || decoded.length > count + 2)
				throw new Error(
					`${provider.name}: mask for frames ${first}–${last} has ${decoded.length} frames, expected ${count}.`
				);
			for (let n = decoded.length + 1; n <= count; n++)
				await fs.copyFile(
					path.join(frameDir, decoded[decoded.length - 1]),
					path.join(frameDir, `${String(n).padStart(6, '0')}.png`)
				);
			const fixed = path.join(work, `mask-${i}.mp4`);
			await ffmpeg([
				'-framerate',
				String(info.fps),
				'-i',
				path.join(frameDir, '%06d.png'),
				'-frames:v',
				String(count),
				'-c:v',
				'libx264',
				'-crf',
				'10',
				'-pix_fmt',
				'yuv420p',
				fixed
			]);
			await fs.rm(frameDir, { recursive: true, force: true });
			done[i] = fixed;
			log(`matte: frames ${first}–${last} done (${i + 1}/${chunks.length})`);
		}
	};
	// The first failure stops the other workers from starting more (possibly paid) pieces;
	// the caller removes the work folder only after every worker has stopped.
	const results = await Promise.allSettled(
		Array.from({ length: Math.min(opts.jobs ?? provider.parallel ?? 1, chunks.length) }, () =>
			worker().catch((error) => {
				failed = true;
				throw error;
			})
		)
	);
	const rejected = results.find((r) => r.status === 'rejected');
	if (rejected) throw (rejected as PromiseRejectedResult).reason;
	return done;
}

/**
 * Joins mask videos into `output` at the input's rate, frame after frame (`skip` frames of the
 * first one left out), and checks the frame count.
 */
async function joinMasks(
	parts: string[],
	output: string,
	fps: number,
	frames: number,
	work: string,
	skip = 0
): Promise<void> {
	const list = path.join(work, `list-${randomUUID()}.txt`);
	await fs.writeFile(list, parts.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
	await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
	// Every frame gets its place by count, so pieces of any time base line up frame-exact.
	const retime = `setpts=N/(${fps}*TB)`;
	await ffmpeg([
		'-f',
		'concat',
		'-safe',
		'0',
		'-i',
		list,
		'-vf',
		skip ? `trim=start_frame=${skip},${retime}` : retime,
		'-r',
		String(fps),
		'-frames:v',
		String(frames),
		'-c:v',
		'libx264',
		'-crf',
		'10',
		'-pix_fmt',
		'yuv420p',
		'-movflags',
		'+faststart',
		output
	]);
	const out = await probeVideo(output);
	if (out.frames !== frames)
		throw new Error(`Matte has ${out.frames} frames, the input has ${frames}.`);
}

/**
 * Makes a greyscale matte video of `input` (white = subject) with a matte provider: splits the
 * video into pieces the provider accepts, checks and normalises every mask and joins them, so
 * the matte has the same size, frame rate and frame count as the input. A ranges file a partial
 * matte left at `output` (see `createRangeMatte`) is removed: this matte covers every frame.
 */
export async function createSubjectMatte(input: string, opts: MatteOptions): Promise<MatteResult> {
	rejectRemovedFalOptions(opts);
	refuseOverwrite(input, opts.output);
	const provider = opts.provider ?? rvmMatte();
	const started = Date.now();
	const info = await constantVideo(input);
	const size = opts.chunkFrames ?? Math.min(480, provider.maxFrames, info.frames);
	const chunks = planMatteChunks(info.frames, size, provider.maxFrames);
	const work = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-'));
	try {
		const done = await segmentChunks(input, info, chunks, provider, work, opts);
		await joinMasks(done, opts.output, info.fps, info.frames, work);
		await fs.rm(rangesFileOf(opts.output), { force: true });
		return {
			output: opts.output,
			frames: info.frames,
			fps: info.fps,
			width: info.width,
			height: info.height,
			chunks: chunks.length,
			provider: provider.name,
			seconds: (Date.now() - started) / 1000
		};
	} finally {
		await fs.rm(work, { recursive: true, force: true });
	}
}

/** Throws when the matte would be written over the video it is made of. */
function refuseOverwrite(input: string, output: string) {
	if (path.resolve(input) === path.resolve(output))
		throw new Error(
			`The matte would overwrite the video it is made of (${output}). Give it another name.`
		);
}

/** Probes `input` and throws unless it has a constant frame rate. */
async function constantVideo(input: string): Promise<VideoInfo> {
	const info = await probeVideo(input);
	if (!info.constant)
		throw new Error(
			`${input} has a variable frame rate. Convert it first, e.g. ffmpeg -i in.mp4 -vf fps=30 -c:a copy out.mp4.`
		);
	return info;
}

// ---------------------------------------------------------------- partial mattes

export type RangeMatteOptions = MatteOptions & {
	/** Frames of the input (its own rate) to matte, as sorted inclusive ranges. */
	ranges: FrameRange[];
	/**
	 * Frames matted before each stretch and thrown away, so a recurrent model has settled by
	 * its first frame. Default: one second.
	 */
	warmup?: number;
	/**
	 * Frames of the blocks the masks are cached in. The matte covers whole blocks, so a range
	 * that grows mattes only its new blocks. Default: two seconds.
	 */
	blockFrames?: number;
	/** Folder that keeps each block's mask, so a block matted before is not matted again. */
	cacheDir: string;
};

export type RangeMatteResult = MatteResult & {
	/** Frames the matte covers (outside them it is black), and how many were matted now. */
	covered: number;
	matted: number;
	/** The frames covered, as sorted inclusive ranges (whole blocks). */
	ranges: FrameRange[];
	/** False when the matte at `output` already was this one and was left alone. */
	written: boolean;
};

/** Bytes read from each end of a file for its fingerprint. */
const FINGERPRINT_BYTES = 1 << 20;

/**
 * A cheap fingerprint of a file's content: its size and a hash of its first and last MiB. It
 * survives copying and renaming, and changes when the file is replaced by another.
 */
export async function fileFingerprint(file: string): Promise<string> {
	const handle = await fs.open(file, 'r');
	try {
		const { size } = await handle.stat();
		const head = Buffer.alloc(Math.min(size, FINGERPRINT_BYTES));
		await handle.read(head, 0, head.length, 0);
		const tail = Buffer.alloc(Math.min(FINGERPRINT_BYTES, size - head.length));
		await handle.read(tail, 0, tail.length, size - tail.length);
		return createHash('sha1')
			.update(String(size))
			.update(head)
			.update(tail)
			.digest('hex')
			.slice(0, 16);
	} finally {
		await handle.close();
	}
}

/** Cache key of one block's mask: the input's content, the block, the warm-up and the provider. */
export function blockMaskKey(input: {
	source: string;
	frames: number;
	fps: number;
	block: number;
	blockFrames: number;
	warmup: number;
	provider: string;
	chunkFrames: number;
}): string {
	return createHash('sha1').update(JSON.stringify(input)).digest('hex').slice(0, 16);
}

/** The blocks of `size` frames that hold any frame of `ranges`, in order. */
export function blocksOf(ranges: readonly FrameRange[], size: number): number[] {
	const out = new Set<number>();
	for (const r of ranges)
		for (let k = Math.floor(r.first / size); k <= Math.floor(r.last / size); k++) out.add(k);
	return [...out].sort((a, b) => a - b);
}

/** Runs of consecutive block numbers, as inclusive `{ first, last }` blocks. */
export function blockRuns(blocks: readonly number[]): FrameRange[] {
	const runs: FrameRange[] = [];
	for (const k of blocks) {
		const last = runs[runs.length - 1];
		if (last && k === last.last + 1) last.last = k;
		else runs.push({ first: k, last: k });
	}
	return runs;
}

/** The frames of block `k` of `size` frames in a video of `total` frames. */
const blockFramesOf = (k: number, size: number, total: number): FrameRange => ({
	first: k * size,
	last: Math.min(total, (k + 1) * size) - 1
});

/** The pieces of a full-length matte: masks of `ranges` and the black gaps between them. */
export function matteLayout(
	ranges: readonly FrameRange[],
	total: number
): ({ range: number } | { gap: number })[] {
	const out: ({ range: number } | { gap: number })[] = [];
	let at = 0;
	ranges.forEach((r, i) => {
		if (r.first > at) out.push({ gap: r.first - at });
		out.push({ range: i });
		at = r.last + 1;
	});
	if (at < total) out.push({ gap: total - at });
	return out;
}

/** Throws unless `ranges` are sorted, apart, and inside `total` frames. */
function checkRanges(ranges: readonly FrameRange[], total: number) {
	let previous = -1;
	for (const r of ranges) {
		if (!(Number.isInteger(r.first) && Number.isInteger(r.last)) || r.first > r.last)
			throw new Error(`Bad matte range ${r.first}–${r.last}.`);
		if (r.first <= previous || r.last >= total)
			throw new Error(
				`Matte ranges must be sorted, apart and inside the video's ${total} frames; got ${r.first}–${r.last}.`
			);
		previous = r.last;
	}
}

/** A black greyscale video of `frames` frames (no subject). */
async function blackVideo(file: string, info: VideoInfo, frames: number) {
	await ffmpeg([
		'-f',
		'lavfi',
		'-i',
		`color=c=black:s=${info.width}x${info.height}:r=${info.fps}`,
		'-frames:v',
		String(frames),
		'-c:v',
		'libx264',
		'-crf',
		'10',
		'-pix_fmt',
		'yuv420p',
		file
	]);
}

type BlockPlan = {
	size: number;
	/** The cache folder. */
	dirname: string;
	warmup: number;
	chunkFrames: number;
	/** Cache file of each block. */
	file: (k: number) => string;
};

/**
 * Mattes a run of blocks in one go (from `warmup` frames before its first block, those left
 * out) and cuts the mask into one cached file per block.
 */
async function matteBlocks(
	input: string,
	info: VideoInfo,
	run: FrameRange,
	provider: MatteProvider,
	plan: BlockPlan,
	opts: Pick<MatteOptions, 'jobs' | 'onProgress'>
): Promise<void> {
	const first = blockFramesOf(run.first, plan.size, info.frames).first;
	const last = blockFramesOf(run.last, plan.size, info.frames).last;
	const start = Math.max(0, first - plan.warmup);
	const chunks = planMatteChunks(last - start + 1, plan.chunkFrames, provider.maxFrames).map(
		(c) => ({ first: c.first + start, last: c.last + start })
	);
	const work = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-'));
	try {
		const parts = await segmentChunks(input, info, chunks, provider, work, opts);
		const span = path.join(work, 'span.mp4');
		await joinMasks(parts, span, info.fps, last - first + 1, work, first - start);
		await fs.mkdir(plan.dirname, { recursive: true });
		for (let k = run.first; k <= run.last; k++) {
			const block = blockFramesOf(k, plan.size, info.frames);
			const tmp = `${plan.file(k)}.tmp-${process.pid}-${randomUUID()}.mp4`;
			await ffmpeg([
				'-ss',
				((block.first - first) / info.fps).toFixed(6),
				'-i',
				span,
				'-frames:v',
				String(block.last - block.first + 1),
				'-c:v',
				'libx264',
				'-crf',
				'10',
				'-pix_fmt',
				'yuv420p',
				tmp
			]);
			await fs.rename(tmp, plan.file(k));
		}
	} finally {
		await fs.rm(work, { recursive: true, force: true });
	}
}

/**
 * Makes a full-length matte of `input` that covers `ranges` in whole blocks (black, no subject,
 * elsewhere) and writes its ranges file next to it (see `MatteRangesFile`), so `check` and
 * `render` know which frames it covers. Each block's mask is cached in `cacheDir`: running it
 * again after an edit mattes only new blocks, and leaves a matte that would not change alone.
 * The matte and its ranges file are published by renaming, the ranges file first and naming
 * the new matte's fingerprint, so a run stopped half way never passes for another matte.
 */
export async function createRangeMatte(
	input: string,
	opts: RangeMatteOptions
): Promise<RangeMatteResult> {
	rejectRemovedFalOptions(opts);
	refuseOverwrite(input, opts.output);
	const provider = opts.provider ?? rvmMatte();
	const started = Date.now();
	const info = await constantVideo(input);
	checkRanges(opts.ranges, info.frames);
	const source = await fileFingerprint(input);
	const size = opts.blockFrames ?? Math.round(MATTE_PLAN.block * info.fps);
	const warmup = opts.warmup ?? Math.round(MATTE_PLAN.warmup * info.fps);
	const chunkFrames = opts.chunkFrames ?? Math.min(480, provider.maxFrames);
	const blocks = blocksOf(opts.ranges, size);
	const keyOf = (block: number) =>
		blockMaskKey({
			source,
			frames: info.frames,
			fps: info.fps,
			block,
			blockFrames: size,
			warmup,
			provider: provider.id ?? provider.name,
			chunkFrames
		});
	const plan: BlockPlan = {
		size,
		warmup,
		chunkFrames,
		dirname: opts.cacheDir,
		file: (k) => path.join(opts.cacheDir, `${keyOf(k)}.mp4`)
	};
	const covered = blockRuns(blocks).map((run) => ({
		first: blockFramesOf(run.first, size, info.frames).first,
		last: blockFramesOf(run.last, size, info.frames).last
	}));
	const key = createHash('sha1')
		.update(JSON.stringify({ blocks: blocks.map(keyOf), frames: info.frames }))
		.digest('hex')
		.slice(0, 16);
	const result = (matted: number, written: boolean): RangeMatteResult => ({
		output: opts.output,
		frames: info.frames,
		fps: info.fps,
		width: info.width,
		height: info.height,
		chunks: blocks.length,
		provider: provider.name,
		seconds: (Date.now() - started) / 1000,
		covered: covered.reduce((n, r) => n + r.last - r.first + 1, 0),
		matted,
		ranges: covered,
		written
	});
	if (await upToDate(opts.output, key)) return result(0, false);
	const missing = blocks.filter((k) => !existsSync(plan.file(k)));
	for (const run of blockRuns(missing)) await matteBlocks(input, info, run, provider, plan, opts);
	const matted = missing.reduce((n, k) => {
		const b = blockFramesOf(k, size, info.frames);
		return n + b.last - b.first + 1;
	}, 0);
	const masks = blockRuns(blocks).map((run) =>
		Array.from({ length: run.last - run.first + 1 }, (_, i) => plan.file(run.first + i))
	);
	await publishMatte(info, masks, covered, opts.output, {
		version: 2,
		source: { file: path.basename(input), fingerprint: source, frames: info.frames, fps: info.fps },
		matte: { fingerprint: '' },
		ranges: covered.map((r) => [r.first, r.last]),
		provider: provider.name,
		key
	});
	return result(matted, true);
}

/**
 * Joins the block masks and black gaps into the full-length matte next to `output`, then
 * publishes it: the ranges file (naming the new matte's fingerprint) is renamed into place
 * first, the matte second, so a run stopped between the two leaves a ranges file that the
 * matte present does not match (an error, never a silent black matte).
 */
async function publishMatte(
	info: VideoInfo,
	masks: string[][],
	covered: FrameRange[],
	output: string,
	file: MatteRangesFile
): Promise<void> {
	const work = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-'));
	const tag = `tmp-${process.pid}-${randomUUID()}`;
	const tmpMatte = `${output}.${tag}${path.extname(output) || '.mp4'}`;
	const tmpRanges = `${rangesFileOf(output)}.${tag}`;
	try {
		const pieces: string[] = [];
		for (const [n, piece] of matteLayout(covered, info.frames).entries()) {
			if ('gap' in piece) {
				const gap = path.join(work, `gap-${n}.mp4`);
				await blackVideo(gap, info, piece.gap);
				pieces.push(gap);
				continue;
			}
			// A covered run is its blocks, in order.
			pieces.push(...masks[piece.range]);
		}
		const joined = path.join(work, `matte${path.extname(output) || '.mp4'}`);
		await joinMasks(pieces, joined, info.fps, info.frames, work);
		await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
		await fs.copyFile(joined, tmpMatte);
		const written = { ...file, matte: { fingerprint: await fileFingerprint(tmpMatte) } };
		await fs.writeFile(tmpRanges, JSON.stringify(written, null, '\t') + '\n');
		await fs.rename(tmpRanges, rangesFileOf(output));
		await fs.rename(tmpMatte, output);
	} finally {
		await fs.rm(work, { recursive: true, force: true });
		await fs.rm(tmpMatte, { force: true });
		await fs.rm(tmpRanges, { force: true });
	}
}

/** Whether the matte at `output` is the one its ranges file says `key` made, unchanged. */
async function upToDate(output: string, key: string): Promise<boolean> {
	const file = await fs
		.readFile(rangesFileOf(output), 'utf8')
		.then((text) => JSON.parse(text) as MatteRangesFile)
		.catch(() => null);
	if (!file || file.key !== key || !existsSync(output)) return false;
	return file.matte?.fingerprint === (await fileFingerprint(output));
}
