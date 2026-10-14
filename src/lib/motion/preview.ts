/**
 * A review cut of the whole program: the editor's rough cut with every rendered clip laid over it in
 * its visible window (placement), plus optional extra audio (sound effects). One ffmpeg graph with
 * ~50 overlays runs out of threads (EAGAIN), so the program is composed in time chunks that only
 * open the clips intersecting them, then concatenated losslessly and muxed with the audio.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { Placed } from './placement.js';

export type PreviewOptions = {
	base: string;
	/** Clips with files (absolute or relative to `clipsDir`) and visible windows. */
	placed: (Placed & { file: string })[];
	clipsDir: string;
	output: string;
	fps: number;
	size?: [number, number];
	/** Program length; default: the base video's duration. */
	duration?: number;
	chunkSeconds?: number;
	/** Extra audio mixed with the base audio (e.g. a sound-effects preview track). */
	mix?: string[];
	crf?: number;
	onProgress?: (msg: string) => void;
};

function run(args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
		let err = '';
		p.stderr.on('data', (d) => (err += d));
		p.on('error', reject);
		p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${err.slice(-1200)}`))));
	});
}

function probeDuration(file: string): Promise<number> {
	return new Promise((resolve, reject) => {
		const p = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
		let out = '';
		p.stdout.on('data', (d) => (out += d));
		p.on('error', reject);
		p.on('close', (code) => (code === 0 ? resolve(Number(out.trim())) : reject(new Error(`ffprobe failed on ${file}`))));
	});
}

/** The chunks' overlay plans (exported for tests): which clips each chunk opens and when they show. */
export function previewChunks(placed: Placed[], duration: number, chunkSeconds: number) {
	const chunks: { t0: number; t1: number; clips: Placed[] }[] = [];
	for (let t0 = 0; t0 < duration - 1e-6; t0 += chunkSeconds) {
		const t1 = Math.min(duration, t0 + chunkSeconds);
		chunks.push({ t0, t1, clips: placed.filter((p) => p.out > t0 && p.in < t1) });
	}
	return chunks;
}

export async function renderPreview(opts: PreviewOptions): Promise<{ output: string; chunks: number; seconds: number }> {
	const t = Date.now();
	const [w, h] = opts.size ?? [1280, 720];
	const duration = opts.duration ?? (await probeDuration(opts.base));
	const chunks = previewChunks(opts.placed, duration, opts.chunkSeconds ?? 60);
	const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-preview-'));
	try {
		const parts: string[] = [];
		for (const [i, c] of chunks.entries()) {
			const frames = Math.round(c.t1 * opts.fps) - Math.round(c.t0 * opts.fps);
			const args = ['-y', '-v', 'error', '-ss', c.t0.toFixed(3), '-t', (c.t1 - c.t0).toFixed(3), '-i', opts.base];
			const graph = [`[0:v]fps=${opts.fps},scale=${w}:${h},setsar=1,setpts=PTS-STARTPTS[b0]`];
			let last = 'b0';
			c.clips.forEach((p, k) => {
				const n = k + 1;
				const file = path.isAbsolute(p.file) ? p.file : path.join(opts.clipsDir, p.file);
				// one decoder thread per input: dozens of inputs with default threading hit EAGAIN
				args.push('-threads', '1', '-itsoffset', (p.programStart - c.t0).toFixed(3), '-i', file);
				graph.push(`[${n}:v]scale=${w}:${h},format=yuva420p[i${n}]`);
				graph.push(
					`[${last}][i${n}]overlay=eof_action=pass:enable='between(t,${(p.in - c.t0).toFixed(3)},${(p.out - c.t0 - 0.001).toFixed(3)})'[b${n}]`
				);
				last = `b${n}`;
			});
			const part = path.join(tmp, `${String(i).padStart(4, '0')}.mp4`);
			args.push('-filter_complex', graph.join(';'), '-map', `[${last}]`, '-frames:v', String(frames), '-an',
				'-c:v', 'libx264', '-preset', 'veryfast', '-crf', String(opts.crf ?? 23), '-pix_fmt', 'yuv420p', '-r', String(opts.fps), part);
			await run(args);
			parts.push(part);
			opts.onProgress?.(`preview ${i + 1}/${chunks.length}: ${c.t0.toFixed(0)}–${c.t1.toFixed(0)} s, ${c.clips.length} clips`);
		}
		const list = path.join(tmp, 'list.txt');
		await fs.writeFile(list, parts.map((p) => `file '${p}'`).join('\n'));
		const mix = opts.mix ?? [];
		const audio = mix.length
			? ['-filter_complex', `${['[1:a]', ...mix.map((_, k) => `[${k + 2}:a]`)].join('')}amix=inputs=${mix.length + 1}:normalize=0:duration=first[a]`, '-map', '0:v', '-map', '[a]']
			: ['-map', '0:v', '-map', '1:a?'];
		await fs.mkdir(path.dirname(path.resolve(opts.output)), { recursive: true });
		await run(['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', opts.base, ...mix.flatMap((m) => ['-i', m]),
			...audio, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-t', duration.toFixed(3), opts.output]);
	} finally {
		await fs.rm(tmp, { recursive: true, force: true });
	}
	return { output: opts.output, chunks: chunks.length, seconds: (Date.now() - t) / 1000 };
}
