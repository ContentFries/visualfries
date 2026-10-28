// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject, renderStills } from '../../src/lib/motion/node.js';
import { captureProgramFrames } from '../../src/lib/motion/program-node.js';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const W = 64;
const H = 32;

/**
 * Two white bars, as many pixels wide as the program frame: the top one from the `useFrame`
 * context, the bottom one from `clip.programFrame` in markup. Red when `programTime` disagrees.
 */
const CLOCK = `<script>
	import { useClip, useFrame } from 'visualfries/motion';
	const clip = useClip();
	let bar;
	let ok = $state(true);
	useFrame(({ programFrame, programTime, clip }) => {
		bar.style.width = programFrame + 'px';
		ok = programTime === programFrame / clip.fps && clip.programTime === programTime;
	});
</script>
<div style="position:absolute;inset:0;background:{ok ? '#000' : '#f00'}"></div>
<div bind:this={bar} style="position:absolute;left:0;top:0;height:16px;background:#fff"></div>
<div style="position:absolute;left:0;top:16px;height:16px;width:{clip.programFrame}px;background:#fff"></div>`;

function ffmpeg(args: string[], input?: Buffer): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		input,
		maxBuffer: 1 << 26
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

/** Widths of the white bars (top, bottom) and whether the page saw a wrong `programTime`. */
function bars(png: Buffer) {
	const px = ffmpeg(['-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], png);
	const width = (y: number) => {
		let n = 0;
		for (let x = 0; x < W; x++) if (px[(y * W + x) * 3 + 1] > 200) n++;
		return n;
	};
	return { top: width(8), bottom: width(24), red: px[(8 * W + W - 1) * 3] > 200 };
}

describe.skipIf(!hasChromium || !hasFfmpeg)('program time in a block', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-program-time-'));
		await fs.writeFile(path.join(dir, 'Clock.svelte'), CLOCK);
		ffmpeg([
			...['-f', 'lavfi', '-i', `color=black:s=${W}x${H}:r=30:d=2`],
			...['-pix_fmt', 'yuv420p', path.join(dir, 'v.mp4')]
		]);
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	const write = async (name: string, project: object) => {
		const file = path.join(dir, name);
		await fs.writeFile(file, JSON.stringify({ size: [W, H], fps: 30, ...project }));
		return file;
	};

	it('is the program frame in a program, in useFrame and in markup', async () => {
		const file = await write('program.vf.json', {
			footage: { v: { src: 'v.mp4' } },
			cuts: [{ source: 'v', in: 0, out: 2 }],
			// Program frames 15–44.
			clips: [{ id: 'clock', block: 'Clock.svelte', from: 0.5, until: 1.5 }]
		});
		const pngs = await captureProgramFrames(await loadMotionProject(file), [20, 40]);
		expect(bars(pngs.get(20)!)).toEqual({ top: 20, bottom: 20, red: false });
		expect(bars(pngs.get(40)!)).toEqual({ top: 40, bottom: 40, red: false });
	});

	it("is the project timeline's frame in clip mode: the clip start plus the clip frame", async () => {
		const file = await write('clips.vf.json', {
			clips: [{ id: 'clock', block: 'Clock.svelte', from: 0.5, until: 1.5 }]
		});
		const [still] = await renderStills(await loadMotionProject(file), [
			{ clip: 'clock', at: 'f5' }
		]);
		expect(bars(still.png)).toEqual({ top: 20, bottom: 20, red: false });
	});
});
