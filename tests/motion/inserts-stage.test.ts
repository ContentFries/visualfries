// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject } from '../../src/lib/motion/node.js';
import { renderProgramInserts } from '../../src/lib/motion/inserts-node.js';
import { captureProgramFrames } from '../../src/lib/motion/program-node.js';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/** 320×180 footage at 30 fps, 4 s: a grey room and a light "head" swaying around x = 200. */
const W = 320;
const H = 180;
const HEAD = `(pow((X-(200+40*sin(2*PI*N/30)))/26,2)+pow((Y-100)/56,2))`;

function ffmpeg(args: string[], input?: Buffer): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		input,
		maxBuffer: 1 << 28
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

/** Every frame of a video as raw pixels (`rgba` or `gray`). */
function frames(file: string, pixFmt: 'rgba' | 'gray', filter = 'null'): Buffer[] {
	const raw = ffmpeg(['-i', file, '-vf', filter, '-f', 'rawvideo', '-pix_fmt', pixFmt, 'pipe:1']);
	const size = W * H * (pixFmt === 'rgba' ? 4 : 1);
	return Array.from({ length: raw.length / size }, (_, i) =>
		raw.subarray(i * size, (i + 1) * size)
	);
}

/** The alpha channel of every frame of a transparent insert. */
const alphas = (file: string) => frames(file, 'gray', 'format=rgba,alphaextract');

/** Program frame f shows source frame 15 + f (cut a) or 75 + (f − 30) (cut b). */
const sourceFrame = (f: number) => (f < 30 ? 15 + f : 75 + f - 30);

const sha1 = (b: Buffer) => createHash('sha1').update(b).digest('hex');
const solid = (color: string) =>
	`<div style="position:absolute;inset:0;background:${color}"></div>`;

