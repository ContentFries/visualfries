import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
	bundleMotionProject,
	ffmpegFramePipe,
	FramePipeError,
	framesThenEncode,
	H264_FINAL,
	launch,
	openStagePage,
	pipeFrames,
	PRORES_4444,
	writeRenderManifest,
	type LoadedMotionProject,
	type MotionPage,
	type RenderedClip
} from './node.js';
import { assertProgramRenders } from './program-node.js';
import { resolveProgram } from './program.js';
import { insertNotes, insertStage, planInserts, type InsertPlan } from './inserts.js';

/**
 * `render <program> --export inserts`: every clip of the program as its own file (see
 * `inserts.ts` for what an insert is), drawn on the program's stage with the clip alone, plus
 * `manifest.json` with each insert's program frames, handles and the cut list under it.
 */
export async function renderProgramInserts(
	loaded: LoadedMotionProject,
	opts: {
		output: string;
		clips?: string[];
		jobs?: number;
		/** Frames before and after each clip (default 10). */
		handles?: number;
		invalidate?: string;
		keepFrames?: boolean;
		onProgress?: (msg: string) => void;
	}
): Promise<RenderedClip[]> {
	if (opts.jobs !== undefined && !(Number.isInteger(opts.jobs) && opts.jobs > 0))
		throw new Error(`--jobs must be a positive integer, got ${opts.jobs}.`);
	const program = resolveProgram(loaded.project, loaded.inputs);
	assertProgramRenders(program);
	const plans = planInserts(program, loaded.project, { handles: opts.handles, clips: opts.clips });
	if (!plans.length) throw new Error('The program has no clips, so it has no inserts.');
	// `--output name.mov` (or `.mp4`) names the file itself when one insert is rendered.
	const single = /\.(mp4|mov)$/i.test(opts.output) ? path.resolve(opts.output) : undefined;
	const ext = (p: InsertPlan) => (p.alpha ? '.mov' : '.mp4');
	if (single) {
		if (plans.length !== 1)
			throw new Error(
				`--output ${opts.output} names one file, but ${plans.length} inserts would render. Pick one with --clip <id>, or pass a directory.`
			);
		if (path.extname(single).toLowerCase() !== ext(plans[0]))
			throw new Error(
				`Insert "${plans[0].id}" renders ${plans[0].alpha ? 'a transparent .mov' : 'an .mp4'}; use --output <name>${ext(plans[0])}.`
			);
	}
	const [w, h] = program.format.size;
	for (const p of plans)
		if (!p.alpha && (w % 2 || h % 2))
			throw new Error(
				`Insert "${p.id}": size ${w}×${h} must be even for H.264. Use even dimensions, or leave out "alpha": false.`
			);
	await fs.mkdir(single ? path.dirname(single) : opts.output, { recursive: true });
	for (const note of insertNotes(program, loaded.project).filter((n) => !n.clip))
		opts.onProgress?.(note.message);
	for (const p of plans) for (const note of p.notes) opts.onProgress?.(`${p.id}: ${note}`);

	const bundle = await bundleMotionProject(loaded, program.clips);
	const browser = await launch();
	const jobs = opts.jobs ?? Math.min(6, os.cpus().length);
	const results: RenderedClip[] = [];
	try {
		for (const plan of plans) {
			const t0 = Date.now();
			const file = single ?? path.resolve(opts.output, `${plan.id}${ext(plan)}`);
			// Encode next to the target and replace it only on success (see renderMotionClips).
			const partial = path.join(
				path.dirname(file),
				`.${path.basename(file, path.extname(file))}.partial-${process.pid}${path.extname(file)}`
			);
			const encode = [...(plan.alpha ? PRORES_4444 : H264_FINAL), partial];
			const data = insertStage(program, plan, bundle.footage, bundle.brand);
			let mode = '';
			// Pages take file frames; the stage takes program frames.
			const open = async (): Promise<MotionPage> => {
				const page = await openStagePage(
					browser,
					bundle,
					{
						name: `Insert "${plan.id}"`,
						size: program.format.size,
						alpha: plan.alpha,
						load: 'loadSegment',
						data
					},
					{ invalidate: opts.invalidate }
				);
				mode = page.mode;
				return { ...page, capture: (i) => page.capture(plan.startFrame + i) };
			};
			const clip = { id: plan.id, frames: plan.frames, fps: program.fps };
			let piped = !opts.keepFrames;
			try {
				if (piped) {
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
							...encode
						]);
						await pipeFrames(plan.frames, Math.min(jobs, plan.frames), open, sink);
					} catch (error) {
						if (!(error instanceof FramePipeError)) throw error;
						opts.onProgress?.(
							`${plan.id}: piping frames to ffmpeg failed (${error.message.split('\n')[0]}); rendering again through frame files`
						);
						piped = false;
					}
				}
				if (!piped) await framesThenEncode(clip, jobs, open, encode, opts.keepFrames);
				await fs.rename(partial, file);
			} finally {
				await fs.rm(partial, { force: true });
			}
			const r: RenderedClip = {
				id: plan.id,
				file,
				frames: plan.frames,
				programStartFrame: plan.startFrame,
				programStart: plan.startFrame / program.fps,
				programEnd: (plan.startFrame + plan.frames) / program.fps,
				alpha: plan.alpha,
				mode,
				seconds: (Date.now() - t0) / 1000,
				transcript: loaded.transcriptHash,
				...(loaded.musicHash ? { music: loaded.musicHash } : {}),
				brand: loaded.brand.hash,
				style: loaded.style.hash,
				handles: plan.handles,
				clip: { startFrame: plan.clip.startFrame, frames: plan.clip.frames },
				layer: plan.clip.layer,
				slot: plan.clip.slot,
				holdout: plan.holdout,
				sources: plan.sources,
				notes: plan.notes
			};
			results.push(r);
			opts.onProgress?.(
				`${plan.id}: ${plan.frames} frames (${plan.handles.before} + ${plan.clip.frames} + ${plan.handles.after}) in ${r.seconds.toFixed(1)} s (${mode})`
			);
		}
	} finally {
		await browser.close();
		await fs.rm(bundle.dir, { recursive: true, force: true });
	}
	if (single) return results;
	await writeRenderManifest(loaded, opts.output, results, opts.onProgress, {
		export: 'inserts',
		frames: program.frames
	});
	return results;
}
