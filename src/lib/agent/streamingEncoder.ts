import { spawn } from 'node:child_process';
import type { Writable } from 'node:stream';

export type StreamEncoderFrameExtension = 'jpg' | 'png';

export type PipeFrameEncoderOptions = {
	fps: number;
	inputExt: StreamEncoderFrameExtension;
	outputPath: string;
	crf?: number;
	preset?: string;
	debug?: boolean;
};

export function createFfmpegImagePipeArgs(options: PipeFrameEncoderOptions): string[] {
	return [
		'-y',
		'-f',
		'image2pipe',
		'-framerate',
		String(options.fps),
		'-vcodec',
		options.inputExt === 'png' ? 'png' : 'mjpeg',
		'-i',
		'pipe:0',
		'-an',
		'-c:v',
		'libx264',
		'-pix_fmt',
		'yuv420p',
		'-movflags',
		'+faststart',
		'-crf',
		String(options.crf ?? 18),
		'-preset',
		options.preset ?? 'veryfast',
		options.outputPath
	];
}

export function createMuxAudioArgs(input: {
	videoPath: string;
	audioPath: string;
	outputPath: string;
}): string[] {
	return [
		'-y',
		'-i',
		input.videoPath,
		'-i',
		input.audioPath,
		'-map',
		'0:v:0',
		'-map',
		'1:a:0?',
		'-c:v',
		'copy',
		'-c:a',
		'aac',
		'-b:a',
		'192k',
		'-shortest',
		'-movflags',
		'+faststart',
		input.outputPath
	];
}

export class PipeFrameEncoder {
	#options: PipeFrameEncoderOptions;
	#proc: ReturnType<typeof spawn> | null = null;
	#stderrTail = '';
	#startedAt = 0;

	constructor(options: PipeFrameEncoderOptions) {
		this.#options = options;
	}

	start(): void {
		if (this.#proc) return;
		this.#startedAt = Date.now();
		this.#proc = spawn(process.env.FFMPEG_PATH || 'ffmpeg', createFfmpegImagePipeArgs(this.#options), {
			stdio: ['pipe', 'ignore', 'pipe']
		});
		this.#proc.stderr?.on('data', (chunk: Buffer | string) => {
			const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
			if (this.#options.debug) process.stderr.write(`[ffmpeg][visualfries-pipe] ${text}`);
			this.#stderrTail = (this.#stderrTail + text).slice(-4000);
		});
	}

	get #stdin(): Writable {
		if (!this.#proc?.stdin) {
			throw new Error('PipeFrameEncoder not started.');
		}
		return this.#proc.stdin;
	}

	async writeFrame(buffer: Buffer): Promise<void> {
		if (!this.#proc) this.start();
		const ok = this.#stdin.write(buffer);
		if (ok) return;

		await new Promise<void>((resolve, reject) => {
			const cleanup = () => {
				this.#stdin.off('drain', onDrain);
				this.#stdin.off('error', onError);
			};
			const onDrain = () => {
				cleanup();
				resolve();
			};
			const onError = (error: Error) => {
				cleanup();
				reject(error);
			};
			this.#stdin.on('drain', onDrain);
			this.#stdin.on('error', onError);
		});
	}

	async finish(): Promise<{ elapsedMs: number }> {
		if (!this.#proc) return { elapsedMs: 0 };
		const proc = this.#proc;
		await new Promise<void>((resolve) => {
			proc.stdin?.end(() => resolve());
		});
		const code = await new Promise<number | null>((resolve) => {
			proc.once('close', (exitCode) => resolve(exitCode));
		});
		this.#proc = null;

		if (code !== 0) {
			throw new Error(`PipeFrameEncoder failed with exit code ${code}. ${this.#stderrTail}`);
		}
		return { elapsedMs: Date.now() - this.#startedAt };
	}

	abort(): void {
		if (!this.#proc) return;
		try {
			this.#proc.kill('SIGKILL');
		} catch {
			// Best effort cleanup.
		}
		this.#proc = null;
	}
}

export async function muxAudioWithVideo(input: {
	videoPath: string;
	audioPath: string;
	outputPath: string;
	debug?: boolean;
}): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const proc = spawn(process.env.FFMPEG_PATH || 'ffmpeg', createMuxAudioArgs(input), {
			stdio: ['ignore', 'ignore', 'pipe']
		});
		let stderrTail = '';
		proc.stderr?.on('data', (chunk: Buffer | string) => {
			const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
			if (input.debug) process.stderr.write(`[ffmpeg][visualfries-mux] ${text}`);
			stderrTail = (stderrTail + text).slice(-4000);
		});
		proc.on('error', reject);
		proc.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Audio mux failed with exit code ${code}. ${stderrTail}`));
			}
		});
	});
}
