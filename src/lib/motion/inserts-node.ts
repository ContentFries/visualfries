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
	PARTIAL_CLIP,
	pipeFrames,
	PRORES_4444,
	writeRenderManifest,
	type LoadedMotionProject,
	type MotionPage,
	type RenderedClip
} from './node.js';
import { assertProgramRenders } from './program-node.js';
import { removeOrphans, trackPartial } from './partials.js';
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
	assertJobs(opts.jobs);
	const program = resolveProgram(loaded.project, loaded.inputs);
	assertProgramRenders(program);
	const plans = planInserts(program, loaded.project, { handles: opts.handles, clips: opts.clips });
	if (!plans.length) throw new Error('The program has no clips, so it has no inserts.');
	const single = assertInsertsOutput(opts.output, plans, program.format.size);
	await fs.mkdir(single ? path.dirname(single) : opts.output, { recursive: true });
	// Partial encodes left by a render that was killed before it could clean up.
	await removeOrphans(single ? path.dirname(single) : opts.output, PARTIAL_CLIP);
	for (const note of insertNotes(program, loaded.project).filter((n) => !n.clip))
		opts.onProgress?.(note.message);
	for (const p of plans) for (const note of p.notes) opts.onProgress?.(`${p.id}: ${note}`);

	// Only the blocks of the clips rendered; the footage covers the program all the same.
	const bundle = await bundleMotionProject(
		loaded,
		plans.map((p) => p.clip)
	);
	const jobs = opts.jobs ?? Math.min(6, os.cpus().length);
	const results: RenderedClip[] = [];
	// Launched inside the try: the bundle is removed even when no browser starts.
	let browser: Awaited<ReturnType<typeof launch>> | undefined;
	try {
		const started = await launch();
		browser = started;
		for (const plan of plans) {
			const file = single ?? path.resolve(opts.output, `${plan.id}${insertExt(plan)}`);
			const r = await renderInsert(
				{ loaded, program, plan, bundle, browser: started, jobs, file },
				opts
			);
			results.push(r);
			opts.onProgress?.(
				`${plan.id}: ${plan.frames} frames (${plan.handles.before} + ${plan.clip.frames} + ${plan.handles.after}) in ${r.seconds.toFixed(1)} s (${r.mode})`
			);
		}
	} finally {
		await browser?.close();
		await fs.rm(bundle.dir, { recursive: true, force: true });
	}
	if (single) return results;
	await writeRenderManifest(loaded, opts.output, results, opts.onProgress, {
		export: 'inserts',
		frames: program.frames
	});
	return results;
}

type InsertProgress = (msg: string) => void;
type InsertProgram = ReturnType<typeof resolveProgram>;
type InsertBundle = Awaited<ReturnType<typeof bundleMotionProject>>;

/** Transparent inserts are ProRes 4444 in a .mov; opaque ones are H.264 in an .mp4. */
const insertExt = (p: InsertPlan) => (p.alpha ? '.mov' : '.mp4');

function assertJobs(jobs: number | undefined): void {
	if (jobs !== undefined && !(Number.isInteger(jobs) && jobs > 0))
		throw new Error(`--jobs must be a positive integer, got ${jobs}.`);
}

/**
 * Checks `--output` against the inserts about to render, before anything is drawn. Returns the
 * file `--output name.mov` (or `.mp4`) names when one insert is rendered.
 */
function assertInsertsOutput(
	output: string,
	plans: InsertPlan[],
	[w, h]: [number, number]
): string | undefined {
	const single = /\.(mp4|mov)$/i.test(output) ? path.resolve(output) : undefined;
	if (single) {
		if (plans.length !== 1)
			throw new Error(
				`--output ${output} names one file, but ${plans.length} inserts would render. Pick one with --clip <id>, or pass a directory.`
			);
		if (path.extname(single).toLowerCase() !== insertExt(plans[0]))
			throw new Error(
				`Insert "${plans[0].id}" renders ${plans[0].alpha ? 'a transparent .mov' : 'an .mp4'}; use --output <name>${insertExt(plans[0])}.`
			);
	}
	for (const p of plans)
		if (!p.alpha && (w % 2 || h % 2))
			throw new Error(
				`Insert "${p.id}": size ${w}×${h} must be even for H.264. Use even dimensions, or leave out "alpha": false.`
			);
	return single;
}

type InsertJob = {
	loaded: LoadedMotionProject;
	program: InsertProgram;
	plan: InsertPlan;
	bundle: InsertBundle;
	browser: Awaited<ReturnType<typeof launch>>;
	jobs: number;
	file: string;
};

/** Renders one insert to `job.file` and describes it for the manifest. */
async function renderInsert(
	job: InsertJob,
	opts: { invalidate?: string; keepFrames?: boolean; onProgress?: InsertProgress }
): Promise<RenderedClip> {
	const { loaded, program, plan, bundle, browser, jobs, file } = job;
	const t0 = Date.now();
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
	const untrack = trackPartial(partial);
	try {
		await encodeInsert(plan, program.fps, jobs, open, encode, opts);
		await fs.rename(partial, file);
	} finally {
		await fs.rm(partial, { force: true });
		untrack();
	}
	return {
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
}

/** Pipes frames straight into ffmpeg; when that fails, renders again through frame files. */
async function encodeInsert(
	plan: InsertPlan,
	fps: number,
	jobs: number,
	open: () => Promise<MotionPage>,
	encode: string[],
	opts: { keepFrames?: boolean; onProgress?: InsertProgress }
): Promise<void> {
	if (!opts.keepFrames) {
		try {
			const sink = ffmpegFramePipe([
				'-y',
				'-f',
				'image2pipe',
				'-framerate',
				String(fps),
				'-c:v',
				'png',
				'-i',
				'pipe:0',
				...encode
			]);
			await pipeFrames(plan.frames, Math.min(jobs, plan.frames), open, sink);
			return;
		} catch (error) {
			if (!(error instanceof FramePipeError)) throw error;
			opts.onProgress?.(
				`${plan.id}: piping frames to ffmpeg failed (${error.message.split('\n')[0]}); rendering again through frame files`
			);
		}
	}
	const clip = { id: plan.id, frames: plan.frames, fps };
	await framesThenEncode(clip, jobs, open, encode, opts.keepFrames);
}
