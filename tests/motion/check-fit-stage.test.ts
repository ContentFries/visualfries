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

/** A line of text at `x`, `y` (stage pixels). */
const STICKER = `<script>
	import { useClip } from 'visualfries/motion';
	const p = useClip().props;
</script>
<div style="position:absolute;left:{p.x}px;top:{p.y}px;font:700 30px sans-serif;color:#fff;white-space:nowrap">{p.text}</div>
`;

/** A card over the whole frame with a panel laid out in fixed pixels for a 640 × 360 frame. */
const FIXED = `<div style="position:absolute;inset:0;overflow:hidden;background:#123">
	<div style="position:absolute;left:20px;top:20px;width:600px;height:300px;background:#456;font:700 40px sans-serif;color:#fff">WIDE LAYOUT</div>
</div>
`;

/** A desk the camera pans along: one panel in the frame, the next one parked beside it. */
const PAN = `<div style="position:absolute;inset:0;overflow:hidden">
	<div style="position:absolute;left:20px;top:100px;width:320px;height:400px;background:#456;font:700 30px sans-serif;color:#fff">ONE</div>
	<div style="position:absolute;left:420px;top:100px;width:320px;height:400px;background:#654;font:700 30px sans-serif;color:#fff">TWO</div>
</div>
`;

/** A card laid out from the clip's size, and a panel sliding in past the edge for 0.4 s. */
const FITS = `<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
</script>
<div style="position:absolute;inset:0;background:#123">
	<div style="position:absolute;left:6%;top:10%;width:88%;height:80%;background:#456"></div>
	<div style="position:absolute;left:30%;top:45%;font:700 30px sans-serif;color:#fff">FITS</div>
</div>
<div style="position:absolute;top:40%;left:{20 + 340 * (1 - clip.p(0, 0.4))}px;width:300px;height:100px;background:#789"></div>
`;

/** A panel for a slot: it fills it. */
const PANEL = `<div style="position:absolute;inset:0;background:#2a6"></div>
`;

/** Text with the whole speaker drawn over it by a subject layer. */
const UNDER_SUBJECT = `<script>
	import { Subject, useClip } from 'visualfries/motion';
	const p = useClip().props;
</script>
<div style="position:absolute;left:{p.x}px;top:{p.y}px;font:700 30px sans-serif;color:#fff;white-space:nowrap">{p.text}</div>
<Subject />
`;

const clip = (id: string, block: string, from: number, until: number, extra = {}) => ({
	id,
	block,
	from,
	until,
	...extra
});

const messages = (results: Awaited<ReturnType<typeof checkProgram>>) =>
	results.flatMap((r) => r.warnings.map((w) => w.message));

