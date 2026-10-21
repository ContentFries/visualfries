// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject } from '../../src/lib/motion/node.js';
import { captureProgramFrames } from '../../src/lib/motion/program-node.js';
import { renderProgramVideo, type RenderedProgram } from '../../src/lib/motion/program-render.js';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

const W = 320;
const H = 180;
const FPS = 30;
/** Frame number bits: one 24 px column each along the top, white = 1. */
const BIT = 24;

function ffmpeg(args: string[], input?: Buffer): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		input,
		maxBuffer: 1 << 30
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

/** Every frame of a video (or the one frame of a PNG) as packed RGB. */
const rgb = (input: string | Buffer) =>
	ffmpeg(
		[
			'-i',
			typeof input === 'string' ? input : 'pipe:0',
			'-f',
			'rawvideo',
			'-pix_fmt',
			'rgb24',
			'pipe:1'
		],
		typeof input === 'string' ? undefined : input
	);
const FRAME = W * H * 3;
const frameOf = (raw: Buffer, i: number) => raw.subarray(i * FRAME, (i + 1) * FRAME);
const sha1 = (b: Buffer) => createHash('sha1').update(b).digest('hex');

function probe(file: string, entries: string, stream = 'v') {
	const out = spawnSync('ffprobe', [
		'-v',
		'error',
		'-count_frames',
		'-select_streams',
		stream,
		'-show_entries',
		entries,
		'-of',
		'json',
		file
	]);
	return JSON.parse(String(out.stdout));
}

/** A word on screen while the clip runs. */
const LABEL = `<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

<div class="label">{clip.props.text}</div>

<style>
	.label { position: absolute; left: 20px; top: 110px; font: 900 40px sans-serif; color: #ffee00; }
</style>
`;

/** A CSS filter landing on a nested canvas right before the paint: Chromium's renderer dies. */
const CRASH = `<script>
	import { useFrame } from 'visualfries/motion';
	let wrap = $state();
	useFrame(() => requestAnimationFrame(() => (wrap.style.filter = 'blur(1px)')));
</script>

<div bind:this={wrap}><canvas layoutsubtree width="320" height="180"><p>x</p></canvas></div>
`;

/**
 * Program frames 0–29, 30–59, 60–89 and 90–119 show source frames 15–44, 90–119, 150–179 and
 * 210–239. The first three cuts are hard (segments at 30 and 60); the last pushes in, so cuts
 * three and four share a segment. The label is on screen in the second segment only.
 */
function programJson(label: string, extra: object[] = []) {
	return JSON.stringify({
		size: [W, H],
		fps: FPS,
		background: '#000000',
		footage: { num: { src: 'num.mp4' } },
		cuts: [
			{ id: 'a', source: 'num', in: 0.5, out: 1.5 },
			{ id: 'b', source: 'num', in: 3, out: 4 },
			{ id: 'c', source: 'num', in: 5, out: 6 },
			{ id: 'd', source: 'num', in: 7, out: 8, transition: 'push' }
		],
		clips: [
			{ id: 'label', block: 'Label.svelte', from: 1.2, until: 1.8, props: { text: label } },
			...extra
		]
	});
}

