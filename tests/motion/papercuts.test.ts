import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { MotionProjectShape } from '$lib/motion/project.js';
import { resolveMoment } from '$lib/motion/moment.js';
import { loadMotionProject, prepareFootage } from '../../src/lib/motion/node.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const ctx = {
	id: 'c',
	cues: { 'nových odberateľov': { start: 2, end: 3 }, extra_2: { start: 4, end: 5 } },
	duration: 10,
	fps: 25
};

describe('cue names and moments', () => {
	it('accepts cue names in any language with inner spaces', () => {
		const parse = (name: string) =>
			MotionProjectShape.safeParse({
				size: [100, 100],
				fps: 25,
				clips: [{ id: 'a', block: 'b.svelte', from: 0, until: 1, cues: { [name]: 0.5 } }]
			}).success;
		expect(parse('nových odberateľov')).toBe(true);
		expect(parse('extra_2')).toBe(true);
		expect(parse('3 dni')).toBe(false); // a digit first would read as seconds
		expect(parse(' padded')).toBe(false);
		expect(parse('know-how')).toBe(false); // "-" is an offset
	});

	it('resolves such cues with edges and offsets', () => {
		expect(resolveMoment('nových odberateľov', ctx)).toBe(2);
		expect(resolveMoment('nových odberateľov.end+0.5', ctx)).toBe(3.5);
		expect(resolveMoment('nových odberateľov - 0.25', ctx)).toBe(1.75);
		expect(resolveMoment('extra_2', ctx)).toBe(4);
	});

	it('reads a bare number as seconds, like a number from code', () => {
		expect(resolveMoment('1.5', ctx)).toBe(1.5);
		expect(resolveMoment('1.5s', ctx)).toBe(1.5);
		expect(resolveMoment(1.5, ctx)).toBe(1.5);
		expect(() => resolveMoment('nope', ctx)).toThrow(/or 2\.5\)/);
	});
});

describe('footage margin "all"', () => {
	it.skipIf(!hasFfmpeg)('extracts every frame of the footage', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-margin-'));
		spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=64x36:rate=25:duration=4', '-pix_fmt', 'yuv420p', path.join(dir, 'v.mp4')]);
		const write = async (margin: unknown) => {
			await fs.writeFile(
				path.join(dir, 'p.vf.json'),
				JSON.stringify({ size: [64, 36], fps: 25, footage: { v: { src: 'v.mp4', start: 0, ...(margin === undefined ? {} : { margin }) } }, clips: [{ id: 'a', block: 'b.svelte', from: 0, until: 0.2 }] })
			);
			const loaded = await loadMotionProject(path.join(dir, 'p.vf.json'));
			await prepareFootage(loaded, loaded.resolved.clips);
			return loaded.resolved.clips[0].footage!.v;
		};
		expect((await write(0)).last).toBe(5); // just the clip's frames (end inclusive)
		const all = await write('all');
		expect([all.first, all.last]).toEqual([0, 99]);
		await fs.rm(dir, { recursive: true, force: true });
	});
});

describe('cache command', () => {
	it('reports and clears the footage cache', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-cache-'));
		await fs.writeFile(path.join(dir, 'p.vf.json'), '{}');
		await fs.mkdir(path.join(dir, '.visualfries', 'footage', 'v-abc', 'plate'), { recursive: true });
		await fs.writeFile(path.join(dir, '.visualfries', 'footage', 'v-abc', 'plate', '000000.jpg'), Buffer.alloc(5000));
		const run = (...a: string[]) => JSON.parse(spawnSync('node', ['bin/visualfries.js', 'cache', path.join(dir, 'p.vf.json'), ...a]).stdout.toString());
		expect(run()).toMatchObject({ footageExtractions: 1 });
		expect(run('--clear')).toMatchObject({ removedFootageExtractions: 1, after: '0.00 GB' });
		await fs.rm(dir, { recursive: true, force: true });
	});
});
