// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { resolveProgram, type ProgramInputs } from '$lib/motion/program.js';
import { resolveMotionProject } from '$lib/motion/resolve.js';
import {
	cutListUnder,
	DEFAULT_INSERT_HANDLES,
	holdoutFootage,
	insertNotes,
	insertStage,
	planInserts
} from '$lib/motion/inserts.js';
import { encodeInputs } from '$lib/motion/node.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/** 30 fps; "talk" is 4 s (120 frames) with a matte. */
const SOURCES: ProgramInputs['sources'] = {
	talk: { frames: 120, width: 640, height: 360, fps: 30, audio: true, audioDuration: 4 }
};

function program(extra: Record<string, unknown>) {
	const project = parseMotionProject({
		size: [640, 360],
		fps: 30,
		background: '#000000',
		footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4' } },
		// Program frames 0–29 show source frames 15–44, 30–59 show 75–104.
		cuts: [
			{ id: 'a', source: 'talk', in: 0.5, out: 1.5 },
			{ id: 'b', source: 'talk', in: 2.5, out: 3.5 }
		],
		...extra
	});
	return { project, program: resolveProgram(project, { words: null, sources: SOURCES }) };
}

const clip = (id: string, from: number, until: number, more: Record<string, unknown> = {}) => ({
	id,
	block: 'B.svelte',
	from,
	until,
	...more
});