describe.skipIf(!hasChromium || !hasFfmpeg)(
	'content that does not fit, captions in moves, text behind',
	() => {
		let dir: string;
		beforeAll(async () => {
			dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-check-fit-'));
			writeFootage(dir, 4);
			// One word every 0.3 s for the captions.
			const words = Array.from({ length: 13 }, (_, i) => ({
				text: `word${i}`,
				start: 0.1 + i * 0.3,
				end: 0.3 + i * 0.3
			}));
			await fs.writeFile(path.join(dir, 'talk.transcript.json'), JSON.stringify({ words }));
			for (const [name, source] of Object.entries({
				Sticker: STICKER,
				Fixed: FIXED,
				Pan: PAN,
				Fits: FITS,
				Panel: PANEL,
				UnderSubject: UNDER_SUBJECT
			}))
				await fs.writeFile(path.join(dir, `${name}.svelte`), source);
		}, 120_000);
		afterAll(async () => {
			await fs.rm(dir, { recursive: true, force: true });
		});

		const project = async (name: string, data: object) => {
			const file = path.join(dir, `${name}.vf.json`);
			await fs.writeFile(
				file,
				JSON.stringify({
					size: [SW, SH],
					fps: 30,
					footage: {
						talk: { src: 'talk.mp4', matte: 'talk.matte.mp4', transcript: 'talk.transcript.json' }
					},
					cuts: [{ source: 'talk', in: 0, out: 4 }],
					...data
				})
			);
			return loadMotionProject(file);
		};

		it('warns about a block laid out in fixed pixels for another size, not about pans or slides', async () => {
			const loaded = await project('fit', {
				clips: [
					clip('fixed', 'Fixed.svelte', 0.2, 1.6),
					clip('pan', 'Pan.svelte', 1.8, 3.2),
					clip('fits', 'Fits.svelte', 2.0, 3.6),
					clip('low', 'Sticker.svelte', 0.2, 3.6, { props: { x: 40, y: 600, text: 'LOW' } })
				]
			});
			const fit = (all: string[]) => all.filter((m) => / lies outside |leaves the /.test(m));
			const warned = fit(messages(await checkProgram(loaded)));
			expect(warned).toHaveLength(2);
			expect(warned[0]).toMatch(
				/^Clip "fixed" \(Fixed\.svelte\): \d+ % of its content lies outside the frame \(past the right edge of the 360×640 frame\) from 0\.20 s/
			);
			expect(warned[1]).toMatch(
				/^Clip "fixed" \(Fixed\.svelte\): it covers the whole frame but leaves the bottom \d+ % of it empty: its content only reaches y \d+–\d+ of 640 px/
			);
			// With --format the safe zone counts too: the low line sits under the platforms' buttons,
			// the fixed panel's title above the top inset.
			const formatted = fit(messages(await checkProgram(loaded, { format: `${SW}x${SH}` })));
			const safe = formatted.filter((m) => m.includes('safe zone'));
			expect(safe.map((m) => /^Clip "(.*?)"/.exec(m)![1])).toEqual(['fixed', 'low']);
			expect(safe[1]).toMatch(
				/^Clip "low" \(Sticker\.svelte\): 100 % of its text lies outside the safe zone of the 360×640 format \(insets: top 96, right 100, bottom 224, left 40 px/
			);
			// In a landscape frame the fixed panel fits, and the portrait card's content is cut.
			const wide = fit(messages(await checkProgram(loaded, { format: '640x360' })));
			expect(
				wide.some((m) => m.startsWith('Clip "fixed"') && m.includes('outside the frame'))
			).toBe(false);
		}, 300_000);

		it('warns about captions that start inside a shot move and are clear once it lands', async () => {
			const captions = (id: string, from: number, until: number, y: number) =>
				clip(id, '@visualfries/captions', from, until, {
					words: { captions: 'clip' },
					props: { y, maxWords: 2, size: 28 }
				});
			const loaded = await project('moves', {
				shots: [
					{ id: 'side', shot: 'strip', from: 0, until: 1.5, params: { size: 0.5 } },
					{ id: 'back', shot: 'full', from: 1.5, until: 4 }
				],
				clips: [
					clip('panel', 'Panel.svelte', 0, 2.4, { slot: 'panel' }),
					// Over the panel as it leaves, clear of everything once the full frame has landed.
					captions('cap-move', 1.5, 2.8, 0.75),
					// The same place after the move; and inside the move, far above the panel and the face.
					captions('cap-after', 2.4, 3.8, 0.75),
					captions('cap-top', 1.5, 2.8, 0.07)
				]
			});
			const warned = messages(await checkProgram(loaded)).filter((m) => m.startsWith('Captions '));
			expect(warned).toHaveLength(1);
			expect(warned[0]).toMatch(
				/^Captions "cap-move": they start at 1\.50 s \(program time\), inside the full shot "back" morphing in \(1\.50–2\.\d\d s\), and they are drawn over the moving panel/
			);
			expect(warned[0]).toMatch(/Start them when the move ends, at 2\.\d\d s \(0\.\d\d s later\)/);
		}, 300_000);

		it('warns about text behind the speaker that the head or body covers', async () => {
			const loaded = await project('behind', {
				clips: [
					// On the face, behind the speaker: covered. Above the head: clear.
					clip('hidden', 'Sticker.svelte', 0.2, 1.6, {
						layer: 'behind',
						props: { x: 150, y: 220, text: 'FACE' }
					}),
					clip('above', 'Sticker.svelte', 0.2, 1.6, {
						layer: 'behind',
						props: { x: 40, y: 40, text: 'ABOVE' }
					}),
					// Under a subject layer that draws the whole speaker.
					clip('under', 'UnderSubject.svelte', 2.0, 3.6, {
						props: { x: 150, y: 220, text: 'FACE' }
					})
				]
			});
			const warned = messages(await checkProgram(loaded)).filter((m) =>
				m.includes('the speaker covers its text behind them')
			);
			expect(warned.map((m) => /^Clip "(.*?)"/.exec(m)![1])).toEqual(['hidden', 'under']);
			expect(warned[0]).toMatch(
				/^Clip "hidden" \(Sticker\.svelte\): the speaker covers its text behind them from 0\.20 s \(program time\) on, up to \d+ % of it/
			);
			expect(warned[0]).toMatch(
				/Clear of the speaker there: the top \d+ px of the frame, above the speaker/
			);
		}, 300_000);
	}
);
