import { spawn } from 'node:child_process';
export function createFfmpegImagePipeArgs(options) {
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
export function createMuxAudioArgs(input) {
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
        '-af',
        'apad',
        '-shortest',
        '-movflags',
        '+faststart',
        input.outputPath
    ];
}
export class PipeFrameEncoder {
    #options;
    #proc = null;
    #exitPromise = null;
    #stderrTail = '';
    #startedAt = 0;
    constructor(options) {
        this.#options = options;
    }
    start() {
        if (this.#proc)
            return;
        this.#startedAt = Date.now();
        this.#proc = spawn(process.env.FFMPEG_PATH || 'ffmpeg', createFfmpegImagePipeArgs(this.#options), {
            stdio: ['pipe', 'ignore', 'pipe']
        });
        this.#exitPromise = new Promise((resolve) => {
            let settled = false;
            const settle = (result) => {
                if (settled)
                    return;
                settled = true;
                resolve(result);
            };
            this.#proc?.once('error', (error) => {
                settle({
                    code: null,
                    error: new Error(`PipeFrameEncoder failed to start ffmpeg: ${error.message}`)
                });
            });
            this.#proc?.once('close', (code) => settle({ code }));
        });
        this.#proc.stderr?.on('data', (chunk) => {
            const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
            if (this.#options.debug)
                process.stderr.write(`[ffmpeg][visualfries-pipe] ${text}`);
            this.#stderrTail = (this.#stderrTail + text).slice(-4000);
        });
    }
    get #stdin() {
        if (!this.#proc?.stdin) {
            throw new Error('PipeFrameEncoder not started.');
        }
        return this.#proc.stdin;
    }
    async writeFrame(buffer) {
        if (!this.#proc)
            this.start();
        let ok = false;
        try {
            ok = this.#stdin.write(buffer);
        }
        catch (error) {
            const exitResult = await this.#exitPromise;
            if (exitResult?.error)
                throw exitResult.error;
            throw error;
        }
        if (ok)
            return;
        const waitForDrain = new Promise((resolve, reject) => {
            const cleanup = () => {
                this.#stdin.off('drain', onDrain);
                this.#stdin.off('error', onError);
            };
            const onDrain = () => {
                cleanup();
                resolve();
            };
            const onError = (error) => {
                cleanup();
                reject(error);
            };
            this.#stdin.on('drain', onDrain);
            this.#stdin.on('error', onError);
        });
        const waitForExit = this.#exitPromise?.then((result) => {
            if (result.error)
                throw result.error;
            if (result.code !== 0) {
                throw new Error(`PipeFrameEncoder failed with exit code ${result.code}. ${this.#stderrTail}`);
            }
        });
        await (waitForExit ? Promise.race([waitForDrain, waitForExit]) : waitForDrain);
    }
    async finish() {
        if (!this.#proc)
            return { elapsedMs: 0 };
        const proc = this.#proc;
        await new Promise((resolve, reject) => {
            if (!proc.stdin || proc.stdin.destroyed) {
                resolve();
                return;
            }
            const onError = (error) => {
                proc.stdin?.off('finish', onFinish);
                reject(error);
            };
            const onFinish = () => {
                proc.stdin?.off('error', onError);
                resolve();
            };
            proc.stdin.once('error', onError);
            proc.stdin.end(onFinish);
        }).catch(async (error) => {
            const exitResult = await this.#exitPromise;
            if (exitResult?.error)
                return;
            throw error;
        });
        const result = await (this.#exitPromise ??
            Promise.resolve({ code: null }));
        this.#proc = null;
        this.#exitPromise = null;
        if (result.error) {
            throw new Error(`${result.error.message}. ${this.#stderrTail}`.trim());
        }
        if (result.code !== 0) {
            throw new Error(`PipeFrameEncoder failed with exit code ${result.code}. ${this.#stderrTail}`);
        }
        return { elapsedMs: Date.now() - this.#startedAt };
    }
    abort() {
        if (!this.#proc)
            return;
        try {
            this.#proc.kill('SIGKILL');
        }
        catch {
            // Best effort cleanup.
        }
        this.#proc = null;
    }
}
export async function muxAudioWithVideo(input) {
    await new Promise((resolve, reject) => {
        const proc = spawn(process.env.FFMPEG_PATH || 'ffmpeg', createMuxAudioArgs(input), {
            stdio: ['ignore', 'ignore', 'pipe']
        });
        let stderrTail = '';
        proc.stderr?.on('data', (chunk) => {
            const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
            if (input.debug)
                process.stderr.write(`[ffmpeg][visualfries-mux] ${text}`);
            stderrTail = (stderrTail + text).slice(-4000);
        });
        proc.on('error', reject);
        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error(`Audio mux failed with exit code ${code}. ${stderrTail}`));
            }
        });
    });
}
