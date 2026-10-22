// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromiumExecutable, findChromium, loadMotionProject } from '../../src/lib/motion/node.js';
import { captureProgramFrames } from '../../src/lib/motion/program-node.js';
// @ts-expect-error: a plain .mjs helper shared with the subject layer tests
import { SW, SH, toolchain, writeFootage } from './fixtures/subject/footage.mjs';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const GOLDEN = path.join(__dirname, 'fixtures/subject/program.golden.json');

/** A word behind the speaker and a caption in front: what a program with a matte draws. */
const WORD = `<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>
<div class="w" style="transform: translateX({(clip.t * 60).toFixed(2)}px)">BEHIND</div>
<style>
	.w { position: absolute; left: 20px; top: 190px; font: 900 88px sans-serif; color: #ffd400; }
</style>
`;
const CAPTION = `<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>
<div class="c" style="opacity: {Math.min(1, clip.t * 2)}">front</div>
<style>
	.c { position: absolute; left: 30px; bottom: 60px; font: 700 40px sans-serif; color: #fff; }
</style>
`;

const GOLDEN_FRAMES = [0, 12, 23, 24, 30, 33, 36, 40, 48, 56, 70, 77];

/** A matte program as main draws it: cuts with a push, punch and behind shots, behind and front clips. */
async function goldenProject(dir: string): Promise<string> {
	writeFootage(dir);
	await fs.writeFile(path.join(dir, 'Word.svelte'), WORD);
	await fs.writeFile(path.join(dir, 'Caption.svelte'), CAPTION);
	const file = path.join(dir, 'golden.vf.json');
	await fs.writeFile(
		file,
		JSON.stringify({
			size: [SW, SH],
			fps: 30,
			background: '#101010',
			footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
			cuts: [
				{ source: 'talk', in: 0, out: 1.2 },
				{ source: 'talk', in: 1.5, out: 2.9, transition: { type: 'push', duration: 0.3 } }
			],
			shots: [
				{
					id: 'open',
					shot: 'full',
					from: 0,
					until: 0.8,
					keys: [
						{ at: 0, scale: 1 },
						{ at: 0.8, scale: 1.1 }
					]
				},
				{ id: 'room', shot: 'behind', from: 0.8, until: 1.2 },
				{ id: 'close', shot: 'punch', from: 1.2, until: 2.6 }
			],
			clips: [
				{ id: 'word', block: 'Word.svelte', from: 0.2, until: 2.2, layer: 'behind' },
				{ id: 'cap', block: 'Caption.svelte', from: 0.5, until: 2.5 }
			]
		})
	);
	return file;
}

const sha1 = (b: Buffer) => createHash('sha1').update(b).digest('hex');

/**
 * Programs that use no subject layer draw exactly as before subject layers existed: the golden
 * holds frame hashes made on the commit before them. Bytes only match with the Chromium and
 * ffmpeg it was made with, so other toolchains skip the comparison (`VF_WRITE_GOLDEN=1` writes it).
 */
describe.skipIf(!hasChromium || !hasFfmpeg)('programs without subject layers', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-program-golden-'));
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('draw byte-identical frames', async (ctx) => {
		const here = toolchain(await chromiumExecutable());
		const loaded = await loadMotionProject(await goldenProject(dir));
		const frames = await captureProgramFrames(loaded, GOLDEN_FRAMES);
		const hashes = Object.fromEntries(GOLDEN_FRAMES.map((f) => [f, sha1(frames.get(f)!)]));
		if (process.env.VF_WRITE_GOLDEN) {
			await fs.writeFile(GOLDEN, JSON.stringify({ toolchain: here, hashes }, null, '\t') + '\n');
			return;
		}
		const golden = JSON.parse(await fs.readFile(GOLDEN, 'utf8'));
		if (JSON.stringify(here) !== JSON.stringify(golden.toolchain)) ctx.skip();
		expect(hashes).toEqual(golden.hashes);
	}, 300_000);
});
