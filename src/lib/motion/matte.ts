import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { probeVideo } from './node.js';

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

// ---------------------------------------------------------------- pipeline

export type MatteOptions = {
	output: string;
	/** Who segments the video. Default: `falBiRefNet({ model, resolution, key: falKey })`. */
	provider?: MatteProvider;
	/** Frames per piece; at most the provider's `maxFrames`. Default: 480 or the provider limit. */
	chunkFrames?: number;
	/** Pieces running at once. Default: the provider's `parallel`. */
	jobs?: number;
	onProgress?: (message: string) => void;
	/** For the default fal.ai provider. */
	model?: BiRefNetModel;
	resolution?: '1024x1024' | '2048x2048' | '2304x2304';
	falKey?: string;
	fetch?: typeof fetch;
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

/**
 * Makes a greyscale matte video of `input` (white = subject) with a matte provider: splits the
 * video into pieces the provider accepts, checks and normalises every mask and joins them, so
 * the matte has the same size, frame rate and frame count as the input.
 */
export async function createSubjectMatte(input: string, opts: MatteOptions): Promise<MatteResult> {
	const provider =
		opts.provider ??
		falBiRefNet({
			key: opts.falKey,
			model: opts.model,
			resolution: opts.resolution,
			fetch: opts.fetch
		});
	const started = Date.now();
	const info = await probeVideo(input);
	if (!info.constant)
		throw new Error(
			`${input} has a variable frame rate. Convert it first, e.g. ffmpeg -i in.mp4 -vf fps=30 -c:a copy out.mp4.`
		);
	const size = opts.chunkFrames ?? Math.min(480, provider.maxFrames, info.frames);
	const chunks = planMatteChunks(info.frames, size, provider.maxFrames);
	const work = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-'));
	const log = opts.onProgress ?? (() => {});
	const extract = provider.output === 'alpha' ? 'format=rgba,alphaextract' : 'format=gray';
	try {
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
				const alphaDecoder =
					provider.output === 'alpha' ? await checkAlpha(raw, provider.name) : [];
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
		// the work folder is removed only after every worker has stopped.
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
		const list = path.join(work, 'list.txt');
		await fs.writeFile(list, done.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
		await fs.mkdir(path.dirname(path.resolve(opts.output)), { recursive: true });
		await ffmpeg([
			'-f',
			'concat',
			'-safe',
			'0',
			'-i',
			list,
			'-r',
			String(info.fps),
			'-c:v',
			'libx264',
			'-crf',
			'10',
			'-pix_fmt',
			'yuv420p',
			'-movflags',
			'+faststart',
			opts.output
		]);
		const out = await probeVideo(opts.output);
		if (out.frames !== info.frames)
			throw new Error(`Matte has ${out.frames} frames, the input has ${info.frames}.`);
		return {
			output: opts.output,
			frames: out.frames,
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
