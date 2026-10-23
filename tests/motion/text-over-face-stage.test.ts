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

/** A line of text at `x`, `y` (stage pixels), at `opacity`. */
const STICKER = `<script>
	import { useClip } from 'visualfries/motion';
	const p = useClip().props;
</script>
<div style="position:absolute;left:{p.x}px;top:{p.y}px;font:700 30px sans-serif;color:#fff;white-space:nowrap;opacity:{p.opacity ?? 1}">{p.text}</div>
`;

/** The same text with the whole speaker drawn over it by a subject layer. */
const OCCLUDED = `<script>
	import { Subject, useClip } from 'visualfries/motion';
	const p = useClip().props;
</script>
<div style="position:absolute;left:{p.x}px;top:{p.y}px;font:700 30px sans-serif;color:#fff;white-space:nowrap">{p.text}</div>
<Subject />
`;

/** A full-frame card with its title where the head would be. */
const CARD = `<div style="position:absolute;inset:0;background:#123">
	<div style="position:absolute;left:110px;top:220px;font:700 30px sans-serif;color:#fff">CARD TITLE</div>
</div>
`;

describe.skipIf(!hasChromium || !hasFfmpeg)('text over the face in check', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-text-over-face-'));
		writeFootage(dir, 4);
		await fs.writeFile(path.join(dir, 'Sticker.svelte'), STICKER);
		await fs.writeFile(path.join(dir, 'Occluded.svelte'), OCCLUDED);
		await fs.writeFile(path.join(dir, 'Card.svelte'), CARD);
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('warns once about a clip whose text sits on the face, and about nothing else', async () => {
		// The head: a 140 px wide ellipse swaying around x = 180, its top at y = 150.
		const face = { x: 110, y: 220, text: 'ON THE FACE' };
		const sticker = (id: string, from: number, until: number, props: object, extra = {}) => ({
			id,
			block: 'Sticker.svelte',
			from,
			until,
			props,
			...extra
		});
		const file = path.join(dir, 'p.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				cuts: [{ source: 'talk', in: 0, out: 4 }],
				clips: [
					sticker('face', 0.5, 2.5, face),
					// Above the head, beside it on the body, invisible, behind the speaker, passing.
					sticker('above', 0.2, 3, { x: 40, y: 40, text: 'ABOVE THE HEAD' }),
					sticker('ghost', 0.2, 3, { ...face, opacity: 0 }),
					sticker('behind', 0.2, 3, face, { layer: 'behind' }),
					sticker('flyby', 2.6, 2.9, face),
					{ id: 'occluded', block: 'Occluded.svelte', from: 0.2, until: 3, props: face },
					{ id: 'card', block: 'Card.svelte', from: 3.1, until: 4 }
				]
			})
		);
		const results = await checkProgram(await loadMotionProject(file));
		expect(results.flatMap((r) => r.errors)).toEqual([]);
		const warnings = results
			.flatMap((r) => r.warnings.map((w) => w.message))
			.filter((m) => m.includes("covers the speaker's face"));
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toMatch(
			/^Clip "face" \(Sticker\.svelte\): its text covers the speaker's face from 0\.50 s \(program time\) on, up to \d+ % of the face/
		);
		expect(warnings[0]).toMatch(/The (left|right) side of the frame \(x \d+–\d+ of 360 px\)/);
	}, 300_000);
});
