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

/** A full-frame picture (`props.src`), loaded before the clip draws. */
const PICTURE = `<script>
	import { useClip, useReady } from 'visualfries/motion';
	const p = useClip().props;
	const img = new Image();
	img.src = p.src;
	useReady(img.decode().catch(() => {}));
</script>
<img src={p.src} alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:{p.fit ?? 'fill'}" />
`;

/** An opaque card inside a parent that clips it and closes over its last 0.3 s. */
const COLLAPSE = `<script>
	import { useClip } from 'visualfries/motion';
	const clip = useClip();
	const open = $derived(1 - clip.p('end - 0.3', 0.3));
</script>
<div style="position:absolute;left:0;top:0;width:100%;height:{open * 100}%;overflow:hidden">
	<div style="position:absolute;left:0;top:0;width:${SW}px;height:${SH}px;background:#123"></div>
</div>
`;

/** A video (`props.src`) on its first frame, fitted as `props.fit` says. */
const VIDEO = `<script>
	import { useClip, useReady } from 'visualfries/motion';
	const p = useClip().props;
	let video;
	useReady(
		new Promise((done) => {
			queueMicrotask(() => {
				if (video.readyState >= 2) return done();
				video.addEventListener('loadeddata', () => done(), { once: true });
				video.addEventListener('error', () => done(), { once: true });
			});
		})
	);
</script>
<video bind:this={video} src={p.src} muted preload="auto" style="position:absolute;inset:0;width:100%;height:100%;object-fit:{p.fit ?? 'fill'}"></video>
`;

/** An opaque square turned 45°: its bounding box covers the frame, its corners leave it open. */
const DIAMOND = `<div style="position:absolute;left:50%;top:50%;width:${SH}px;height:${SH}px;margin:-${SH / 2}px 0 0 -${SH / 2}px;background:#123;transform:rotate(45deg)"></div>
`;

