// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject } from '../../src/lib/motion/node.js';
import { checkProgram } from '../../src/lib/motion/program-node.js';
// @ts-expect-error: a plain .mjs helper shared with the subject layer tests
import { SW, SH, writeFootage } from './fixtures/subject/footage.mjs';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/**
 * A full-screen card: a dark plane over the whole frame with a title. With `fade` it fades its
 * own opacity over its last 0.2 s, as the CF053 "ring" card did at 39 s: the camera under it
 * flashes before the next card.
 */
const RING = `<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
	const gone = $derived(clip.props.fade ? 1 - clip.p('end - 0.2', 0.2) : 1);
</script>
<div style="position:absolute;inset:0;background:#05070f;opacity:{gone}">
	<div style="position:absolute;left:40px;top:300px;font:700 40px sans-serif;color:#fff">1 vs 13</div>
</div>
`;

/** The next full-screen card. */
const TERM = `<div style="position:absolute;inset:0;background:#101820">
	<div style="position:absolute;left:40px;top:300px;font:700 30px monospace;color:#9f9">$ run</div>
</div>
`;

/** A die in a turning scene: preserve-3d inside preserve-3d. */
const DICE = `<div style="position:absolute;left:100px;top:200px;width:160px;height:160px;perspective:600px">
	<div class="scene" style="width:100%;height:100%;transform-style:preserve-3d;transform:rotateY(20deg)">
		<div class="die" style="width:100%;height:100%;transform-style:preserve-3d;transform:rotateX(30deg)">
			<div style="position:absolute;inset:0;background:#c33;transform:translateZ(80px)">1</div>
		</div>
	</div>
</div>
`;

const flashes = (messages: string[]) =>
	messages.filter((m) => /full-screen|between full-screen/.test(m));

describe.skipIf(!hasChromium || !hasFfmpeg)('flash frames in check', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-flash-frames-'));
		writeFootage(dir, 4);
		await fs.writeFile(path.join(dir, 'Ring.svelte'), RING);
		await fs.writeFile(path.join(dir, 'Term.svelte'), TERM);
		await fs.writeFile(path.join(dir, 'Dice.svelte'), DICE);
	}, 120_000);
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	/** CF053 at 39 s, at 30 fps: "ring" until 2 s, "nastroj" right after it. */
	const write = async (name: string, fade: boolean, extra: object[] = []) => {
		const file = path.join(dir, name);
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				cuts: [{ source: 'talk', in: 0, out: 4 }],
				clips: [
					{ id: 'ring', block: 'Ring.svelte', from: 0.5, until: 2, props: { fade } },
					{ id: 'nastroj', block: 'Term.svelte', from: 2, until: 3 },
					...extra
				]
			})
		);
		return file;
	};

	it('warns about a full-screen clip fading its own opacity over the camera, naming clip and frame', async () => {
		const results = await checkProgram(await loadMotionProject(await write('fade.vf.json', true)));
		expect(results.flatMap((r) => r.errors)).toEqual([]);
		const found = flashes(results.flatMap((r) => r.warnings.map((w) => w.message)));
		expect(found).toHaveLength(1);
		expect(found[0]).toMatch(
			/^Clip "ring" \(Ring\.svelte\) is full-screen but \d+ % opaque at 1\.\d\d s \(program frame 5\d\), next to "nastroj"/
		);
	}, 300_000);

	it('passes the fixed program, where the card stays opaque to its last frame', async () => {
		const results = await checkProgram(
			await loadMotionProject(await write('fixed.vf.json', false))
		);
		expect(results.flatMap((r) => r.errors)).toEqual([]);
		expect(flashes(results.flatMap((r) => r.warnings.map((w) => w.message)))).toEqual([]);
	}, 300_000);

	it('warns about nested CSS 3D when the page draws HTML in a canvas', async () => {
		const file = await write('dice.vf.json', false, [
			{ id: 'dice', block: 'Dice.svelte', from: 3.2, until: 3.8 }
		]);
		const results = await checkProgram(await loadMotionProject(file));
		const found = results
			.flatMap((r) => r.warnings.map((w) => w.message))
			.filter((m) => m.includes('nested CSS 3D'));
		if (results[0].mode !== 'html-in-canvas') return expect(found).toEqual([]);
		expect(found).toEqual([expect.stringMatching(/^Clip "dice" \(Dice\.svelte\): nested CSS 3D/)]);
		expect(found[0]).toContain('div.die');
	}, 300_000);
});
