import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseMotionProject } from '$lib/motion/timeline.js';
import { parseTranscriptWords, type MotionWord } from '$lib/motion/transcript.js';
import { resolveCutList, type ProgramInputs } from '$lib/motion/cutlist.js';
import { resolveMotionProject } from '$lib/motion/resolve.js';
import { loadMotionProject } from '../../src/lib/motion/node.js';

const DIR = path.join(__dirname, 'fixtures/program');
const read = (file: string) => JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
const take = (n: number) => parseTranscriptWords(read(`take${n}.transcript.json`));
const fixture = () => read('retake.vf.json');

function resolve(
	json: Record<string, unknown>,
	transcript: MotionWord[],
	extra: Partial<ProgramInputs> = {}
) {
	const project = parseMotionProject(json);
	const cutList = resolveCutList(project, {
		words: null,
		transcripts: { talk: transcript },
		...extra
	});
	return { project, cutList, resolved: resolveMotionProject(project, cutList.words) };
}

const errors = (d: { level: string }[]) => d.filter((x) => x.level === 'error');

describe('cut list', () => {
	it('resolves word-anchored cut points in source time and stacks them in program time', () => {
		const { cutList } = resolve(fixture(), take(1));
		expect(errors(cutList.diagnostics)).toEqual([]);
		expect(cutList.cuts.map((c) => [c.id, c.srcIn, c.srcOut, c.startFrame, c.frames])).toEqual([
			['cut1', 15, 54, 0, 39],
			['cut2', 90, 150, 39, 60],
			['cut3', 240, 288, 99, 48],
			['cut4', 315, 357, 147, 42]
		]);
		expect(cutList.frames).toBe(189);
		expect(cutList.cuts[2].transition).toBe('push');
	});

	it('maps source words to program time and numbers them in program order', () => {
		const { cutList } = resolve(fixture(), take(1));
		const words = cutList.words!;
		expect(words.map((w) => w.text).join(' ')).toBe(
			'Hello and welcome back today we fix the slow export Then pick a faster codec That is all for today'
		);
		expect(words.map((w) => w.id)).toEqual(words.map((_, i) => `w${i}`));
		const today = words.find((w) => w.text === 'today')!;
		expect(today).toMatchObject({ source: 'talk', sourceIndex: 5, cut: 1, sourceStart: 3 });
		expect(today.start).toBeCloseTo(39 / 30, 9);
	});

	describe('retake', () => {
		it('follows a retake with shifted timing: cut points, clip anchors and duration', () => {
			const a = resolve(fixture(), take(1));
			const b = resolve(fixture(), take(2));
			expect(errors(b.cutList.diagnostics)).toEqual([]);
			expect(errors(b.resolved.diagnostics)).toEqual([]);
			// Cut points follow the words (t' = 1.2 + 1.1 t): "in" frame-rounded, "out" rounded up
			// so the frame holding the end of the last word stays in.
			const src = (t: number) => Math.round((1.2 + 1.1 * t) * 30);
			const end = (t: number) => Math.ceil((1.2 + 1.1 * t) * 30 - 1e-6);
			expect(b.cutList.cuts.map((c) => [c.srcIn, c.srcOut])).toEqual([
				[src(0.5), end(1.8)],
				[src(3.0), end(5.0)],
				[src(8.0), end(9.6)],
				[src(10.5), end(11.9)]
			]);
			expect(end(1.8)).toBe(96);
			expect(b.cutList.frames).not.toBe(a.cutList.frames);
			expect(b.cutList.frames).toBe(b.cutList.cuts.reduce((n, c) => n + c.frames, 0));
			// Clips still start on their words, which now sit later in the program.
			for (const r of [a, b]) {
				const title = r.resolved.clips.find((c) => c.id === 'title')!;
				expect(title.startFrame).toBe(r.cutList.cuts[1].startFrame);
				const codec = r.resolved.clips.find((c) => c.id === 'codec')!;
				expect(codec.startFrame).toBe(r.cutList.cuts[2].startFrame);
				expect(codec.cues.codec.words.map((w) => w.text)).toEqual(['faster', 'codec']);
			}
			expect(b.resolved.clips[0].startFrame).toBeGreaterThan(a.resolved.clips[0].startFrame);
		});

		it('fails a changed word with a suggestion', () => {
			const { cutList } = resolve(fixture(), take(3));
			expect(errors(cutList.diagnostics)).toEqual([
				expect.objectContaining({
					item: 'cut3',
					field: 'cuts[2].out',
					message: expect.stringMatching(
						/^cut 3: Phrase "faster codec" not found inside the cut\. Did you mean "fast codec" at 8\.65s/
					)
				})
			]);
		});

		it('re-resolves through the loader when the footage transcript changes', async () => {
			const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-retake-'));
			for (const f of ['take1.transcript.json', 'take2.transcript.json'])
				fs.copyFileSync(path.join(DIR, f), path.join(dir, f));
			const write = (t: string) => {
				const json = fixture();
				json.footage.talk.transcript = t;
				fs.writeFileSync(path.join(dir, 'p.vf.json'), JSON.stringify(json));
				return loadMotionProject(path.join(dir, 'p.vf.json'));
			};
			const a = await write('take1.transcript.json');
			const b = await write('take2.transcript.json');
			expect(a.cutList.mode).toBe('program');
			expect(a.hashes.transcripts.talk).not.toBe(b.hashes.transcripts.talk);
			expect(a.transcriptHash).not.toBe(b.transcriptHash);
			expect(a.resolved.clips[1].startFrame).toBe(99);
			expect(b.resolved.clips[1].startFrame).toBe(b.cutList.cuts[2].startFrame);
			expect(b.resolved.clips[1].startFrame).not.toBe(99);
		});
	});

	describe('J and L cuts', () => {
		const split = (seconds: number) => {
			const json = fixture();
			json.cuts = json.cuts.slice(0, 2);
			json.cuts[1].audio = { split: seconds };
			json.clips = [];
			json.shots = undefined;
			json.sfx = undefined;
			return resolve(json, take(1));
		};

		it('moves words with the sound by exactly the split', () => {
			const { cutList } = split(-0.5);
			expect(errors(cutList.diagnostics)).toEqual([]);
			const [, second] = cutList.cuts;
			expect(second.edit).toBe(0.8);
			const words = cutList.words!;
			// "So," was before cut 2's "in"; with the sound leading 0.5 s it is heard, at its own offset.
			const so = words.find((w) => w.text === 'So')!;
			expect(so.cut).toBe(1);
			expect(so.start).toBe(2.55 + (39 / 30 - 90 / 30));
			expect(so.end).toBe(2.85 + (39 / 30 - 90 / 30));
			// "back." of cut 1 is replaced by the incoming sound; "welcome" is cut at the edit point.
			expect(words.map((w) => w.text)).not.toContain('back');
			const welcome = words.find((w) => w.text === 'welcome')!;
			expect(welcome.end).toBe(second.edit);
			expect(cutList.diagnostics).toContainEqual(
				expect.objectContaining({
					level: 'warning',
					message: expect.stringContaining('cuts through "welcome"')
				})
			);
			// Words on the picture side do not move.
			expect(words.find((w) => w.text === 'today')!.start).toBe(3 + (39 / 30 - 90 / 30));
		});

		it('keeps the outgoing sound on an L cut', () => {
			const { cutList } = split(0.25);
			expect(cutList.cuts[1].edit).toBe(1.55);
			// "today" starts on the picture cut but its sound is covered by the outgoing cut.
			expect(cutList.words!.map((w) => w.text)).not.toContain('today');
			expect(cutList.words!.map((w) => w.text)).toContain('we');
		});

		it('warns about the outgoing last word a J cut leaves partly heard', () => {
			const { cutList } = split(-0.3);
			// "back." plays 0.95–1.30 s; the incoming sound takes over at 1.00 s.
			expect(cutList.words!.map((w) => w.text)).not.toContain('back');
			expect(cutList.diagnostics).toContainEqual({
				level: 'warning',
				item: 'cut2',
				field: 'cuts[1]',
				message:
					'cut 2: the audio edit point at 1.00 s cuts through "back" (0.95–1.30 s); only part of it is heard, and it is left out of the program transcript.'
			});
		});

		it("limits an L cut by the length of the footage's audio file", () => {
			const json = fixture();
			json.cuts = [
				{ source: 'talk', in: 0.2, out: 1 },
				{ source: 'talk', in: 3, out: 4, audio: { split: 0.3 } }
			];
			json.clips = [];
			json.shots = undefined;
			json.sfx = undefined;
			const info = { frames: 400, duration: 400 / 30, width: 1, height: 1, fps: 30, audio: true };
			const { cutList } = resolve(json, take(1), {
				sources: { talk: { ...info, audioDuration: 1.1 } }
			});
			expect(errors(cutList.diagnostics)[0].message).toBe(
				'cut 2: the L cut needs 0.30 s of "talk" sound after "out" of the previous cut, 0.10 s available.'
			);
			expect(
				errors(resolve(json, take(1), { sources: { talk: info } }).cutList.diagnostics)
			).toEqual([]);
		});

		it('refuses a split beyond the source sound', () => {
			const json = fixture();
			json.cuts = [
				{ source: 'talk', in: 0.2, out: 1 },
				{ source: 'talk', in: 0.1, out: 2, audio: { split: -0.3 } }
			];
			json.clips = [];
			json.shots = undefined;
			json.sfx = undefined;
			const { cutList } = resolve(json, take(1));
			expect(errors(cutList.diagnostics)[0].message).toBe(
				'cut 2: the J cut needs 0.30 s of "talk" sound before "in", 0.10 s available.'
			);
		});
	});

	it('warns about a word whose tail is heard after an "in" set mid-word', () => {
		const json = fixture();
		json.cuts = [
			{ source: 'talk', in: 0.5, out: 1.8 },
			{ source: 'talk', in: 4.3, out: 5 }
		];
		json.clips = [];
		json.shots = undefined;
		json.sfx = undefined;
		const { cutList } = resolve(json, take(1));
		expect(cutList.words!.map((w) => w.text)).not.toContain('slow');
		expect(cutList.diagnostics).toContainEqual({
			level: 'warning',
			item: 'cut2',
			field: 'cuts[1]',
			message:
				'cut 2: the audio edit point at 1.30 s cuts through "slow" (1.00–1.40 s); only part of it is heard, and it is left out of the program transcript.'
		});
	});

	it('rounds "out" up so the frame with the end of the last word stays, within the source', () => {
		const json = fixture();
		json.cuts = [{ source: 'talk', in: 0.5, out: 1.81 }];
		json.clips = [];
		json.shots = undefined;
		json.sfx = undefined;
		expect(resolve(json, take(1)).cutList.cuts[0].srcOut).toBe(55);
		const info = { frames: 54, duration: 1.8, width: 1, height: 1, fps: 30, audio: true };
		const short = resolve(json, take(1), { sources: { talk: info } }).cutList;
		expect(errors(short.diagnostics)).toEqual([]);
		expect(short.cuts[0].srcOut).toBe(54);
	});

	it('reports a repeated range as ambiguous', () => {
		const json = fixture();
		json.cuts = [json.cuts[0], json.cuts[0]];
		json.clips = [{ id: 'hi', block: 'b.svelte', from: 'hello and welcome', until: 1.2 }];
		json.shots = undefined;
		json.sfx = undefined;
		const { cutList, resolved } = resolve(json, take(1));
		expect(cutList.words!.filter((w) => w.text === 'Hello').map((w) => w.cut)).toEqual([0, 1]);
		expect(errors(resolved.diagnostics)[0].message).toMatch(
			/Phrase "hello and welcome" is ambiguous: #1 at 0\.00s .*#2 at 1\.30s/
		);
	});

	it('lists numeric cut points, which do not follow a retake', () => {
		const json = fixture();
		json.cuts[0] = { source: 'talk', in: 0.5, out: { frame: 54 } };
		const { cutList } = resolve(json, take(2));
		expect(cutList.diagnostics.filter((d) => d.level === 'info').map((d) => d.message)).toEqual([
			'cut 1: "in" is 0.50 s of "talk"; it does not follow a retake.',
			'cut 1: "out" is 1.80 s of "talk"; it does not follow a retake.'
		]);
	});
});

