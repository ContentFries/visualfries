// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { checkMotionProject, findChromium, loadMotionProject } from '../../src/lib/motion/node.js';

const BRAND = {
	colors: {
		primary: '#0f62fe',
		accent: '#ffb000',
		background: '#0b0d12',
		surface: '#161a22',
		text: '#f5f7fa',
		muted: '#9aa3b2'
	},
	fonts: {
		heading: { family: 'Acme', src: 'Acme.ttf' },
		body: { family: 'Acme', src: 'Acme.ttf' }
	}
};
const hasChromium = !!findChromium();

async function project(
	files: Record<string, string>,
	top: object = {},
	clips: object[] = [{ id: 'a', block: 'A.svelte', from: 0, until: 0.5 }]
) {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-check-'));
	for (const [name, text] of Object.entries(files)) await fs.writeFile(path.join(dir, name), text);
	await fs.writeFile(
		path.join(dir, 'p.vf.json'),
		JSON.stringify({ size: [320, 180], fps: 30, background: '#000000', clips, ...top })
	);
	return loadMotionProject(path.join(dir, 'p.vf.json'));
}

describe('checkMotionProject without a browser', () => {
	it('refuses a clip the project does not have', async () => {
		const loaded = await project({ 'A.svelte': '<div>a</div>' });
		await expect(checkMotionProject(loaded, { clips: ['nope'] })).rejects.toThrow(/nope/);
	});

	it('reports a clip that did not resolve as not checked', async () => {
		const loaded = await project({ 'A.svelte': '<div>a</div>' });
		loaded.resolved.clips = [];
		const [result] = await checkMotionProject(loaded);
		expect(result).toEqual({
			id: 'a',
			ok: false,
			errors: [{ message: 'Clip did not resolve, so it was not checked.' }],
			warnings: []
		});
	});

	it('turns the resolver diagnostics of a clip into errors and warnings', async () => {
		const loaded = await project({ 'A.svelte': '<div>a</div>' });
		loaded.resolved.diagnostics.push(
			{ level: 'error', clip: 'a', field: 'props', message: 'bad' },
			{ level: 'warning', clip: 'a', field: 'at', message: 'late' },
			{ level: 'error', clip: 'other', field: 'x', message: 'elsewhere' }
		);
		const [result] = await checkMotionProject(loaded);
		expect(result.ok).toBe(false);
		expect(result.errors).toEqual([{ message: 'props: bad' }]);
		expect(result.warnings).toEqual([{ message: 'at: late' }]);
	});

	it('warns about colours a block hard-codes when the project has a brand', async () => {
		const loaded = await project(
			{
				'Acme.ttf': 'font',
				'A.svelte': '<div style="color: #ff0000; background: #00ff00">a</div>',
				'B.svelte': '<div style="color: #ff0000">b</div>',
				'C.svelte': '<div style="color: var(--brand-ink)">c</div>'
			},
			{ brand: BRAND },
			[
				{ id: 'a', block: 'A.svelte', from: 0, until: 0.5 },
				{ id: 'b', block: 'B.svelte', from: 0, until: 0.5 },
				{ id: 'c', block: 'C.svelte', from: 0, until: 0.5 },
				{ id: 'd', block: 'missing.svelte', from: 0, until: 0.5 }
			]
		);
		loaded.resolved.clips = [];
		const results = await checkMotionProject(loaded, { clips: ['a', 'b', 'c'] });
		const warnings = (id: string) =>
			results.find((r) => r.id === id)!.warnings.map((w) => w.message);
		expect(warnings('a')).toEqual([
			'A.svelte hard-codes 2 colours (#ff0000, #00ff00); a brand change will not reach them. Use var(--brand-…) tokens or clip.brand.'
		]);
		expect(warnings('b')).toEqual([
			'B.svelte hard-codes 1 colour (#ff0000); a brand change will not reach it. Use var(--brand-…) tokens or clip.brand.'
		]);
		expect(warnings('c')).toEqual([]);
	});

	it('leaves the colours alone without a brand', async () => {
		const loaded = await project({ 'A.svelte': '<div style="color: #ff0000">a</div>' });
		loaded.resolved.clips = [];
		const [result] = await checkMotionProject(loaded);
		expect(result.warnings).toEqual([]);
	});

	it('cuts the list of colours after four', async () => {
		const loaded = await project(
			{
				'Acme.ttf': 'font',
				'A.svelte':
					'<div style="color: #111111; a: #222222; b: #333333; c: #444444; d: #555555">a</div>'
			},
			{ brand: BRAND }
		);
		loaded.resolved.clips = [];
		const [result] = await checkMotionProject(loaded);
		expect(result.warnings[0].message).toContain(
			'hard-codes 5 colours (#111111, #222222, #333333, #444444, …)'
		);
	});
});

describe.skipIf(!hasChromium)('checkMotionProject in the browser', () => {
	it('mounts a clip and tells its mode', async () => {
		const loaded = await project({ 'A.svelte': '<div>a</div>' });
		const [result] = await checkMotionProject(loaded);
		expect(result.errors).toEqual([]);
		expect(result.ok).toBe(true);
		expect(result.mode).toBeTypeOf('string');
		expect(result.nondeterministic).toBeUndefined();
	}, 60_000);

	it('passes the determinism check for a block that depends only on the frame', async () => {
		const loaded = await project({ 'A.svelte': '<div>a</div>' });
		const [result] = await checkMotionProject(loaded, { determinism: true });
		expect(result.ok).toBe(true);
		expect(result.nondeterministic).toBeUndefined();
	}, 60_000);

	it('names frames that look different depending on seek order', async () => {
		// The text is random on every draw, so no two captures of a frame agree.
		const loaded = await project({
			'A.svelte':
				'<script>import { useFrame } from "visualfries/motion"; useFrame(() => { document.getElementById("c").textContent = String(Math.random()); });</script><div id="c" style="font-size: 60px; color: #fff"></div>'
		});
		const [result] = await checkMotionProject(loaded, { determinism: true });
		expect(result.ok).toBe(false);
		expect(result.nondeterministic?.length).toBeGreaterThan(0);
		expect(result.errors[0].message).toMatch(
			/^Frames [\d, ]+ look different depending on seek order\./
		);
	}, 60_000);

	it('reports a block that throws while mounting and checks the other clips', async () => {
		const loaded = await project(
			{
				'A.svelte': '<script>throw new Error("boom");</script><div>a</div>',
				'B.svelte': '<div>b</div>'
			},
			{},
			[
				{ id: 'a', block: 'A.svelte', from: 0, until: 0.5 },
				{ id: 'b', block: 'B.svelte', from: 0, until: 0.5 }
			]
		);
		const [a, b] = await checkMotionProject(loaded);
		expect(a.ok).toBe(false);
		expect(a.errors.map((e) => e.message).join('\n')).toMatch(/boom/);
		expect(b.ok).toBe(true);
	}, 60_000);
});
