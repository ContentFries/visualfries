// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject } from '../../src/lib/motion/node.js';
import { captureProgramFrames } from '../../src/lib/motion/program-node.js';
// @ts-expect-error: a plain .mjs helper shared with the subject layer tests
import { pixels, writeFootage } from './fixtures/subject/footage.mjs';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/** A canvas at (`left`, `top`), red on odd frames and blue on even ones. */
const block = (left: number, top: number) => `<script>
	import { useClip, useFrame } from 'visualfries/motion';
	const clip = useClip();
	let canvas;
	useFrame(() => {
		const c = canvas.getContext('2d');
		c.fillStyle = clip.frame % 2 ? '#ff0000' : '#0000ff';
		c.fillRect(0, 0, 90, 160);
	});
</script>
<canvas bind:this={canvas} width="90" height="160" style="position:absolute;left:${left}px;top:${top}px"></canvas>
`;

describe.skipIf(!hasChromium || !hasFfmpeg)('canvases in a program', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-program-canvas-'));
		writeFootage(dir, 1);
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('are in the frame wherever they sit, not only at the top left corner', async () => {
		const spots = [
			[0, 0],
			[270, 0],
			[0, 480],
			[135, 240]
		];
		for (const [left, top] of spots) {
			await fs.writeFile(path.join(dir, 'Canvas.svelte'), block(left, top));
			const file = path.join(dir, 'p.vf.json');
			await fs.writeFile(
				file,
				JSON.stringify({
					size: [360, 640],
					fps: 30,
					footage: { talk: { src: 'talk.mp4' } },
					cuts: [{ source: 'talk', in: 0, out: 1 }],
					clips: [{ id: 'c', block: 'Canvas.svelte', from: 0.5, until: 1 }]
				})
			);
			const frames = await captureProgramFrames(await loadMotionProject(file), [10, 20, 21]);
			expect(pixels(frames.get(20)!, 360)(left + 30, top + 40), `${left},${top}`).toEqual([
				255, 0, 0
			]);
			expect(pixels(frames.get(21)!, 360)(left + 30, top + 40), `${left},${top}`).toEqual([
				0, 0, 255
			]);
		}
	}, 300_000);
});
