// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject } from '../../src/lib/motion/node.js';
import { captureProgramFrames, checkProgram } from '../../src/lib/motion/program-node.js';
import { resolveProgram } from '../../src/lib/motion/program.js';
import { scrambled } from '../../src/lib/motion/segments.js';
import { NEUTRAL_BRAND } from '../../src/lib/motion/brand.js';
import { mixColors, parseColor, gamutMapToSrgb } from '../../src/lib/motion/color.js';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/** Landscape footage: a dark grey room with a still light grey "head" at x = 400. */
const SW = 640;
const SH = 360;
const HEAD = `(pow((X-400)/50,2)+pow((Y-200)/110,2))`;

function ffmpeg(args: string[], input?: Buffer): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		input,
		maxBuffer: 1 << 28
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

function rgba(png: Buffer, width: number) {
	const raw = ffmpeg(['-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], png);
	const at = (x: number, y: number) => [
		...raw.subarray((y * width + x) * 4, (y * width + x) * 4 + 3)
	];
	return { at, height: raw.length / 4 / width };
}
const sha1 = (b: Buffer) => createHash('sha1').update(b).digest('hex');
const isHead = (rgb: number[]) => rgb.every((v) => v > 150 && v < 230);
/** The card: saturated, unlike the grey footage. */
const isCard = ([r, g, b]: number[]) => Math.max(r, g, b) - Math.min(r, g, b) > 60;

/** Widest run of head pixels in any row, and the middle of that run. */
function head(px: ReturnType<typeof rgba>) {
	let best = { width: 0, x: 0 };
	for (let y = 0; y < px.height; y += 2) {
		let run = 0;
		for (let x = 0; x < SW; x++) {
			run = isHead(px.at(x, y)) ? run + 1 : 0;
			if (run > best.width) best = { width: run, x: x - (run - 1) / 2 };
		}
	}
	return best;
}

/** Left and right edge of the card along row `y`. */
function cardSpan(px: ReturnType<typeof rgba>, y: number) {
	const xs = [...Array(SW).keys()].filter((x) => isCard(px.at(x, y)));
	return xs.length ? { left: xs[0], right: xs[xs.length - 1] } : null;
}

/** A 100 px square whose colour is the keyed prop `color`. */
const CARD = `<script module>
	export const animatable = { color: 'color' };
</script>

<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

<div class="card" style:background={clip.props.color}></div>

<style>
	.card { position: absolute; left: 20px; top: 20px; width: 100px; height: 100px; }
</style>
`;

describe.skipIf(!hasChromium || !hasFfmpeg)('keys on the stage', () => {
	let dir: string;
	let file: string;

	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-keys-stage-'));
		for (const [name, lum] of [
			['talk.mp4', `if(lt(${HEAD},1),190,96)`],
			['talk.matte.mp4', `if(lt(${HEAD},1),255,0)`]
		])
			ffmpeg([
				'-f',
				'lavfi',
				'-i',
				`color=black:s=${SW}x${SH}:r=30:d=4`,
				'-vf',
				`geq=lum='${lum}':cb=128:cr=128`,
				'-pix_fmt',
				'yuv420p',
				path.join(dir, name)
			]);
		await fs.writeFile(path.join(dir, 'Card.svelte'), CARD);
		file = path.join(dir, 'keys.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				background: '#000000',
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				cuts: [{ source: 'talk', out: 3 }],
				shots: [
					{
						id: 'cam',
						shot: 'full',
						from: 0,
						until: 3,
						keys: [
							{ at: 0, scale: 1, x: 0 },
							{ at: 1.5, scale: 2, x: 0, ease: 'none' },
							{ at: 2.5, x: -100, ease: 'none' }
						]
					}
				],
				clips: [
					{
						id: 'card',
						block: 'Card.svelte',
						from: 0.5,
						until: 2.5,
						keys: [
							{ at: 0, x: 0, y: 0, scale: 1, props: { color: 'brand.primary' } },
							{ at: 1, x: 300, y: 100, scale: 2, props: { color: 'brand.accent' }, ease: 'none' }
						]
					}
				]
			})
		);
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('resolves the keys with brand colours and no problems', async () => {
		const loaded = await loadMotionProject(file);
		expect(loaded.inputs.animatable).toEqual({ 'Card.svelte': { props: { color: 'color' } } });
		const program = resolveProgram(loaded.project, loaded.inputs);
		expect(program.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
		expect(program.clips[0].keys.map((k) => [k.frame, k.values.props?.color])).toEqual([
			[15, NEUTRAL_BRAND.colors.primary],
			[45, NEUTRAL_BRAND.colors.accent]
		]);
	});

	it('draws clip keys: the card slides, grows about its centre and changes colour in OKLCH', async () => {
		const loaded = await loadMotionProject(file);
		const pngs = await captureProgramFrames(loaded, [10, 15, 30, 45, 60]);
		const px = new Map([...pngs].map(([f, png]) => [f, rgba(png, SW)]));
		// Off screen before the clip starts.
		expect(cardSpan(px.get(10)!, 70)).toBeNull();
		// Frame 15: the first key (x 0, scale 1): 20–119. Then x, y and scale move about the
		// root's centre (320, 180): halfway at frame 30, the last key from frame 45 on.
		const expected = (x: number, scale: number) => {
			const left = 320 + (20 - 320) * scale + x;
			return { left: Math.round(left), right: Math.round(left + 100 * scale) - 1 };
		};
		expect(cardSpan(px.get(15)!, 70)).toEqual({ left: 20, right: 119 });
		for (const [f, x, scale] of [
			[30, 150, 1.5],
			[45, 300, 2],
			[60, 300, 2]
		]) {
			const span = cardSpan(px.get(f)!, 70)!;
			const want = expected(x, scale);
			expect(Math.abs(span.left - want.left), `frame ${f}`).toBeLessThanOrEqual(1);
			expect(Math.abs(span.right - want.right), `frame ${f}`).toBeLessThanOrEqual(1);
		}
		// y: the top edge at frame 45 is 180 + (20 − 180) × 2 + 100 = −40, the bottom 159.
		const column = [...Array(SH).keys()].filter((y) => isCard(px.get(45)!.at(120, y)));
		expect(column[0]).toBe(0);
		expect(Math.abs(column[column.length - 1] - 159)).toBeLessThanOrEqual(1);
		// Colours: the brand's primary, then the OKLCH mix of primary and accent at the midpoint.
		const at = (f: number) => {
			const s = cardSpan(px.get(f)!, 70)!;
			return px.get(f)!.at(Math.round((s.left + s.right) / 2), 70);
		};
		expect(at(15)).toEqual(parseHex(NEUTRAL_BRAND.colors.primary));
		const mid = gamutMapToSrgb(
			mixColors(
				parseColor(NEUTRAL_BRAND.colors.primary),
				parseColor(NEUTRAL_BRAND.colors.accent),
				0.5,
				'oklch'
			)
		);
		const want = [mid.r, mid.g, mid.b].map((v) => v * 255);
		const got = at(30);
		for (let c = 0; c < 3; c++)
			expect(Math.abs(got[c] - want[c]), `channel ${c}`).toBeLessThanOrEqual(1);
		// Not the RGB midpoint: OKLCH stays saturated.
		const rgbMid = [0, 1, 2].map(
			(c) =>
				(parseHex(NEUTRAL_BRAND.colors.primary)[c] + parseHex(NEUTRAL_BRAND.colors.accent)[c]) / 2
		);
		expect(Math.max(...got.map((v, c) => Math.abs(v - rgbMid[c])))).toBeGreaterThan(10);
		expect(at(60)).toEqual(parseHex(NEUTRAL_BRAND.colors.accent));
	}, 120_000);

	it('draws shot keys on the camera: closer about the face, then a pan', async () => {
		const loaded = await loadMotionProject(file);
		const pngs = await captureProgramFrames(loaded, [0, 22, 45, 60, 75, 85]);
		const h = new Map([...pngs].map(([f, png]) => [f, head(rgba(png, SW))]));
		expect(h.get(0)!.width).toBeGreaterThan(95);
		const ratio = (f: number) => h.get(f)!.width / h.get(0)!.width;
		expect(ratio(22)).toBeCloseTo(1 + 22 / 45, 1);
		expect(ratio(45)).toBeCloseTo(2, 1);
		// Scaled about the face, the head stays at x ≈ 400 …
		expect(Math.abs(h.get(45)!.x - 400)).toBeLessThanOrEqual(2);
		// … and the pan moves it 50 px by frame 60, 100 px from frame 75 on.
		expect(Math.abs(h.get(60)!.x - 350)).toBeLessThanOrEqual(2);
		expect(Math.abs(h.get(75)!.x - 300)).toBeLessThanOrEqual(2);
		expect(Math.abs(h.get(85)!.x - 300)).toBeLessThanOrEqual(2);
	}, 120_000);

	it('gives the same pixels in any seek order and on a whole-program page', async () => {
		const loaded = await loadMotionProject(file);
		const all = [...Array(90).keys()];
		const forward = await captureProgramFrames(loaded, all);
		const backward = await captureProgramFrames(loaded, [...all].reverse(), { whole: true });
		const shuffled = await captureProgramFrames(loaded, scrambled(all));
		const differ = all.filter(
			(f) =>
				sha1(forward.get(f)!) !== sha1(backward.get(f)!) ||
				sha1(forward.get(f)!) !== sha1(shuffled.get(f)!)
		);
		expect(differ).toEqual([]);
		const results = await checkProgram(loaded, { determinism: true });
		expect(results.map((r) => [r.id, r.ok, r.errors])).toEqual([['seg1', true, []]]);
	}, 300_000);

	it('fails a render-time key the block does not mark animatable', async () => {
		const json = JSON.parse(await fs.readFile(file, 'utf8'));
		json.clips[0].keys[0].props = { size: 3 };
		const bad = path.join(dir, 'bad.vf.json');
		await fs.writeFile(bad, JSON.stringify(json));
		const loaded = await loadMotionProject(bad);
		const program = resolveProgram(loaded.project, loaded.inputs);
		expect(program.diagnostics).toContainEqual(
			expect.objectContaining({
				level: 'error',
				clip: 'card',
				field: 'keys',
				message: 'Prop "size" is not animatable in Card.svelte. Animatable: color.'
			})
		);
		await expect(captureProgramFrames(loaded, [20])).rejects.toThrow(/not animatable/);
	}, 120_000);
});

function parseHex(hex: string): number[] {
	const n = parseInt(hex.slice(1), 16);
	return [n >> 16, (n >> 8) & 255, n & 255];
}