describe('inserts of a program: plan', () => {
	it('adds handles inside the program and maps the file through the cut list', () => {
		const { project, program: p } = program({
			clips: [clip('word', 0.4, 1.6, { layer: 'behind' }), clip('lower', 0.2, 0.8)]
		});
		expect(p.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		const [word, lower] = planInserts(p, project);
		expect(DEFAULT_INSERT_HANDLES).toBe(10);
		// The clip covers program frames 12–47; the file 2–57.
		expect([word.startFrame, word.frames, word.handles]).toEqual([
			2,
			56,
			{ before: 10, after: 10 }
		]);
		expect(word.sources).toEqual([
			{ cut: 'a', source: 'talk', startFrame: 2, frames: 28, srcIn: 17, srcOut: 45 },
			{ cut: 'b', source: 'talk', startFrame: 30, frames: 28, srcIn: 75, srcOut: 103 }
		]);
		expect([word.alpha, word.holdout]).toEqual([true, true]);
		// Handles stop at the program's first frame (and its last).
		expect([lower.startFrame, lower.handles]).toEqual([0, { before: 6, after: 10 }]);
		const late = program({ clips: [clip('end', 1.8, 2)] });
		expect(planInserts(late.program, late.project)[0].handles).toEqual({ before: 10, after: 0 });
	});

	it('takes --handles and --clip, and refuses bad values', () => {
		const { project, program: p } = program({ clips: [clip('x', 0.5, 1), clip('y', 1, 1.5)] });
		const [y] = planInserts(p, project, { handles: 0, clips: ['y'] });
		expect([y.id, y.startFrame, y.frames, y.handles]).toEqual([
			'y',
			30,
			15,
			{ before: 0, after: 0 }
		]);
		expect(() => planInserts(p, project, { clips: ['nope'] })).toThrow(/Unknown clip "nope"/);
		expect(() => planInserts(p, project, { handles: -1 })).toThrow(/--handles/);
		expect(() => planInserts(p, project, { handles: 2.5 })).toThrow(/--handles/);
	});

	it('is transparent unless the clip says "alpha": false; behind is always a holdout', () => {
		const { project, program: p } = program({
			clips: [
				clip('over', 0, 1),
				clip('card', 0, 1, { alpha: false, background: '#203040' }),
				clip('plain', 0, 1, { alpha: false }),
				clip('word', 0, 1, { alpha: false, layer: 'behind' })
			]
		});
		expect(planInserts(p, project).map((i) => [i.id, i.alpha, i.background, i.holdout])).toEqual([
			['over', true, null, false],
			['card', false, '#203040', false],
			['plain', false, '#000000', false],
			['word', true, null, true]
		]);
	});

	it('lists the cut list under any range', () => {
		const { program: p } = program({ clips: [clip('x', 0, 1)] });
		expect(cutListUnder(p, 25, 10)).toEqual([
			{ cut: 'a', source: 'talk', startFrame: 25, frames: 5, srcIn: 40, srcOut: 45 },
			{ cut: 'b', source: 'talk', startFrame: 30, frames: 5, srcIn: 75, srcOut: 80 }
		]);
		expect(cutListUnder(p, 60, 5)).toEqual([]);
	});

	it('draws the clip alone over the whole file, without transitions', () => {
		const { project, program: p } = program({
			clips: [
				clip('x', 0.5, 1, { transition: 'wipe' }),
				clip('y', 0.5, 1.5, { alpha: false, background: '#112233' })
			]
		});
		const [x, y] = planInserts(p, project);
		const footage = { frames: {}, map: null };
		const sx = insertStage(p, x, footage);
		expect(sx.clips.map((c) => [c.id, c.show])).toEqual([['x', { from: 5, until: 40 }]]);
		expect([sx.startFrame, sx.frames, sx.transitions, sx.background, sx.insert]).toEqual([
			5,
			35,
			[],
			null,
			{ holdout: false }
		]);
		expect(insertStage(p, y, footage).background).toBe('#112233');
	});
});

describe('inserts of a program: notes', () => {
	it('says what the inserts leave to the program render', () => {
		const { project, program: p } = program({
			cuts: [
				{ id: 'a', source: 'talk', in: 0.5, out: 1.5 },
				{ id: 'b', source: 'talk', in: 2.5, out: 3.5, transition: 'push' }
			],
			shots: [
				{ id: 'side', shot: 'strip', from: 1.2, until: 1.9 },
				{ id: 'close', shot: 'punch', from: 0.2, until: 0.6 }
			],
			clips: [
				clip('own', 0.6, 0.9, { transition: 'wipe' }),
				clip('leaves', 0.2, 1),
				clip('arrives', 1, 1.2),
				clip('panel', 1.2, 1.9, {
					slot: 'panel',
					keys: [
						{ at: 0, x: 10 },
						{ at: 0.5, x: 0 }
					]
				}),
				clip('word', 0.3, 0.5, { layer: 'behind' }),
				clip('plain', 0.1, 0.2, { audio: 'talk' })
			]
		});
		const notes = insertNotes(p, project);
		const by = (id: string) => notes.filter((n) => n.clip === id).map((n) => n.message);
		expect(notes.every((n) => n.level === 'info')).toBe(true);
		expect(notes[0]).toMatchObject({ item: 'inserts', field: 'export' });
		expect(notes[0].message).toMatch(
			/2 shots and 1 cut or shot transition stay in the program render/
		);
		expect(by('own')).toEqual([
			expect.stringMatching(/Its wipe transition is drawn only in the program/)
		]);
		expect(by('leaves')).toEqual([expect.stringMatching(/leaves with the push transition into b/)]);
		expect(by('arrives')).toEqual([
			expect.stringMatching(/arrives with the push transition into b/)
		]);
		expect(by('panel')).toEqual([
			expect.stringMatching(/"panel" slot of shot "side".*frame coordinates.*placement keys/)
		]);
		expect(by('word')).toEqual([
			expect.stringMatching(/behind the subject while shot "close" reframes/)
		]);
		expect(by('plain')).toEqual([expect.stringMatching(/"audio" is not muxed/)]);
		// The plan carries the same lines.
		expect(planInserts(p, project, { clips: ['panel'] })[0].notes).toEqual(by('panel'));
	});

	it('has nothing to say about a plain program, or without one', () => {
		const { project, program: p } = program({ clips: [clip('x', 0.2, 0.8, { slot: 'panel' })] });
		expect(insertNotes(p, project)).toEqual([]);
		const legacy = parseMotionProject({ size: [64, 36], fps: 30, clips: [clip('x', 0, 1)] });
		expect(insertNotes(resolveProgram(legacy, { words: null }), legacy)).toEqual([]);
	});
});

// ---------------------------------------------------------------- inserts mode (no cut list)

function legacy(c: Record<string, unknown>, footage: Record<string, unknown> = {}) {
	return parseMotionProject({
		size: [64, 36],
		fps: 25,
		footage: { talk: { src: 'talk.mp4', matte: 'talk.matte.mp4', start: 0 }, ...footage },
		clips: [{ id: 'c', block: 'b.svelte', from: 0, until: 1, ...c }]
	});
}

describe('a behind clip without a cut list (holdout, as #82)', () => {
	it('needs alpha and exactly one footage with a matte', () => {
		const error = (p: ReturnType<typeof legacy>) => {
			const h = holdoutFootage(p, 'c');
			return h && 'error' in h ? h.error : h;
		};
		expect(error(legacy({ alpha: true, layer: 'behind' }))).toEqual({ footage: 'talk' });
		expect(error(legacy({ alpha: true }))).toBeNull();
		expect(error(legacy({ layer: 'behind' }))).toMatch(/"alpha": true/);
		expect(error(legacy({ alpha: true, layer: 'behind' }, { talk: { src: 't.mp4' } }))).toMatch(
			/needs footage with a matte/
		);
		expect(
			error(legacy({ alpha: true, layer: 'behind' }, { two: { src: 'b.mp4', matte: 'b.m.mp4' } }))
		).toMatch(/"talk", "two" all have one/);
	});

	it('leaves the encode of other clips exactly as before', () => {
		const p = legacy({ audio: 'talk' }, { talk: { src: 't.mp4', start: 0.5 } });
		const c = { ...resolveMotionProject(p, null).clips[0], start: 0.2, duration: 0.4 };
		expect(encodeInputs({ project: p, dir: '/x' }, c)).toEqual([
			'-ss',
			'0.000000',
			'-i',
			'/x/t.mp4',
			'-map',
			'0:v',
			'-map',
			'1:a:0',
			'-af',
			'adelay=320:all=1,apad',
			'-t',
			'0.400000',
			'-c:a',
			'aac',
			'-b:a',
			'192k'
		]);
		expect(encodeInputs({ project: p, dir: '/x' }, { ...c, audio: null })).toEqual([]);
	});

	it('aligns the matte to the program frame and keeps the sound', () => {
		const p = legacy(
			{ alpha: true, layer: 'behind', audio: 'talk' },
			{ talk: { src: 't.mp4', matte: 't.matte.mp4', start: 0.5 } }
		);
		const c = {
			...resolveMotionProject(p, null).clips[0],
			start: 0.2,
			startFrame: 5,
			frames: 10,
			duration: 0.4
		};
		const args = encodeInputs({ project: p, dir: '/x' }, c);
		// The footage starts at program frame 13 (0.5 s → round(12.5)); the clip at frame 5: 8
		// frames of nothing cut first.
		expect(args.slice(0, 4)).toEqual(['-ss', '0.000000', '-i', '/x/t.matte.mp4']);
		expect(args.join(' ')).toContain('tpad=start=8:');
		expect(args[args.indexOf('-map') + 1]).toBe('[vf_v]');
		expect(args).toContain('2:a:0');
	});

	it.skipIf(!hasFfmpeg)('cuts the alpha where the matte is white, frame-exact', async () => {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-holdout-'));
		const ff = (a: string[]) => {
			const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a]);
			if (r.status !== 0) throw new Error(String(r.stderr));
			return r.stdout;
		};
		try {
			// Matte frame n: a white bar on the left from x = 0 to 4·n (64×36, 25 fps, 10 frames).
			ff([
				'-f',
				'lavfi',
				'-i',
				'color=black:s=64x36:r=25:d=0.4',
				'-vf',
				"format=gray,geq=lum='if(lt(X,4*N+1),255,0)'",
				'-c:v',
				'ffv1',
				path.join(dir, 'talk.matte.mkv')
			]);
			const p = legacy(
				{ alpha: true, layer: 'behind' },
				{ talk: { src: 'talk.mp4', matte: 'talk.matte.mkv', start: 0.08 } }
			);
			const c = {
				...resolveMotionProject(p, null).clips[0],
				startFrame: 0,
				frames: 10,
				start: 0,
				duration: 0.4
			};
			const out = path.join(dir, 'out.mov');
			// Input 0 stands in for the piped frames: opaque red.
			ff([
				'-f',
				'lavfi',
				'-i',
				'color=red:s=64x36:r=25:d=0.4,format=rgba',
				...encodeInputs({ project: p, dir }, c),
				'-c:v',
				'prores_ks',
				'-profile:v',
				'4444',
				'-pix_fmt',
				'yuva444p10le',
				out
			]);
			const alpha = (n: number) =>
				ff([
					'-i',
					out,
					'-vf',
					`select=eq(n\\,${n}),format=rgba,alphaextract,format=gray`,
					'-frames:v',
					'1',
					'-f',
					'rawvideo',
					'-'
				]).subarray(18 * 64, 19 * 64);
			// Clip frames 0–1 come before the footage (start 0.08 s = frame 2): nothing cut.
			expect(Math.min(...alpha(1))).toBeGreaterThan(250);
			// Clip frame 5 shows footage frame 3: the bar covers x < 13.
			const row = alpha(5);
			expect(Math.max(...row.subarray(0, 11))).toBeLessThan(5);
			expect(Math.min(...row.subarray(15))).toBeGreaterThan(250);
		} finally {
			await fs.rm(dir, { recursive: true, force: true });
		}
	});
});
