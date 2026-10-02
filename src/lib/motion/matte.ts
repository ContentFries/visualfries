import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { probeVideo } from './node.js';

/** BiRefNet v2 on fal.ai rejects videos longer than 512 frames. */
const FAL_MAX_FRAMES = 512;
const FAL_ENDPOINT = 'fal-ai/birefnet/v2/video';

export type MatteModel =
	| 'Matting'
	| 'Portrait'
	| 'General Use (Light)'
	| 'General Use (Light 2K)'
	| 'General Use (Heavy)'
	| 'General Use (Dynamic)';

export type MatteOptions = {
	output: string;
	/** BiRefNet model. `Matting` keeps hair; `Portrait` is tuned for people. */
	model?: MatteModel;
	resolution?: '1024x1024' | '2048x2048' | '2304x2304';
	/** Frames per fal.ai request (at most 512). */
	chunkFrames?: number;
	/** Requests running at once. */
	jobs?: number;
	falKey?: string;
	onProgress?: (message: string) => void;
	/** Injected in tests. */
	fetch?: typeof fetch;
};

export type MatteResult = {
	output: string;
	frames: number;
	fps: number;
	width: number;
	height: number;
	chunks: number;
	model: MatteModel;
	seconds: number;
};

/** Frame ranges `[first, last]` that cover `frames` in chunks of at most `size`. */
export function planMatteChunks(frames: number, size: number): { first: number; last: number }[] {
	if (!(size > 0 && size <= FAL_MAX_FRAMES))
		throw new Error(`Chunk size must be between 1 and ${FAL_MAX_FRAMES} frames, got ${size}.`);
	const chunks: { first: number; last: number }[] = [];
	for (let first = 0; first < frames; first += size)
		chunks.push({ first, last: Math.min(frames, first + size) - 1 });
	return chunks;
}

function run(cmd: string, args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
		let err = '';
		p.stderr.on('data', (d) => (err += d));
		p.on('error', reject);
		p.on('close', (code) =>
			code === 0 ? resolve() : reject(new Error(`${cmd} failed (${code}): ${err.slice(-600)}`))
		);
	});
}
const ffmpeg = (args: string[]) => run(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', ...args]);

type Fal = {
	key: string;
	fetch: typeof fetch;
};

async function falJson(fal: Fal, url: string, init: RequestInit = {}) {
	const response = await fal.fetch(url, {
		...init,
		headers: {
			Authorization: `Key ${fal.key}`,
			'Content-Type': 'application/json',
			...(init.headers ?? {})
		}
	});
	const text = await response.text();
	if (!response.ok) throw new Error(`fal.ai ${response.status} for ${url}: ${text.slice(0, 500)}`);
	return text ? JSON.parse(text) : {};
}

async function falUpload(fal: Fal, file: string): Promise<string> {
	const { upload_url: uploadUrl, file_url: fileUrl } = await falJson(
		fal,
		'https://rest.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3',
		{
			method: 'POST',
			body: JSON.stringify({ content_type: 'video/mp4', file_name: path.basename(file) })
		}
	);
	const put = await fal.fetch(uploadUrl, {
		method: 'PUT',
		body: new Uint8Array(await fs.readFile(file)),
		headers: { 'Content-Type': 'video/mp4' }
	});
	if (!put.ok) throw new Error(`fal.ai upload failed: ${put.status} ${await put.text()}`);
	return fileUrl;
}

/** A request still queued or running after this long is abandoned. */
const FAL_REQUEST_TIMEOUT_MS = 20 * 60 * 1000;

async function falRun(fal: Fal, input: Record<string, unknown>): Promise<any> {
	const queued = await falJson(fal, `https://queue.fal.run/${FAL_ENDPOINT}`, {
		method: 'POST',
		body: JSON.stringify(input)
	});
	const deadline = Date.now() + FAL_REQUEST_TIMEOUT_MS;
	for (;;) {
		if (Date.now() > deadline)
			throw new Error(`fal.ai request ${queued.request_id} did not finish within 20 minutes.`);
		const status = await falJson(fal, queued.status_url);
		if (status.status === 'COMPLETED') break;
		if (status.status !== 'IN_QUEUE' && status.status !== 'IN_PROGRESS')
			throw new Error(`fal.ai request ${queued.request_id} ended as ${status.status}.`);
		await new Promise((r) => setTimeout(r, 2000));
	}
	return falJson(fal, queued.response_url);
}

/**
 * Makes a greyscale matte video of `input` (white = subject) with BiRefNet v2 on fal.ai:
 * splits the video into chunks the API accepts, keeps each chunk's frame count exact and
 * joins them, so the matte has the same size, frame rate and frame count as the input.
 */
export async function createSubjectMatte(input: string, opts: MatteOptions): Promise<MatteResult> {
	const key = opts.falKey ?? process.env.FAL_KEY;
	if (!key) throw new Error('FAL_KEY is not set. Get a key at https://fal.ai/dashboard/keys.');
	const fal: Fal = { key, fetch: opts.fetch ?? fetch };
	const model = opts.model ?? 'Matting';
	const started = Date.now();
	const info = await probeVideo(input);
	if (!info.constant)
		throw new Error(
			`${input} has a variable frame rate. Convert it first, e.g. ffmpeg -i in.mp4 -vf fps=30 -c:a copy out.mp4.`
		);
	const chunks = planMatteChunks(info.frames, opts.chunkFrames ?? 480);
	const work = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-matte-'));
	const log = opts.onProgress ?? (() => {});
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
				const videoUrl = await falUpload(fal, part);
				const result = await falRun(fal, {
					video_url: videoUrl,
					model,
					operating_resolution: opts.resolution ?? '1024x1024',
					output_mask: true,
					refine_foreground: false,
					video_output_type: 'X264 (.mp4)',
					video_quality: 'maximum'
				});
				const maskUrl = result.mask_video?.url;
				if (!maskUrl) throw new Error(`fal.ai returned no mask for frames ${first}–${last}.`);
				const raw = path.join(work, `mask-raw-${i}.mp4`);
				const response = await fal.fetch(maskUrl);
				if (!response.ok) throw new Error(`Mask download failed: ${response.status}`);
				await fs.writeFile(raw, Buffer.from(await response.arrayBuffer()));
				// Up to two missing frames are normal and padded below; more means a wrong mask.
				const rawFrames = (await probeVideo(raw)).frames;
				if (rawFrames < count - 2 || rawFrames > count + 2)
					throw new Error(
						`fal.ai mask for frames ${first}–${last} has ${rawFrames} frames, expected ${count}.`
					);
				// The API may return a frame less; hold the last frame so chunks stay aligned.
				const fixed = path.join(work, `mask-${i}.mp4`);
				await ffmpeg([
					'-i',
					raw,
					'-vf',
					`fps=${info.fps},scale=${info.width}:${info.height},format=gray,tpad=stop_mode=clone:stop=${count}`,
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
				done[i] = fixed;
				log(`matte: frames ${first}–${last} done (${i + 1}/${chunks.length})`);
			}
		};
		// The first failure stops the other workers from sending more paid requests; the work
		// folder is removed only after every worker has stopped.
		const results = await Promise.allSettled(
			Array.from({ length: Math.min(opts.jobs ?? 3, chunks.length) }, () =>
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
			model,
			seconds: (Date.now() - started) / 1000
		};
	} finally {
		await fs.rm(work, { recursive: true, force: true });
	}
}
