// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findChromium, loadMotionProject } from '../../src/lib/motion/node.js';
import { checkProgram } from '../../src/lib/motion/program-node.js';
// @ts-expect-error: a plain .mjs helper shared with the subject layer tests
import { SW, SH, ffmpeg, writeFootage } from './fixtures/subject/footage.mjs';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/** A line of text at `x`, `y` (stage pixels), at `opacity`. */
const STICKER = `<script>
	import { useClip } from 'visualfries/motion';
	const p = useClip().props;
</script>
<div style="position:absolute;left:{p.x}px;top:{p.y}px;font:700 30px sans-serif;color:{p.color ?? '#fff'};white-space:nowrap;opacity:{p.opacity ?? 1}">{p.text}</div>
`;

/** A white card over the whole head, its short title in a corner away from the face. */
const WHITE_CARD = `<div style="position:absolute;left:30px;top:120px;width:300px;height:260px;background:#fff">
	<span style="position:absolute;left:8px;top:8px;font:700 20px sans-serif;color:#000">HI</span>
</div>
`;

/** A full-frame canvas that draws nothing, and a full-frame scrim darkening the bottom. */
const EMPTY_CANVAS = `<canvas width="360" height="640" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
`;
const SCRIM = `<div style="position:absolute;inset:0;background:linear-gradient(transparent 70%, rgba(0,0,0,.4))"></div>
`;

const TITLE = `<div style="position:absolute;left:110px;top:220px;font:700 30px sans-serif;color:#fff">TITLE</div>`;

/** A full-frame card inset from the frame edges, with round corners, its title mid-frame. */
const INSET_CARD = `<div style="position:absolute;inset:16px;background:#123;border-radius:24px"></div>
${TITLE}
`;

/** A picture over the frame with a title over the face: a screenshot or a letterbox. */
const picture = (src: string, fit = 'fill') => `<script>
	import { useReady } from 'visualfries/motion';
	import shot from '${src}';
	const img = new Image();
	img.src = shot;
	useReady(img.decode().catch(() => {}));
</script>
<img src={shot} alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${fit}" />
${TITLE}
`;
/** A full-frame JPEG that only gets its file long after the clip: never loaded while it shows. */
const UNLOADED = `<script>
	import { useClip } from 'visualfries/motion';
	import later from './full.jpg';
	const clip = useClip();
</script>
<img src={clip.t > 60 ? later : undefined} alt="" style="position:absolute;inset:0;width:100%;height:100%" />
${TITLE}
`;