/** The die of DICE, kept in the page but not drawn (display: none). */
const HIDDEN_DICE = `<div style="display:none">${DICE}</div>
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
		await fs.writeFile(path.join(dir, 'Picture.svelte'), PICTURE);
		await fs.writeFile(path.join(dir, 'Collapse.svelte'), COLLAPSE);
		await fs.writeFile(path.join(dir, 'Video.svelte'), VIDEO);
		await fs.writeFile(path.join(dir, 'Diamond.svelte'), DIAMOND);
		await fs.writeFile(path.join(dir, 'HiddenDice.svelte'), HIDDEN_DICE);
		// A photo, and an overlay that is transparent but for a small patch.
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			`color=0x336699:s=${SW}x${SH}`,
			'-frames:v',
			'1',
			path.join(dir, 'photo.jpg')
		]);
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			`color=white:s=${SW}x${SH}`,
			'-vf',
			'format=rgba,colorchannelmixer=aa=0,drawbox=x=20:y=20:w=60:h=60:color=yellow@1:t=fill',
			'-frames:v',
			'1',
			path.join(dir, 'overlay.png')
		]);
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
		// The frame stays with the warning, for `check --json`.
		const frames = results.flatMap((r) =>
			r.warnings.filter((w) => w.message === found[0]).map((w) => w.frame)
		);
		expect(frames).toEqual([expect.any(Number)]);
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

	it('warns about nested CSS 3D when the page draws HTML in a canvas, once per clip', async () => {
		// The die spans the hard cut at 3 s: two segments, one warning.
		const file = path.join(dir, 'dice.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				cuts: [
					{ source: 'talk', in: 0, out: 3 },
					{ source: 'talk', in: 3, out: 4 }
				],
				clips: [{ id: 'dice', block: 'Dice.svelte', from: 2.5, until: 3.8 }]
			})
		);
		const results = await checkProgram(await loadMotionProject(file));
		const found = results
			.flatMap((r) => r.warnings.map((w) => w.message))
			.filter((m) => m.includes('nested CSS 3D'));
		if (results[0].mode !== 'html-in-canvas') return expect(found).toEqual([]);
		expect(found).toEqual([expect.stringMatching(/^Clip "dice" \(Dice\.svelte\): nested CSS 3D/)]);
		expect(found[0]).toContain('div.die');
	}, 300_000);

	it('counts only opaque, unclipped pictures and planes as full-screen', async () => {
		// Cuts at 2 s (frame 60). A transparent overlay 6 frames after it, a photo ending 3 frames
		// before it, and a card whose clipping parent closes before the next card.
		const file = path.join(dir, 'media.vf.json');
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				cuts: [
					{ source: 'talk', in: 0, out: 2 },
					{ source: 'talk', in: 2, out: 4 }
				],
				clips: [
					{
						id: 'photo',
						block: 'Picture.svelte',
						from: 0.5,
						until: 1.9,
						props: { src: { file: 'photo.jpg' } }
					},
					{
						id: 'overlay',
						block: 'Picture.svelte',
						from: 2.2,
						until: 2.6,
						props: { src: { file: 'overlay.png' } }
					},
					{ id: 'collapse', block: 'Collapse.svelte', from: 3, until: 3.5 },
					{ id: 'next', block: 'Term.svelte', from: 3.5, until: 4 }
				]
			})
		);
		const results = await checkProgram(await loadMotionProject(file));
		expect(results.flatMap((r) => r.errors)).toEqual([]);
		const found = flashes(results.flatMap((r) => r.warnings.map((w) => w.message)));
		expect(found.filter((m) => m.includes('"overlay"'))).toEqual([]);
		expect(found.filter((m) => m.startsWith('Clip "photo"'))).toEqual([
			expect.stringMatching(/ends 3 frames \(0\.10 s\) before the cut at 2\.00 s/)
		]);
		expect(found.filter((m) => m.includes('"collapse"'))).toHaveLength(1);
	}, 300_000);

	/** A project with a cut at 2 s (frame 60) and these clips. */
	const twoCuts = async (name: string, clips: object[]) => {
		const file = path.join(dir, name);
		await fs.writeFile(
			file,
			JSON.stringify({
				size: [SW, SH],
				fps: 30,
				footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
				cuts: [
					{ source: 'talk', in: 0, out: 2 },
					{ source: 'talk', in: 2, out: 4 }
				],
				clips
			})
		);
		return file;
	};

	it('does not count a letterboxed video as full-screen', async () => {
		// A landscape video in a portrait frame with object-fit: contain leaves bars.
		ffmpeg([
			'-f',
			'lavfi',
			'-i',
			'color=0x336699:s=640x360:r=30:d=1',
			'-c:v',
			'libvpx',
			'-b:v',
			'200k',
			path.join(dir, 'wide.webm')
		]);
		const file = await twoCuts('video.vf.json', [
			{
				id: 'boxed',
				block: 'Video.svelte',
				from: 2.2,
				until: 2.8,
				props: { src: { file: 'wide.webm' }, fit: 'contain' }
			},
			{
				id: 'filled',
				block: 'Video.svelte',
				from: 0.5,
				until: 1.9,
				props: { src: { file: 'wide.webm' }, fit: 'cover' }
			}
		]);
		const results = await checkProgram(await loadMotionProject(file));
		expect(results.flatMap((r) => r.errors)).toEqual([]);
		const found = flashes(results.flatMap((r) => r.warnings.map((w) => w.message)));
		expect(found.filter((m) => m.includes('"boxed"'))).toEqual([]);
		// The same video filling the frame is full-screen: its edge 3 frames before the cut warns.
		expect(found.filter((m) => m.startsWith('Clip "filled"'))).toHaveLength(1);
	}, 300_000);

	it('does not count a turned plane as full-screen, nor nested 3D that is not drawn', async () => {
		const file = await twoCuts('turned.vf.json', [
			{ id: 'diamond', block: 'Diamond.svelte', from: 2.2, until: 2.8 },
			{ id: 'hidden', block: 'HiddenDice.svelte', from: 0.5, until: 1.5 }
		]);
		const results = await checkProgram(await loadMotionProject(file));
		expect(results.flatMap((r) => r.errors)).toEqual([]);
		const messages = results.flatMap((r) => r.warnings.map((w) => w.message));
		expect(flashes(messages).filter((m) => m.includes('"diamond"'))).toEqual([]);
		expect(messages.filter((m) => m.includes('nested CSS 3D'))).toEqual([]);
	}, 300_000);
});
