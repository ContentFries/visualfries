// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { resolveProgram, type ProgramInputs } from '$lib/motion/program.js';

const source = (frames: number) => ({
	frames,
	duration: frames / 30,
	width: 1920,
	height: 1080,
	fps: 30,
	audio: true
});
const inputs: ProgramInputs = { words: null, transcripts: {}, sources: { talk: source(400) } };
/** Two cuts at 30 fps: program frames 0–59 and 60–119, so cut edges at 0, 2 s and 4 s. */
const base = {
	size: [1920, 1080],
	fps: 30,
	footage: { talk: { src: 'talk.mp4' } },
	cuts: [
		{ source: 'talk', in: 3, out: 5 },
		{ source: 'talk', in: 8, out: 10 }
	]
};
const resolve = (extra: object) =>
	resolveProgram(parseMotionProject({ clips: [], ...base, ...extra }), inputs);
const card = (extra: object = {}) => ({
	id: 'card',
	block: 'Card.svelte',
	from: 1.9,
	until: 3.95,
	cues: { hit: 0.5 },
	...extra
});

describe('"snap": "cut" on clips', () => {
	it('moves both edges onto the nearest cut, before cues resolve', () => {
		const p = resolve({ clips: [card({ snap: 'cut' })] });
		expect(p.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
		const clip = p.clips.find((c) => c.id === 'card')!;
		expect([clip.startFrame, clip.frames]).toEqual([60, 60]);
		expect(clip.cues.hit.frame).toBe(15);
	});

	it('moves only the edge named, and leaves clips without snap alone', () => {
		const one = resolve({ clips: [card({ snap: { until: 'cut' } })] }).clips[0];
		expect([one.startFrame, one.startFrame + one.frames]).toEqual([57, 120]);
		const none = resolve({ clips: [card()] }).clips[0];
		expect([none.startFrame, none.startFrame + none.frames]).toEqual([57, 119]);
	});

	it('warns when no cut is within reach, and leaves the edge', () => {
		const p = resolve({ clips: [card({ from: 1, snap: { from: 'cut' } })] });
		expect(p.clips[0].startFrame).toBe(30);
		expect(p.diagnostics).toContainEqual({
			level: 'warning',
			clip: 'card',
			field: 'snap',
			message: expect.stringMatching(/^"snap": "cut" found no cut within 0\.4 s of "from"/)
		});
	});

	it('warns that snap needs a cut list outside a program', () => {
		const p = resolveProgram(
			parseMotionProject({
				size: [1920, 1080],
				fps: 30,
				clips: [card({ snap: 'cut' })]
			}),
			{ words: null }
		);
		expect(p.clips[0].startFrame).toBe(57);
		expect(p.diagnostics).toContainEqual({
			level: 'warning',
			clip: 'card',
			field: 'snap',
			message: expect.stringMatching(/needs a cut list/)
		});
	});

	it('refuses an unknown snap', () => {
		expect(() => parseMotionProject({ ...base, clips: [card({ snap: 'beat' })] })).toThrow();
	});
});

describe('"snap": "cut" on shots, and shot edges off a cut', () => {
	const zoom = (extra: object = {}) => ({
		id: 'zoom',
		shot: 'punch',
		from: 1.9,
		until: 'end',
		...extra
	});

	it('warns about a shot edge a few frames off a cut', () => {
		const p = resolve({ shots: [zoom()] });
		expect(p.shots.find((s) => s.id === 'zoom')!.startFrame).toBe(57);
		expect(p.diagnostics).toContainEqual({
			level: 'warning',
			item: 'zoom',
			field: 'shots[0].from',
			message: expect.stringMatching(
				/^Shot "zoom" starts 3 frames \(0\.10 s\) before the cut at 2\.00 s/
			)
		});
	});

	it('snaps the shot onto the cut, and then says nothing', () => {
		const p = resolve({ shots: [zoom({ snap: { from: 'cut' } })] });
		expect(p.shots.find((s) => s.id === 'zoom')!.startFrame).toBe(60);
		expect(p.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
	});
});

describe('review round 1: snap', () => {
	it('snaps "until" with its tail, so the clip ends on the cut', () => {
		const p = resolve({
			clips: [card({ from: 1, until: 1.9, tail: 0.2, snap: { until: 'cut' } })]
		});
		const clip = p.clips[0];
		expect(clip.startFrame + clip.frames).toBe(60);
	});

	it('keeps a chain of shots whole when both shots snap the edge they share', () => {
		const p = resolve({
			shots: [
				{ id: 'a', shot: 'full', from: 0, until: 2.1, snap: { until: 'cut' } },
				{ id: 'b', shot: 'punch', from: 2.1, until: 'end', snap: { from: 'cut' } }
			]
		});
		expect(p.diagnostics.filter((d) => d.level !== 'info')).toEqual([]);
		expect(p.shots.map((s) => [s.id, s.startFrame, s.frames])).toEqual([
			['a', 0, 60],
			['b', 60, 60]
		]);
	});
});