/** Text on the face, and a clean-plate layer of the body far below it. */
const CLEAN_BELOW = `<script>
	import { Subject, useClip } from 'visualfries/motion';
	const p = useClip().props;
</script>
<div style="position:absolute;left:{p.x}px;top:{p.y}px;font:700 30px sans-serif;color:#fff;white-space:nowrap">{p.text}</div>
<Subject layer="clean" region={{ below: { head: 3 } }} />
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
		await fs.writeFile(path.join(dir, 'WhiteCard.svelte'), WHITE_CARD);
		await fs.writeFile(path.join(dir, 'EmptyCanvas.svelte'), EMPTY_CANVAS);
		await fs.writeFile(path.join(dir, 'Scrim.svelte'), SCRIM);
		await fs.writeFile(path.join(dir, 'CleanBelow.svelte'), CLEAN_BELOW);
		await fs.writeFile(path.join(dir, 'InsetCard.svelte'), INSET_CARD);
		await fs.writeFile(path.join(dir, 'Screenshot.svelte'), picture('./shot.png'));
		await fs.writeFile(path.join(dir, 'Letterbox.svelte'), picture('./wide.jpg', 'contain'));
		await fs.writeFile(path.join(dir, 'Unloaded.svelte'), UNLOADED);
		// A light full-frame screenshot and photo, and a wide strip that `contain` letterboxes.
		const still = (colour: string, size: string, file: string) =>
			ffmpeg(['-f', 'lavfi', '-i', `color=${colour}:s=${size}`, '-frames:v', '1', file]);
		still('0xeeeeee', `${SW}x${SH}`, path.join(dir, 'shot.png'));
		still('0xeeeeee', `${SW}x${SH}`, path.join(dir, 'full.jpg'));
		still('0x223344', '720x120', path.join(dir, 'wide.jpg'));
		await fs.mkdir(path.join(dir, 'long'));
		writeFootage(path.join(dir, 'long'), 12);
	}, 120_000);
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
					// The speaker drawn over its own text (first: it is under the clips after it).
					{ id: 'occluded', block: 'Occluded.svelte', from: 0.2, until: 3, props: face },
					sticker('face', 0.5, 2.5, face),
					// Above the head, beside it on the body, invisible, behind the speaker, passing.
					sticker('above', 0.2, 3, { x: 40, y: 40, text: 'ABOVE THE HEAD' }),
					sticker('ghost', 0.2, 3, { ...face, opacity: 0 }),
					sticker('behind', 0.2, 3, face, { layer: 'behind' }),
					sticker('flyby', 2.6, 2.9, face),
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

	it('counts opaque cards, sees through canvases and scrims, and knows which subject layers occlude', async () => {
		const face = { x: 110, y: 220, text: 'ON THE FACE' };
		const clip = (id: string, block: string, from: number, until: number, props = {}) => ({
			id,
			block,
			from,
			until,
			props
		});
		const file = path.join(dir, 'probes.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				footage: {
					talk: { src: 'long/talk.mp4', matte: 'long/talk.matte.mp4', clean: true }
				},
				cuts: [{ source: 'talk', in: 0, out: 12 }],
				clips: [
					// A white card over the whole head: its title is in a corner, the card hides the face.
					clip('card-sticker', 'WhiteCard.svelte', 0.2, 1.2),
					// Text on the face with a full-frame canvas that draws nothing, or a scrim, over it.
					clip('under-canvas', 'Sticker.svelte', 1.5, 2.5, face),
					clip('canvas', 'EmptyCanvas.svelte', 1.5, 2.5),
					clip('under-scrim', 'Sticker.svelte', 2.8, 3.8, face),
					clip('scrim', 'Scrim.svelte', 2.8, 3.8),
					// Letters a typewriter has not typed yet: transparent.
					clip('typewriter', 'Sticker.svelte', 4.1, 5.1, { ...face, color: 'transparent' }),
					// A clean-plate layer of the body does not hide the text on the face.
					clip('clean-below', 'CleanBelow.svelte', 5.4, 6.4, face),
					// The live speaker drawn by a later clip covers the text.
					clip('under-speaker', 'Sticker.svelte', 6.7, 7.7, face),
					clip('speaker', '@visualfries/subject', 6.7, 7.7, {
						region: 'all',
						freeze: false,
						hole: false
					}),
					// Full-frame cards: inset with round corners, a loaded screenshot. A letterboxed
					// picture and one that has not loaded hide nothing.
					clip('inset-card', 'InsetCard.svelte', 8, 8.8),
					clip('screenshot', 'Screenshot.svelte', 9, 9.8),
					clip('letterbox', 'Letterbox.svelte', 10, 10.8),
					clip('unloaded', 'Unloaded.svelte', 11, 11.8)
				]
			})
		);
		const results = await checkProgram(await loadMotionProject(file));
		expect(results.flatMap((r) => r.errors)).toEqual([]);
		const warned = results
			.flatMap((r) => r.warnings.map((w) => w.message))
			.filter((m) => m.includes("covers the speaker's face"))
			.map((m) => /^Clip "(.*?)"/.exec(m)![1]);
		expect(warned).toEqual([
			'card-sticker',
			'under-canvas',
			'under-scrim',
			'clean-below',
			'letterbox',
			'unloaded'
		]);
	}, 300_000);
});
