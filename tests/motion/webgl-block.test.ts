// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	checkMotionProject,
	findChromium,
	loadMotionProject,
	openClip,
	renderMotionClips,
	renderStills
} from '../../src/lib/motion/node.js';

// A block with a nested WebGL `<canvas layoutsubtree>` that samples its own children.
const BLOCK = path.join(
	path.dirname(fileURLToPath(import.meta.url)),
	'fixtures/webgl-block/WebGlBlock.svelte'
);
const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const FRAMES = 12;

async function project(clip: object, files: Record<string, string> = {}, top: object = {}) {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-webgl-'));
	for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(dir, name), text);
	await fs.writeFile(
		path.join(dir, 'p.vf.json'),
		JSON.stringify({
			size: [320, 180],
			fps: 30,
			background: '#000000',
			clips: [{ id: 'webgl', block: BLOCK, from: 0, until: FRAMES / 30, ...clip }],
			...top
		})
	);
	return { dir, loaded: await loadMotionProject(path.join(dir, 'p.vf.json')) };
}

/** RGBA of one pixel of a PNG, decoded by ffmpeg. */
function pixel(png: Buffer, x: number, y: number, width: number): number[] {
	const raw = spawnSync(
		'ffmpeg',
		['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'],
		{ input: png }
	).stdout;
	const i = (y * width + x) * 4;
	return [...raw.subarray(i, i + 4)];
}

/** A page that loads, then never answers a frame: what Playwright does once the renderer died. */
function stuckBrowser({ loads = true } = {}) {
	const listeners: Record<string, ((e: unknown) => void)[]> = {};
	let calls = 0;
	const page = {
		on: (event: string, fn: (e: unknown) => void) => (listeners[event] ??= []).push(fn),
		route: async () => {},
		goto: async () => {},
		evaluate: () =>
			++calls === 1 && loads ? Promise.resolve({ mode: 'html-in-canvas' }) : new Promise(() => {}),
		locator: () => ({ screenshot: async () => Buffer.alloc(0) }),
		close: async () => {}
	};
	return {
		crash: () => listeners.crash?.forEach((fn) => fn(page)),
		browser: { newPage: async () => page, close: async () => {} }
	};
}

describe('a page that crashes or stops answering', () => {
	const clip = { id: 'a', size: [320, 180], alpha: false } as never;
	const bundle = { dir: '', html: '/x/index.html', roots: [], files: [] };

	it('fails the frame as soon as the page crashes', async () => {
		const { browser, crash } = stuckBrowser();
		const page = await openClip(browser as never, bundle, clip);
		const frame = page.capture(3);
		crash();
		await expect(frame).rejects.toThrow('Clip "a": the browser page crashed during frame 3');
		await expect(page.capture(4)).rejects.toThrow(/crashed during frame 4/);
	});

	it('names the clip once when the page crashes while loading', async () => {
		const { browser, crash } = stuckBrowser({ loads: false });
		const page = openClip(browser as never, bundle, clip);
		await new Promise((resolve) => setTimeout(resolve, 0));
		crash();
		await expect(page).rejects.toThrow(
			/^Clip "a": the browser page crashed during loading \(Chromium's renderer process died\)\.$/
		);
	});

	it('fails the frame when the page never answers', async () => {
		const { browser } = stuckBrowser();
		const page = await openClip(browser as never, bundle, clip, { timeout: 50 });
		await expect(page.capture(0)).rejects.toThrow('Clip "a": frame 0 did not finish within 0.05 s');
	});
});

describe.skipIf(!hasChromium || !hasFfmpeg)('a block with its own WebGL canvas', () => {
	for (const invalidate of [undefined, 'reattach']) {
		it(`shows the canvas in every frame, the same in any order (invalidate: ${invalidate ?? 'default'})`, async () => {
			const { loaded } = await project({});
			const order = [...Array(FRAMES).keys()];
			const shuffled = [5, 0, 11, 3, 8, 1, 10, 6, 2, 9, 4, 7];
			const stills = await renderStills(
				loaded,
				[...order, ...[...order].reverse(), ...shuffled].map((f) => ({
					clip: 'webgl',
					at: `f${f}`
				})),
				{ invalidate }
			);
			const first = new Map<number, Buffer>();
			for (const s of stills) {
				// Without the canvas the frame is the black stage background.
				expect(pixel(s.png, 10, 10, 320), `frame ${s.frame}`).toEqual([
					(s.frame * 8) % 256,
					128,
					64,
					255
				]);
				const seen = first.get(s.frame);
				if (seen) expect(s.png.equals(seen), `frame ${s.frame} depends on order`).toBe(true);
				else first.set(s.frame, s.png);
			}
		}, 60_000);
	}

	for (const invalidate of [undefined, 'reattach']) {
		it(`shows a canvas that mounts mid-clip, the same in any order (invalidate: ${invalidate ?? 'default'})`, async () => {
			const { loaded } = await project({ props: { from: 2 } });
			const order = [0, 1, 2, 3, 1, 4, 0, 5, 2, 1];
			const stills = await renderStills(
				loaded,
				order.map((f) => ({ clip: 'webgl', at: `f${f}` })),
				{ invalidate }
			);
			const first = new Map<number, Buffer>();
			for (const s of stills) {
				expect(pixel(s.png, 10, 10, 320), `frame ${s.frame}`).toEqual(
					s.frame < 2 ? [0, 0, 0, 255] : [(s.frame * 8) % 256, 128, 64, 255]
				);
				const seen = first.get(s.frame);
				if (seen) expect(s.png.equals(seen), `frame ${s.frame} depends on order`).toBe(true);
				else first.set(s.frame, s.png);
			}
		}, 60_000);
	}

	it('names a filter around the canvas instead of crashing the page', async () => {
		const { loaded } = await project({ props: { wrap: 'filter: blur(1px)' } });
		await expect(renderStills(loaded, [{ clip: 'webgl', at: 'f0' }])).rejects.toThrow(
			/<div class="wrap[^>]*> has a CSS filter and holds a <canvas layoutsubtree>/
		);
		const [checked] = await checkMotionProject(loaded);
		expect(checked.errors.map((e) => e.message).join('\n')).toMatch(/has a CSS filter/);
	}, 60_000);

	it('names the stage by its id', async () => {
		const { loaded } = await project(
			{},
			{ 'stage.css': '#vf-stage { filter: blur(1px) }' },
			{ styles: ['stage.css'] }
		);
		await expect(renderStills(loaded, [{ clip: 'webgl', at: 'f0' }])).rejects.toThrow(
			'Clip "webgl" failed to load: <div id="vf-stage"> has a CSS filter'
		);
	}, 60_000);

	it('fails the render at once when the page crashes', async () => {
		// The filter lands after the stage's check, right before the paint: Chromium crashes.
		const { dir, loaded } = await project(
			{ block: 'Crash.svelte' },
			{
				'Crash.svelte': `<script>
	import { useFrame } from 'visualfries/motion';
	let wrap = $state();
	useFrame(() => requestAnimationFrame(() => (wrap.style.filter = 'blur(1px)')));
</script>

<div bind:this={wrap}><canvas layoutsubtree width="320" height="180"><p>x</p></canvas></div>
`
			}
		);
		const t0 = Date.now();
		const render = renderMotionClips(loaded, { output: path.join(dir, 'out.mp4'), jobs: 2 });
		await expect(render).rejects.toThrow(/Clip "webgl": the browser page crashed during frame \d+/);
		expect(Date.now() - t0).toBeLessThan(30_000);
	}, 60_000);
});
