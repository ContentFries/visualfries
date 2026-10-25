// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject, motionProgram } from '../../src/lib/motion/node.js';
import { captureProgramFrames, checkProgram } from '../../src/lib/motion/program-node.js';
import { renderProgramVideo, type RenderedProgram } from '../../src/lib/motion/program-render.js';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

const W = 320;
const H = 180;
const FPS = 30;
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
/** The upper half of a frame, where the label and the test's end card never draw. */
const upper = (frame: Buffer) => frame.subarray(0, (H / 2) * W * 3);

/** A label that moves with clip time, so a clip cut by the excerpt shows where it is. */
const LABEL = `<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>
<div class="label" style="transform: translateX({(clip.t * 40).toFixed(2)}px)">{clip.props.text}</div>
<style>
	.label { position: absolute; left: 10px; top: 120px; font: 900 32px sans-serif; color: #ffee00; }
</style>
`;
/** An end card that draws a bar low in the frame only, so the held picture shows above it. */
const BAR = `<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>
<div class="bar" style="width: {Math.round(clip.p(0, 0.3) * 300)}px"></div>
<style>
	.bar { position: absolute; left: 10px; bottom: 10px; height: 30px; background: #00e0ff; }
</style>
`;

/**
 * Program frames 0–29, 30–59 and 60–89 show source frames 15–44, 90–119 and 150–179, hard cuts.
 * A punch-in moves in from 0.6 s (0.3 s), the label runs from 0.5 s to 2.2 s. The excerpt is
 * 0.8–2.5 s: it starts inside the punch-in's move and the label, across the first hard cut.
 */
const PROJECT = {
	size: [W, H],
	fps: FPS,
	background: '#000000',
	footage: { num: { src: 'num.mp4' } },
	cuts: [
		{ id: 'a', source: 'num', in: 0.5, out: 1.5 },
		{ id: 'b', source: 'num', in: 3, out: 4 },
		{ id: 'c', source: 'num', in: 5, out: 6 }
	],
	shots: [{ id: 'in', shot: 'punch', from: 0.6, until: 1.4, morph: 0.3 }],
	clips: [{ id: 'label', block: 'Label.svelte', from: 0.5, until: 2.2, props: { text: 'LABEL' } }],
	excerpts: [
		{ id: 'tease', from: 0.8, until: 2.5, end: { duration: 0.5, block: 'Bar.svelte' } },
		{
			id: 'card',
			from: 0.8,
			until: 1.5,
			format: `${H}x${W}`,
			end: { duration: 1, props: { lines: ['Full video', 'on the channel'], handle: '@test' } }
		}
	]
};
const A = 24;
const N = 51;
const E = 15;

describe.skipIf(!hasChromium || !hasFfmpeg)('excerpt render', () => {
	let dir: string;
	let file: string;
	let rendered: RenderedProgram;

	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-excerpt-render-'));
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
			'-threads',
			'2',
			path.join(dir, 'num.mp4')
		]);
		await fs.writeFile(path.join(dir, 'Label.svelte'), LABEL);
		await fs.writeFile(path.join(dir, 'Bar.svelte'), BAR);
		await fs.writeFile(file, JSON.stringify(PROJECT));
		rendered = await renderProgramVideo(await loadMotionProject(file), {
			output: path.join(dir, 'out'),
			excerpt: 'tease',
			jobs: 2
		});
	}, 150_000);
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('renders the excerpt with its end card as <name>.<id>.mp4, mixed', async () => {
		expect(path.basename(rendered.file)).toBe('program.tease.mp4');
		expect(rendered.frames).toBe(N + E);
		expect(rendered.audio).toBe('mixed');
		const saved = JSON.parse(await fs.readFile(rendered.program, 'utf8'));
		expect(saved.excerpt).toMatchObject({ id: 'tease', startFrame: A, frames: N });
		expect(existsSync(path.join(dir, '.visualfries', 'program', `tease.${W}x${H}.json`))).toBe(
			true
		);
		const sound = spawnSync('ffprobe', [
			'-v',
			'error',
			'-select_streams',
			'a',
			'-show_entries',
			'stream=duration',
			'-of',
			'csv=p=0',
			rendered.file
		]);
		expect(Number(String(sound.stdout))).toBeCloseTo((N + E) / FPS, 1);
	});

	it('draws each frame of the slice exactly as the whole program draws it', async () => {
		const loaded = await loadMotionProject(file);
		// Inside the punch-in's move, across the hard cut, the label's last frames, the last frame.
		const sample = [0, 1, 3, 5, 6, 10, 20, 35, 45, N - 1];
		const whole = await captureProgramFrames(
			loaded,
			sample.map((i) => A + i)
		);
		const frames = Buffer.concat(rendered.segments.map((s) => rgb(s.file)));
		expect(frames.length).toBe((N + E) * FRAME);
		for (const i of sample)
			expect(frameOf(frames, i).equals(rgb(whole.get(A + i)!)), `excerpt frame ${i}`).toBe(true);
	}, 150_000);

	it('holds the last frame under the end card while the card plays', () => {
		const frames = Buffer.concat(rendered.segments.map((s) => rgb(s.file)));
		const last = upper(frameOf(frames, N - 1));
		for (const i of [N, N + 4, N + E - 1])
			expect(upper(frameOf(frames, i)).equals(last), `end card frame ${i}`).toBe(true);
		// The card itself moves: its bar grows.
		expect(frameOf(frames, N).equals(frameOf(frames, N + E - 1))).toBe(false);
	});

	it('takes the excerpt from the cache when nothing in it changed', async () => {
		const again = await renderProgramVideo(await loadMotionProject(file), {
			output: path.join(dir, 'out'),
			excerpt: 'tease'
		});
		expect(again.segments.every((s) => s.cached)).toBe(true);
		// The whole program's render keeps the excerpt's intermediates (each records its own).
		await renderProgramVideo(await loadMotionProject(file), { output: path.join(dir, 'out') });
		for (const s of again.segments) expect(existsSync(s.file)).toBe(true);
	}, 150_000);

	it('checks an excerpt with the built-in end card in its own format', async () => {
		const loaded = await loadMotionProject(file);
		const { program } = await motionProgram(loaded, { excerpt: 'card' });
		expect(program.format.name).toBe(`${H}x${W}`);
		expect(program.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		// It starts inside the punch-in's move: a warning says so.
		expect(
			program.diagnostics.some(
				(d) => d.item === 'card' && /inside the move into shot "in"/.test(d.message)
			)
		).toBe(true);
		const results = await checkProgram(loaded, { excerpt: 'card' });
		expect(results.flatMap((r) => r.errors)).toEqual([]);
		expect(results.every((r) => r.ok)).toBe(true);
	}, 150_000);
});
