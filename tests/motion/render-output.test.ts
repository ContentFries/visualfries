import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { loadMotionProject, renderMotionClips } from '../../src/lib/motion/node.js';

async function project(clips: object[]) {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-out-'));
	await fs.writeFile(path.join(dir, 'B.svelte'), '<div></div>');
	await fs.writeFile(
		path.join(dir, 'p.vf.json'),
		JSON.stringify({ size: [100, 100], fps: 30, clips })
	);
	return { dir, loaded: await loadMotionProject(path.join(dir, 'p.vf.json')) };
}

describe('render --output <file>', () => {
	it('refuses a file name when several clips would render', async () => {
		const { dir, loaded } = await project([
			{ id: 'a', block: 'B.svelte', from: 0, until: 1 },
			{ id: 'b', block: 'B.svelte', from: 0, until: 1 }
		]);
		await expect(renderMotionClips(loaded, { output: path.join(dir, 'x.mp4') })).rejects.toThrow(
			/2 clips would render/
		);
	});

	it('refuses .mp4 for a transparent clip', async () => {
		const { dir, loaded } = await project([
			{ id: 'a', block: 'B.svelte', from: 0, until: 1, alpha: true }
		]);
		await expect(renderMotionClips(loaded, { output: path.join(dir, 'x.mp4') })).rejects.toThrow(
			/--output <name>\.mov/
		);
	});
});
