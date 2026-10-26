// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject } from '../../src/lib/motion/node.js';
import { captureProgramFrames, checkProgram } from '../../src/lib/motion/program-node.js';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/** Portrait footage: a light speaker (head and body) swaying around x = 180 in a dark room. */
const SW = 360;
const SH = 640;
const HX = '(180+24*sin(2*PI*N/60))';
const SPEAKER = `lt(pow((X-${HX})/70,2)+pow((Y-240)/90,2),1)+gt(Y,330)*lt(abs(X-${HX}),120)`;
/**
 * A thin arm out to the right edge, one pixel tall: too thin for the matte's downscaled boxes,
 * drawn all the same by the cut-out.
 */
const ARM = `eq(Y,400)*gt(X,${HX})`;

function ffmpeg(args: string[], input?: Buffer): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		input,
		maxBuffer: 1 << 28
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

function footage(dir: string, name: string, subject: string) {
	const lavfi = ['-f', 'lavfi', '-i', `color=black:s=${SW}x${SH}:r=30:d=4`];
	const enc = ['-g', '30', '-crf', '12', '-pix_fmt', 'yuv420p'];
	ffmpeg([
		...lavfi,
		'-vf',
		`geq=lum='if(gt(${subject},0),220,50)':cb=128:cr=128`,
		...enc,
		path.join(dir, `${name}.mp4`)
	]);
	ffmpeg([
		...lavfi,
		'-vf',
		`geq=lum='if(gt(${subject},0),255,0)':cb=128:cr=128`,
		...enc,
		path.join(dir, `${name}.matte.mp4`)
	]);
}

/** A world behind the speaker: magenta over the whole frame. */
const WORLD = `<div style="position:absolute;inset:0;background:#ff00ff"></div>
`;

const rgba = (png: Buffer) =>
	ffmpeg(['-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], png);
/** Pixels that are not the world's magenta. */
function notWorld(png: Buffer): number {
	const raw = rgba(png);
	let n = 0;
	for (let i = 0; i < raw.length; i += 4)
		if (!(raw[i] > 200 && raw[i + 1] < 60 && raw[i + 2] > 200)) n++;
	return n;
}
const sha1 = (b: Buffer) => createHash('sha1').update(b).digest('hex');

describe.skipIf(!hasChromium || !hasFfmpeg)('a speaker away from the frame', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-away-'));
		footage(dir, 'talk', SPEAKER);
		footage(dir, 'arm', `${SPEAKER}+${ARM}`);
		await fs.writeFile(path.join(dir, 'World.svelte'), WORLD);
	}, 120_000);
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	const write = async (file: string, source: string, away?: unknown) => {
		await fs.writeFile(
			path.join(dir, file),
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				footage: { [source]: { src: `${source}.mp4`, matte: `${source}.matte.mp4` } },
				cuts: [{ source, in: 0, out: 3 }],
				shots: [{ id: 'talk', shot: 'behind', from: 0, until: 'end', ...(away ? { away } : {}) }],
				clips: [{ id: 'world', block: 'World.svelte', from: 0, until: 'end', layer: 'behind' }]
			})
		);
		return loadMotionProject(path.join(dir, file));
	};

	it('slides the speaker off while the world behind him stays, and brings him back', async () => {
		const frames = [20, 28, 40, 62, 70];
		const away = await captureProgramFrames(
			await write('away.vf.json', 'talk', [{ from: 1, until: 2 }]),
			frames
		);
		const plain = await captureProgramFrames(await write('plain.vf.json', 'talk'), frames);
		// Before the exit and once back: the shot as it is without the range.
		expect(sha1(away.get(20)!)).toBe(sha1(plain.get(20)!));
		expect(sha1(away.get(70)!)).toBe(sha1(plain.get(70)!));
		// Gone: nothing but the world.
		expect(notWorld(away.get(40)!)).toBe(0);
		// On the way out and back in: part of him.
		const whole = notWorld(plain.get(28)!);
		expect(notWorld(away.get(28)!)).toBeGreaterThan(0);
		expect(notWorld(away.get(28)!)).toBeLessThan(whole);
		expect(notWorld(away.get(62)!)).toBeGreaterThan(0);
	}, 300_000);

	it('warns once when a piece of the speaker stays in the frame while he is away', async () => {
		const away = [{ from: 1, until: 2, side: 'left' }];
		const said = async (file: string, source: string) =>
			(await checkProgram(await write(file, source, away)))
				.flatMap((r) => r.warnings.map((w) => w.message))
				.filter((m) => m.includes('still partly in the frame'));
		expect(await said('clean.vf.json', 'talk')).toEqual([]);
		const warned = await said('armed.vf.json', 'arm');
		expect(warned).toHaveLength(1);
		expect(warned[0]).toMatch(
			/^Shot "talk" \(behind\), away range 1 \(1\.00–2\.00 s\): the speaker is still partly in the frame at 1\.\d\d s \(program time\)/
		);
	}, 300_000);
});