describe('footage shorthand and transcripts', () => {
	const base = { size: [1080, 1920], fps: 30, shots: [{ shot: 'full', from: 0, until: 1 }] };
	const info = { frames: 300, duration: 10, width: 1080, height: 1920, fps: 30, audio: true };

	it('makes one range from the only footage, starting at minus its start', () => {
		const project = parseMotionProject({
			...base,
			footage: { talk: { src: 't.mp4', start: -0.5 } }
		});
		const words = parseTranscriptWords([{ text: 'hi', start: 1, end: 1.2 }]);
		const cutList = resolveCutList(project, { words, sources: { talk: info } });
		expect(cutList.cuts.map((c) => [c.source, c.srcIn, c.srcOut, c.frames])).toEqual([
			['talk', 15, 300, 285]
		]);
		// A project-level transcript is program time: kept as is, with its source attached.
		expect(cutList.words![0]).toMatchObject({
			id: 'w0',
			start: 1,
			source: 'talk',
			cut: 0,
			sourceStart: 1.5
		});
		expect(cutList.diagnostics).toEqual([]);
	});

	it('needs "cuts" for several footage and "in" instead of a positive start', () => {
		const two = parseMotionProject({
			...base,
			footage: { a: { src: 'a.mp4' }, b: { src: 'b.mp4' } }
		});
		expect(resolveCutList(two, { words: null }).diagnostics[0].message).toMatch(
			/Several footage \(a, b\) and no "cuts"/
		);
		const late = parseMotionProject({ ...base, footage: { a: { src: 'a.mp4', start: 2 } } });
		expect(resolveCutList(late, { words: null }).diagnostics[0]).toMatchObject({
			field: 'footage.a.start',
			message: expect.stringContaining('"in"')
		});
	});

	it('says where to move a program-time transcript', () => {
		const withCuts = parseMotionProject({
			...base,
			transcript: 't.json',
			footage: { talk: { src: 't.mp4' } },
			cuts: [{ source: 'talk', out: 1 }]
		});
		expect(resolveCutList(withCuts, { words: null }).diagnostics[0].message).toMatch(
			/Move it to "footage\.talk\.transcript"/
		);
		const both = parseMotionProject({
			...base,
			transcript: 't.json',
			footage: { talk: { src: 't.mp4', transcript: 'talk.json' } }
		});
		expect(resolveCutList(both, { words: null }).diagnostics[0].message).toMatch(
			/cannot be combined/
		);
	});

	it('leaves inserts mode alone', () => {
		const project = parseMotionProject({
			size: [100, 100],
			fps: 30,
			footage: { talk: { src: 't.mp4', start: 3 } },
			clips: [{ id: 'a', block: 'b', from: 0, until: 1 }]
		});
		const cutList = resolveCutList(project, { words: null });
		expect(cutList).toEqual({
			mode: 'inserts',
			cuts: [],
			frames: null,
			words: null,
			diagnostics: []
		});
	});
});