describe.skipIf(!hasChromium || !hasFfmpeg)('program video render', () => {
	let dir: string;
	let file: string;
	let first: RenderedProgram;
	const out = (name: string) => path.join(dir, 'out', name);

	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-program-render-'));
		file = path.join(dir, 'program.vf.json');
		// 300 frames with the frame number in binary along the top, and a tone as the speech.
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			`color=black:s=${W}x${H}:r=${FPS}:d=10`,
			'-f',
			'lavfi',
			'-i',
			'sine=frequency=440:sample_rate=48000:duration=10',
			'-vf',
			`geq=lum='if(lt(Y,${BIT}),mod(floor(N/pow(2,floor(X/${BIT}))),2)*255,96)':cb=128:cr=128`,
			'-g',
			'30',
			'-pix_fmt',
			'yuv420p',
			'-c:a',
			'aac',
			'-shortest',
			path.join(dir, 'num.mp4')
		]);
		await fs.writeFile(path.join(dir, 'Label.svelte'), LABEL);
		await fs.writeFile(path.join(dir, 'Crash.svelte'), CRASH);
		await fs.writeFile(file, programJson('ONE'));
		first = await renderProgramVideo(await loadMotionProject(file), {
			output: out('a.mp4'),
			jobs: 6
		});
	}, 150_000);
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('renders every program frame once, with the speech and the program beside it', async () => {
		expect(first.frames).toBe(120);
		expect(first.segments.map((s) => [s.startFrame, s.frames, s.cached])).toEqual([
			[0, 30, false],
			[30, 30, false],
			[60, 60, false]
		]);
		const video = probe(first.file, 'stream=nb_read_frames,width,height,r_frame_rate');
		expect(video.streams[0]).toMatchObject({
			nb_read_frames: '120',
			width: W,
			height: H,
			r_frame_rate: '30/1'
		});
		expect(first.audio).toBe('speech');
		const sound = probe(first.file, 'stream=codec_name,sample_rate,duration', 'a');
		expect(sound.streams[0]).toMatchObject({ codec_name: 'aac', sample_rate: '48000' });
		expect(Number(sound.streams[0].duration)).toBeCloseTo(4, 1);
		const saved = JSON.parse(await fs.readFile(out('a.program.json'), 'utf8'));
		expect(saved.frames).toBe(120);
		// The program as resolved, the same as `visualfries program` saves (no extracted footage).
		const resolvedFile = path.join(dir, '.visualfries', 'program', `${W}x${H}.json`);
		expect(saved).toEqual(JSON.parse(await fs.readFile(resolvedFile, 'utf8')));
		expect(saved.clips[0].footage).toBeUndefined();
		expect(saved.segments.map((s: { hash: string }) => s.hash)).toEqual(
			first.segments.map((s) => s.hash)
		);
	});

	it('stores intermediates whose frames equal stills of the same program frames', async () => {
		const sample = [0, 15, 29, 30, 36, 45, 54, 59, 60, 84, 90, 96, 119];
		const stills = await captureProgramFrames(await loadMotionProject(file), sample);
		for (const s of first.segments) {
			const raw = rgb(s.file);
			expect(raw.length).toBe(s.frames * FRAME);
			for (const f of sample.filter((f) => f >= s.startFrame && f < s.startFrame + s.frames))
				expect(
					frameOf(raw, f - s.startFrame).equals(rgb(stills.get(f)!)),
					`program frame ${f}`
				).toBe(true);
		}
	}, 150_000);

	it('gives the same frames whether pages take whole segments or share one', async () => {
		const loaded = await loadMotionProject(file);
		const decoded = (r: RenderedProgram) => ({
			segments: r.segments.map((s) => sha1(rgb(s.file))),
			video: sha1(rgb(r.file))
		});
		const want = decoded(first);
		// Three segments: one page for all (1), a page per segment (2), pages sharing a segment's
		// frames (6, the first render), and three pages sharing frames on purpose.
		const runs = [{ jobs: 1 }, { jobs: 2 }, { jobs: 3, schedule: 'frames' as const }];
		for (const run of runs) {
			const { jobs } = run;
			const again = await renderProgramVideo(loaded, {
				output: out(`jobs${jobs}.mp4`),
				fresh: true,
				...run
			});
			expect(again.segments.every((s) => !s.cached)).toBe(true);
			expect(decoded(again), `--jobs ${jobs}`).toEqual(want);
		}
	}, 150_000);

	it('draws again only the segment of an edited clip', async () => {
		const before = await Promise.all(first.segments.map((s) => fs.stat(s.file)));
		await fs.writeFile(file, programJson('TWO'));
		const edited = await renderProgramVideo(await loadMotionProject(file), {
			output: out('edited.mp4')
		});
		expect(edited.segments.map((s) => s.cached)).toEqual([true, false, true]);
		expect(edited.segments[1].hash).not.toBe(first.segments[1].hash);
		for (const i of [0, 2]) {
			expect(edited.segments[i].file).toBe(first.segments[i].file);
			expect((await fs.stat(edited.segments[i].file)).mtimeMs).toBe(before[i].mtimeMs);
		}
		// The picture changed only where the label is.
		const a = rgb(first.file);
		const b = rgb(edited.file);
		const differ = [...Array(120).keys()].filter((f) => !frameOf(a, f).equals(frameOf(b, f)));
		expect(differ.length).toBeGreaterThan(0);
		expect(differ.every((f) => f >= 30 && f < 60)).toBe(true);
		await fs.writeFile(file, programJson('ONE'));
	}, 150_000);

	it('renders another format from the same project', async () => {
		const r = await renderProgramVideo(await loadMotionProject(file), {
			output: path.join(dir, 'out'),
			format: `${H}x${W}`
		});
		expect(path.basename(r.file)).toBe(`program.${H}x${W}.mp4`);
		expect(probe(r.file, 'stream=nb_read_frames,width,height').streams[0]).toMatchObject({
			nb_read_frames: '120',
			width: H,
			height: W
		});
	}, 150_000);

	it('fails at once when a page crashes, leaving no partial files', async () => {
		const crashDir = path.join(dir, 'crash');
		await fs.mkdir(crashDir);
		for (const name of ['num.mp4', 'Label.svelte', 'Crash.svelte'])
			await fs.copyFile(path.join(dir, name), path.join(crashDir, name));
		const crashFile = path.join(crashDir, 'program.vf.json');
		await fs.writeFile(
			crashFile,
			programJson('ONE', [{ id: 'crash', block: 'Crash.svelte', from: 0.2, until: 0.6 }])
		);
		const t0 = Date.now();
		const render = renderProgramVideo(await loadMotionProject(crashFile), {
			output: path.join(crashDir, 'out.mp4'),
			jobs: 2
		});
		await expect(render).rejects.toThrow(/Segment "seg1": the browser page crashed during frame/);
		expect(Date.now() - t0).toBeLessThan(30_000);
		const left = await fs.readdir(path.join(crashDir, '.visualfries', 'segments'));
		expect(left.filter((f) => f.includes('.partial-'))).toEqual([]);
		expect(await fs.readdir(crashDir)).not.toContain('out.mp4');
	}, 150_000);
});
