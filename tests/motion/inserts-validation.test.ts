// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadMotionProject } from '../../src/lib/motion/node.js';
import { renderProgramInserts } from '../../src/lib/motion/inserts-node.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

// Every check here fails before a browser starts, so no Chromium is needed (ffmpeg makes the footage).
describe.skipIf(!hasFfmpeg)('render --export inserts: checks before rendering', () => {
	let dir: string;
	const write = async (name: string, size: number[], clips: object[]) => {
		const file = path.join(dir, `${name}.vf.json`);
		await fs.writeFile(
			file,
			JSON.stringify({
				size,
				fps: 30,
				background: '#000000',
				footage: { talk: { src: 'talk.mp4' } },
				cuts: [{ id: 'a', source: 'talk', in: 0.5, out: 1.5 }],
				clips
			})
		);
		return loadMotionProject(file);
	};
	const CLIPS = [
		{ id: 'one', block: 'B.svelte', from: 0.1, until: 0.5 },
		{ id: 'two', block: 'B.svelte', from: 0.5, until: 0.9 }
	];

	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-inserts-validation-'));
		const made = spawnSync('ffmpeg', [
			'-y',
			'-loglevel',
			'error',
			'-f',
			'lavfi',
			'-i',
			'color=black:s=320x180:r=30:d=2',
			'-pix_fmt',
			'yuv420p',
			path.join(dir, 'talk.mp4')
		]);
		if (made.status !== 0) throw new Error(String(made.stderr));
		await fs.writeFile(path.join(dir, 'B.svelte'), '<div></div>');
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('rejects a --jobs that is not a positive integer', async () => {
		const loaded = await write('jobs', [320, 180], CLIPS);
		for (const jobs of [0, -1, 1.5])
			await expect(renderProgramInserts(loaded, { output: dir, jobs })).rejects.toThrow(
				`--jobs must be a positive integer, got ${jobs}.`
			);
	});

	it('rejects one file name for several inserts', async () => {
		const loaded = await write('many', [320, 180], CLIPS);
		await expect(
			renderProgramInserts(loaded, { output: path.join(dir, 'x.mov') })
		).rejects.toThrow('names one file, but 2 inserts would render. Pick one with --clip <id>');
	});

	it('rejects a file extension that does not fit the insert', async () => {
		const loaded = await write('ext', [320, 180], CLIPS);
		await expect(
			renderProgramInserts(loaded, { output: path.join(dir, 'x.mp4'), clips: ['one'] })
		).rejects.toThrow('Insert "one" renders a transparent .mov; use --output <name>.mov.');
	});

	it('rejects an odd frame size for an opaque H.264 insert', async () => {
		const loaded = await write('odd', [321, 180], [{ ...CLIPS[0], alpha: false }]);
		await expect(renderProgramInserts(loaded, { output: dir })).rejects.toThrow(
			'Insert "one": size 321×180 must be even for H.264.'
		);
	});
});