describe.skipIf(!hasChromium || !hasFfmpeg)('render --export inserts from a program', () => {
	let dir: string;
	let file: string;
	let mattes: Buffer[];
	const project = (clips: object[]) => ({
		size: [W, H],
		fps: 30,
		background: '#000000',
		footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
		cuts: [
			{ id: 'a', source: 'talk', in: 0.5, out: 1.5 },
			{ id: 'b', source: 'talk', in: 2.5, out: 3.9 }
		],
		shots: [{ id: 'side', shot: 'strip', from: 1.6, until: 2.4 }],
		clips
	});
	const CLIPS = [
		{ id: 'word', block: 'Word.svelte', from: 0.4, until: 1.2, layer: 'behind' },
		{ id: 'lower', block: 'Bar.svelte', from: 0.2, until: 0.8 },
		{ id: 'panel', block: 'Panel.svelte', from: 1.6, until: 2.3, slot: 'panel' },
		{ id: 'card', block: 'Bar.svelte', from: 1, until: 1.3, alpha: false, background: '#203040' }
	];

	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-inserts-'));
		for (const [name, lum] of [
			['talk.mp4', `if(lt(${HEAD},1),190,96)`],
			['talk.matte.mp4', `if(lt(${HEAD},1),255,0)`]
		])
			ffmpeg([
				'-f',
				'lavfi',
				'-i',
				`color=black:s=${W}x${H}:r=30:d=4`,
				'-vf',
				`geq=lum='${lum}':cb=128:cr=128`,
				'-g',
				'30',
				'-pix_fmt',
				'yuv420p',
				path.join(dir, name)
			]);
		mattes = frames(path.join(dir, 'talk.matte.mp4'), 'gray');
		await fs.writeFile(path.join(dir, 'Word.svelte'), solid('#ffd000'));
		await fs.writeFile(path.join(dir, 'Panel.svelte'), solid('#2050ff'));
		// A bar whose width is the clip frame: held edge frames show as equal widths.
		await fs.writeFile(
			path.join(dir, 'Bar.svelte'),
			`<script>import { useClip } from 'visualfries/motion'; const clip = useClip();</script>
<div style="position:absolute;left:10px;top:140px;height:20px;background:#ff2040" style:width="{20 + clip.frame * 8}px"></div>`
		);
		file = path.join(dir, 'program.vf.json');
		await fs.writeFile(file, JSON.stringify(project(CLIPS)));
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('writes one file per clip and a manifest in program time, with handles and the cut list', async () => {
		const loaded = await loadMotionProject(file);
		const out = path.join(dir, 'out');
		await renderProgramInserts(loaded, { output: out, jobs: 3 });
		expect((await fs.readdir(out)).sort()).toEqual([
			'card.mp4',
			'lower.mov',
			'manifest.json',
			'panel.mov',
			'word.mov'
		]);
		const manifest = JSON.parse(await fs.readFile(path.join(out, 'manifest.json'), 'utf8'));
		expect([manifest.fps, manifest.size, manifest.export, manifest.frames]).toEqual([
			30,
			[W, H],
			'inserts',
			72
		]);
		const entry = (id: string) => manifest.clips.find((c: { id: string }) => c.id === id);
		// In program order by the file's first frame.
		expect(manifest.clips.map((c: { id: string }) => c.id)).toEqual([
			'lower',
			'word',
			'card',
			'panel'
		]);
		expect(entry('word')).toMatchObject({
			file: path.join(out, 'word.mov'),
			frames: 44,
			programStartFrame: 2,
			programStart: 2 / 30,
			programEnd: 46 / 30,
			alpha: true,
			handles: { before: 10, after: 10 },
			clip: { startFrame: 12, frames: 24 },
			layer: 'behind',
			slot: null,
			holdout: true,
			sources: [
				{ cut: 'a', source: 'talk', startFrame: 2, frames: 28, srcIn: 17, srcOut: 45 },
				{ cut: 'b', source: 'talk', startFrame: 30, frames: 16, srcIn: 75, srcOut: 91 }
			],
			notes: []
		});
		expect(entry('lower')).toMatchObject({
			frames: 34,
			programStartFrame: 0,
			handles: { before: 6, after: 10 },
			clip: { startFrame: 6, frames: 18 },
			sources: [
				{ cut: 'a', startFrame: 0, frames: 34 - 4, srcIn: 15, srcOut: 45 },
				{ cut: 'b', startFrame: 30, frames: 4, srcIn: 75, srcOut: 79 }
			]
		});
		expect(entry('card')).toMatchObject({ alpha: false, programStartFrame: 20, frames: 29 });
		expect(entry('panel')).toMatchObject({ slot: 'panel', handles: { before: 10, after: 3 } });
		expect(entry('panel').clip).toEqual({ startFrame: 48, frames: 21 });
		expect(entry('panel').notes).toEqual([expect.stringMatching(/frame coordinates/)]);
		// Frame counts of the files themselves.
		for (const c of manifest.clips) expect(frames(c.file, 'gray').length, c.id).toBe(c.frames);
	}, 300_000);

	it('holds the edge frames in the handles and draws the clip as the program does', async () => {
		const out = path.join(dir, 'out');
		// lower: file frames 0–5 are the handle before (the clip's first frame), 6–23 the clip,
		// 24–33 the handle after (its last frame).
		const lower = frames(path.join(out, 'lower.mov'), 'rgba');
		const width = (px: Buffer) => {
			let n = 0;
			for (let x = 0; x < W; x++) if (px[(150 * W + x) * 4 + 3] > 128) n++;
			return n;
		};
		expect([0, 5, 6, 7, 23, 24, 33].map((i) => width(lower[i]))).toEqual([
			20, 20, 20, 28, 156, 156, 156
		]);
		// Transparent wherever the clip draws nothing (no footage, no background).
		expect(lower[10][(20 * W + 200) * 4 + 3]).toBe(0);
		// Opaque insert: the bar over the clip's background.
		const card = frames(path.join(out, 'card.mp4'), 'rgba');
		const [r, g, b] = card[15].subarray((20 * W + 200) * 4);
		expect(Math.abs(r - 0x20) + Math.abs(g - 0x30) + Math.abs(b - 0x40)).toBeLessThan(8);
		// The panel follows its slot: the strip opens it on the right half once the morph settles,
		// and before the shot (in the handle) no slot is free, so nothing shows.
		const panel = alphas(path.join(out, 'panel.mov'));
		const opaque = (px: Buffer, x: number, y: number) => px[y * W + x] > 250;
		expect(opaque(panel[0], 300, 90)).toBe(false);
		// The morph into the strip takes 21 frames from frame 48; the file's last frame is 71.
		const settled = panel[panel.length - 1];
		expect(opaque(settled, 300, 90) && !opaque(settled, 20, 90)).toBe(true);
	}, 120_000);

	it('cuts the subject out of a behind clip, frame-exact through the cut list', async () => {
		const word = alphas(path.join(dir, 'out', 'word.mov'));
		// File frame i is program frame 2 + i; its holdout is the matte of the source frame the
		// cut list shows there, not of a frame before or after.
		const error = (alpha: Buffer, matte: Buffer) => {
			let sum = 0;
			for (let k = 0; k < alpha.length; k++) sum += Math.abs(alpha[k] - (255 - matte[k]));
			return sum / alpha.length;
		};
		// Frames where the head moves fastest (source frames near multiples of 15).
		for (const i of [0, 13, 27, 28, 43]) {
			const src = sourceFrame(2 + i);
			const exact = error(word[i], mattes[src]);
			expect(exact, `file frame ${i}`).toBeLessThan(1.5);
			for (const off of [-1, 1])
				expect(error(word[i], mattes[src + off])).toBeGreaterThan(exact + 2);
		}
		// Outside the head the word is opaque, inside it fully transparent.
		const f = 20;
		const x = Math.round(200 + 40 * Math.sin((2 * Math.PI * sourceFrame(2 + f)) / 30));
		expect(word[f][100 * W + x]).toBe(0);
		expect(word[f][10 * W + 10]).toBe(255);
	}, 120_000);

	it('lays over the program picture exactly where the program draws the clip', async () => {
		// The footage as the program draws it, with the word insert laid over it, is the program
		// with the word (front clips would sit above both, so they stay out here).
		const write = async (name: string, clips: object[]) => {
			const f = path.join(dir, `${name}.vf.json`);
			await fs.writeFile(f, JSON.stringify(project(clips)));
			return loadMotionProject(f);
		};
		const at = [14, 29, 30, 35];
		const base = await captureProgramFrames(await write('footage', []), at);
		const full = await captureProgramFrames(await write('word', [CLIPS[0]]), at);
		const word = frames(path.join(dir, 'out', 'word.mov'), 'rgba');
		for (const f of at) {
			// Composite in JS (straight alpha over an opaque picture), compare with the program.
			const plate = frames(await writePng(dir, `base-${f}`, base.get(f)!), 'rgba')[0];
			const want = frames(await writePng(dir, `full-${f}`, full.get(f)!), 'rgba')[0];
			const ins = word[f - 2];
			let worst = 0;
			let off = 0;
			for (let k = 0; k < W * H; k++) {
				const a = ins[k * 4 + 3] / 255;
				for (let c = 0; c < 3; c++) {
					const got = ins[k * 4 + c] * a + plate[k * 4 + c] * (1 - a);
					const d = Math.abs(got - want[k * 4 + c]);
					worst = Math.max(worst, d);
					if (d > 4) off++;
				}
			}
			// Only the head's edge differs a little: the program draws the subject from its PNG
			// cut-out, the plate under the insert is the JPEG plate.
			expect(off, `frame ${f}: channels more than 4 levels off`).toBeLessThan(W * H * 3 * 0.005);
			expect(worst, `frame ${f}`).toBeLessThan(16);
		}
	}, 120_000);

	it('gives the same bytes on one page and on several', async () => {
		const loaded = await loadMotionProject(file);
		const one = path.join(dir, 'one');
		await renderProgramInserts(loaded, { output: one, jobs: 1, clips: ['word', 'panel'] });
		for (const id of ['word', 'panel']) {
			const a = await fs.readFile(path.join(dir, 'out', `${id}.mov`));
			const b = await fs.readFile(path.join(one, `${id}.mov`));
			expect(sha1(a), id).toBe(sha1(b));
		}
	}, 300_000);
});

async function writePng(dir: string, name: string, png: Buffer) {
	const file = path.join(dir, `${name}.png`);
	await fs.writeFile(file, png);
	return file;
}
