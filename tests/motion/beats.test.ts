import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { MotionProjectShape, type MotionMusic } from '$lib/motion/project.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import { resolveMotionProject } from '$lib/motion/resolve.js';
import { Clip } from '$lib/motion/runtime.svelte.js';
import {
	BeatsFileShape,
	barRows,
	formatBarGrid,
	programBeats,
	type BeatsFile
} from '$lib/motion/beat-grid.js';
import {
	analyzeBeats,
	buildBeatsFile,
	commandBeats,
	fileSha256,
	formatBeatsFile,
	parseAnalyzerOutput
} from '../../src/lib/motion/beats.js';
import { describeMusicGrid, loadMotionProject } from '../../src/lib/motion/node.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
const FIXTURE = path.resolve('tests/motion/fixtures/music.beats.json');

/**
 * 120 BPM in 4/4: a pickup beat at 0.5 s, then bars 1–4 starting at 1, 3, 5 and 7 s; beats 1–17.
 * Bars 3 and 4 are louder.
 */
const file: BeatsFile = BeatsFileShape.parse(JSON.parse(await fs.readFile(FIXTURE, 'utf8')));

const words = parseTranscriptWords([
	{ text: 'And', start: 0.2, end: 0.4 },
	{ text: 'now', start: 0.4, end: 0.7 },
	{ text: 'the', start: 3.2, end: 3.3 },
	{ text: 'drop', start: 3.3, end: 3.8 },
	{ text: 'is', start: 6.1, end: 6.3 },
	{ text: 'here', start: 6.3, end: 6.9 }
]);

function project(clip: Record<string, unknown>, music: Partial<MotionMusic>[] = [{}]) {
	return MotionProjectShape.parse({
		size: [1080, 1920],
		fps: 30,
		music: music.map((m) => ({ src: 'music.wav', beats: 'music.beats.json', ...m })),
		clips: [{ id: 'c', block: 'b.svelte', ...clip }]
	});
}

function resolve(clip: Record<string, unknown>, music: Partial<MotionMusic>[] = [{}]) {
	const p = project(clip, music);
	return resolveMotionProject(
		p,
		words,
		(p.music ?? []).map((m) => programBeats(file, m))
	);
}

const errors = (r: ReturnType<typeof resolve>) =>
	r.diagnostics.filter((d) => d.level === 'error').map((d) => `${d.field}: ${d.message}`);

describe('beat anchors in the project', () => {
	it('places clips on bars and beats', () => {
		const r = resolve({
			from: { bar: 2 },
			until: { bar: 4 },
			cues: { third: { bar: 2, beat: 3 }, last: { beat: 17 } }
		});
		expect(errors(r)).toEqual([]);
		const c = r.clips[0];
		expect([c.start, c.end]).toEqual([3, 7]);
		expect(c.cues.third.start).toBeCloseTo(1);
		expect(c.cues.last.start + c.start).toBeCloseTo(8.5);
	});

	it('finds the downbeat after or before a moment, a word or a number', () => {
		const r = resolve({
			from: { downbeat: 'after', at: 1.2 },
			until: { downbeat: 'after', at: { say: 'is here' } },
			cues: {
				drop: { downbeat: 'after', at: 'the drop' },
				back: { downbeat: 'before', at: 'the drop' },
				beat: { beat: 'after', at: 1.1 }
			}
		});
		expect(errors(r)).toEqual([]);
		const c = r.clips[0];
		expect([c.start, c.end]).toEqual([3, 7]);
		expect(c.cues.drop.start + c.start).toBeCloseTo(5);
		expect(c.cues.back.start + c.start).toBeCloseTo(3);
		// Numbers in cues are clip-local, also inside `at`: 3 + 1.1 → the beat at 4.5 s.
		expect(c.cues.beat.start + c.start).toBeCloseTo(4.5);
	});

	it('takes the phrase end for "at" in until, so the downbeat after never cuts it', () => {
		// "hold on" starts before the downbeat at 5 s and ends after it.
		const held = parseTranscriptWords([
			{ text: 'hold', start: 4.6, end: 4.9 },
			{ text: 'on', start: 4.9, end: 5.4 }
		]);
		const p = project({
			from: 0,
			until: { downbeat: 'after', at: 'hold on' },
			cues: {
				enter: { downbeat: 'after', at: 'hold on' },
				late: { downbeat: 'after', at: { say: 'hold on', edge: 'end' } }
			}
		});
		const music = (p.music ?? []).map((m) => programBeats(file, m));
		const r = resolveMotionProject(p, held, music);
		expect(r.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		expect(r.clips[0].end).toBe(7);
		// Cues keep the start edge; an explicit edge still wins.
		expect(r.clips[0].cues.enter.start).toBeCloseTo(5);
		expect(r.clips[0].cues.late.start).toBeCloseTo(7);
		const start = resolveMotionProject(
			project({ from: 0, until: { downbeat: 'after', at: { say: 'hold on', edge: 'start' } } }),
			held,
			music
		);
		expect(start.clips[0].end).toBe(5);
	});

	it('refuses "bar" together with "at" instead of dropping it', () => {
		expect(() => project({ from: { bar: 2, beat: 'after', at: 1 }, until: 9 })).toThrow(
			/An anchor with \\?"bar\\?" cannot also have/
		);
		expect(() => project({ from: { bar: 2, downbeat: 'after', at: 1 }, until: 9 })).toThrow(
			/An anchor with \\?"bar\\?" cannot also have/
		);
	});

	it('offsets anchors by beats or seconds', () => {
		const r = resolve({
			from: { bar: 2, offset: '-1b' },
			until: { say: 'is here', offset: '1b' },
			cues: { half: { bar: 3, offset: '0.5b' }, early: { bar: 3, offset: -0.03 } }
		});
		expect(errors(r)).toEqual([]);
		const c = r.clips[0];
		expect(c.start).toBeCloseTo(2.5);
		// Until edges default to the phrase end: 6.9 s + one beat.
		expect(c.end).toBeCloseTo(7.4);
		expect(c.cues.half.start + c.start).toBeCloseTo(5.25);
		expect(c.cues.early.start + c.start).toBeCloseTo(4.97);
	});

	it('fails with the nearest valid choice instead of guessing', () => {
		expect(errors(resolve({ from: { bar: 9 }, until: 9 }))).toEqual([
			'from: Bar 9 does not exist: music.wav has bars 1–4.'
		]);
		expect(errors(resolve({ from: { beat: 40 }, until: 9 }))[0]).toMatch(/beats 1–17/);
		expect(errors(resolve({ from: { bar: 2, beat: 5 }, until: 9 }))[0]).toMatch(
			/Bar 2 has no beat 5: it has 4 beats/
		);
		expect(errors(resolve({ from: 0, until: { downbeat: 'after', at: 8 } }))[0]).toMatch(
			/No downbeat after 8\.00s/
		);
	});

	it('needs music for beat anchors and leaves projects without music alone', () => {
		const p = MotionProjectShape.parse({
			size: [1080, 1920],
			fps: 30,
			clips: [{ id: 'c', block: 'b.svelte', from: 'and now', until: 'is here' }]
		});
		const plain = resolveMotionProject(p, words);
		expect(plain.diagnostics.filter((d) => d.level === 'error')).toEqual([]);
		// No beat fields at all, so a project without music resolves exactly as before.
		expect(plain.clips[0]).not.toHaveProperty('beats');
		expect(plain.clips[0]).not.toHaveProperty('noBeats');
		const r = resolveMotionProject({ ...p, clips: [{ ...p.clips[0], from: { bar: 1 } }] }, words);
		expect(r.diagnostics[0].message).toMatch(/Beat anchors need music with beats/);
	});

	it('asks which music when several have beats', () => {
		const two = [{ id: 'intro' }, { id: 'bed', from: 20 }];
		expect(errors(resolve({ from: { bar: 1 }, until: 30 }, two))[0]).toMatch(
			/Several music items have beats \(intro, bed\)/
		);
		const r = resolve({ from: { bar: 1, music: 'bed' }, until: { bar: 2, music: 'bed' } }, two);
		expect([r.clips[0].start, r.clips[0].end]).toEqual([21, 23]);
		const clipMusic = resolve({ music: 'bed', from: { bar: 1 }, until: { bar: 2 } }, two);
		expect(clipMusic.clips[0].start).toBe(21);
		expect(errors(resolve({ music: 'nope', from: 0, until: 1 }, two))[0]).toMatch(
			/Unknown music "nope"/
		);
	});

	it('rejects offsets that are neither seconds nor beats', () => {
		expect(() => project({ from: { bar: 1, offset: '1s' }, until: 2 })).toThrow(/offset/);
	});
});

const round30 = (s: number) => Math.round(s * 30) / 30;

describe('music corrections', () => {
	const bar = (music: Partial<MotionMusic>, n: number, beat = 1) =>
		resolve({ from: { bar: n, beat }, until: 20 }, [music]).clips[0]?.start;

	it('shifts beats and places the music in the program', () => {
		expect(bar({ shift: 0.1 }, 2)).toBeCloseTo(round30(3.1));
		expect(bar({ from: 10 }, 2)).toBe(13);
	});

	it('renumbers bars when the downbeat is another beat', () => {
		// The analyzer's beat 3 is the real downbeat: bar 1 starts at 2 s.
		expect(bar({ downbeat: 3 }, 1)).toBe(2);
		expect(bar({ downbeat: 3 }, 0, 2)).toBe(0.5);
		const grid = programBeats(file, { src: 'm', downbeat: 3 }).grid;
		expect(grid.slice(0, 4).map((b) => [b.bar, b.beat])).toEqual([
			[0, 2],
			[0, 3],
			[0, 4],
			[1, 1]
		]);
	});

	it('doubles or halves the tempo', () => {
		const doubled = programBeats(file, { src: 'm', tempo: 'double' }).grid;
		expect(doubled).toHaveLength(33);
		expect(doubled.filter((b) => b.beat === 1).map((b) => b.time)).toEqual([
			1, 2, 3, 4, 5, 6, 7, 8
		]);
		const halved = programBeats(file, { src: 'm', tempo: 'half' }).grid;
		expect(halved.map((b) => b.time)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
		expect(halved.filter((b) => b.beat === 1).map((b) => b.time)).toEqual([1, 5]);
	});

	it('drops beats after the music ends', () => {
		expect(errors(resolve({ from: { bar: 4 }, until: 9 }, [{ until: 6 }]))[0]).toMatch(
			/Bar 4 does not exist/
		);
	});

	it('refuses a downbeat outside the bar', () => {
		expect(() => programBeats(file, { src: 'm', downbeat: 5 })).toThrow(/between 1 and 4/);
	});
});

describe('beat moments and pulse in blocks', () => {
	const r = resolve({
		from: { bar: 1 },
		until: { bar: 4 },
		cues: { extra: { say: 'the drop' } }
	});
	const clip = new Clip(r.clips[0]);

	it('resolves beat moments to clip-local seconds', () => {
		expect(clip.at('bar 2')).toBeCloseTo(2);
		expect(clip.at('bar 2.3')).toBeCloseTo(3);
		expect(clip.at('beat 5')).toBeCloseTo(1.5);
		expect(clip.at('downbeat > 1.2s')).toBeCloseTo(2);
		expect(clip.at('beat < end')).toBeCloseTo(6);
		expect(clip.at('downbeat > extra')).toBeCloseTo(4);
		expect(clip.at('extra.end - 1b')).toBeCloseTo(2.3);
		expect(clip.at('bar 2 + 0.5b')).toBeCloseTo(2.25);
		expect(clip.at('bar 2 - 0.03')).toBeCloseTo(1.97);
		// A beat outside the clip still resolves: the pickup sits before the clip start.
		expect(clip.at('bar 0.4')).toBeCloseTo(-0.5);
	});

	it('names the problem when a beat moment does not exist', () => {
		expect(() => clip.at('bar 12')).toThrow(/^Clip "c": "bar 12": Bar 12 does not exist/);
		expect(() => clip.at('bar 12')).not.toThrow(/Clip "c".*Clip "c"/);
		expect(() => clip.at('extr - 1b')).toThrow(/unknown moment "extr" in "extr - 1b"/);
		expect(() => clip.at('downbeat > extr')).toThrow(/unknown moment "extr" in "downbeat > extr"/);
	});

	it('gives the phase within the beat and the bar, from time alone', () => {
		clip.t = 2.25;
		expect(clip.pulse()).toBeCloseTo(0.5);
		expect(clip.pulse('bar')).toBeCloseTo(0.125);
		clip.t = 2;
		expect(clip.pulse()).toBe(0);
		clip.t = 0.1;
		expect(clip.pulse()).toBeCloseTo(0.2);
		// The frame nearest a beat shows it, even when the beat is a few ms after the frame.
		clip.t = 2 - 0.01;
		expect(clip.pulse()).toBe(0);
		expect(clip.pulse('bar')).toBe(0);
		clip.t = 2 - 0.02;
		expect(clip.pulse()).toBeCloseTo(0.96);
		clip.t = 0;
	});

	it('lists every beat of the music with clip-local times', () => {
		expect(clip.beats).toHaveLength(17);
		expect(clip.beats[1]).toMatchObject({ index: 2, time: 1, local: 0, bar: 1, beat: 1 });
	});

	it('explains beat moments in a clip without music', () => {
		const p = MotionProjectShape.parse({
			size: [1080, 1920],
			fps: 30,
			clips: [{ id: 'c', block: 'b.svelte', from: 0, until: 2 }]
		});
		const plain = new Clip(resolveMotionProject(p, null).clips[0]);
		const message = (() => {
			try {
				plain.at('bar 2');
			} catch (error) {
				return (error as Error).message;
			}
		})();
		expect(message).toMatch(/^Clip "c": "bar 2" needs music beats\. Beat anchors need music/);
		expect(message?.match(/Clip "c"/g)).toHaveLength(1);
		expect(() => plain.at('end - 1b')).toThrow(/^Clip "c": "end - 1b" needs music beats\./);
		expect(() => plain.pulse()).toThrow(/pulse\(\) needs music beats/);
		expect(plain.at('end-0.5')).toBeCloseTo(1.5);
	});
});

describe('cue names with spaces and accents next to beat moments', () => {
	const r = resolve({
		from: { bar: 1 },
		until: { bar: 4 },
		cues: { 'naïve plan': { say: 'the drop' }, 'extra 2': 1 }
	});
	const clip = new Clip(r.clips[0]);

	it('parses both in the same clip', () => {
		expect(errors(r)).toEqual([]);
		expect(clip.at('naïve plan')).toBeCloseTo(2.2);
		expect(clip.at('naïve plan.end - 0.5')).toBeCloseTo(2.3);
		expect(clip.at('naïve plan.end - 1b')).toBeCloseTo(2.3);
		expect(clip.at('downbeat > naïve plan')).toBeCloseTo(4);
		expect(clip.at('extra 2 + 1b')).toBeCloseTo(1.5);
		expect(clip.at('bar 2')).toBeCloseTo(2);
		expect(clip.at('beat 5')).toBeCloseTo(1.5);
		// A bare number reads as seconds, and takes beat offsets too.
		expect(clip.at('2.5')).toBe(2.5);
		expect(clip.at('2.5 + 1b')).toBeCloseTo(3);
	});

	it('keeps "bar 5" and "beat 17" for the music', () => {
		const ok = (name: string) =>
			MotionProjectShape.safeParse({
				size: [100, 100],
				fps: 25,
				clips: [{ id: 'a', block: 'b.svelte', from: 0, until: 1, cues: { [name]: 0.5 } }]
			}).success;
		expect(ok('naïve plan')).toBe(true);
		expect(ok('barista 5')).toBe(true);
		expect(ok('bar 5')).toBe(false);
		expect(ok('beat 17')).toBe(false);
	});
});

describe('bar grid', () => {
	it('shows bars with time, tempo, energy and first beats', () => {
		const text = formatBarGrid(barRows(programBeats(file, { src: 'm' }).grid, file.bars));
		const lines = text.split('\n');
		expect(lines[1]).toMatch(/^\s+0\s+0\.500s\s+120\.0\s+-30\.0dB\s+0\.500\s+pickup$/);
		expect(lines[2]).toMatch(/^\s+1\s+1\.000s\s+120\.0\s+-20\.0dB\s+1\.000 1\.500 2\.000 2\.500$/);
		expect(lines[4]).toMatch(/-12\.0dB/);
	});

	it('makes a doubled tempo stand out', () => {
		const rows = barRows(programBeats(file, { src: 'm', tempo: 'double' }).grid, file.bars, true);
		expect(rows[1]).toMatchObject({ bar: 1, start: 1, bpm: 240 });
		expect(formatBarGrid(rows)).toMatch(/240\.0/);
	});
});

describe('analyzer output', () => {
	it('reads time and position lines', () => {
		const parsed = parseAnalyzerOutput('# beats\n0.26\t4\n0.76\t1\n1.28\t2\n');
		expect(parsed).toEqual({ times: [0.26, 0.76, 1.28], positions: [4, 1, 2] });
	});

	it('reads JSON with a separate downbeat list and counts pickups back', () => {
		const parsed = parseAnalyzerOutput(
			JSON.stringify({
				beats: [0.5, 1, 1.5, 2, 2.5, 3, 3.5],
				downbeats: [1, 3],
				analyzer: { name: 'tracker', version: '2' }
			})
		);
		expect(parsed.positions).toEqual([4, 1, 2, 3, 4, 1, 2]);
		expect(parsed.analyzer).toEqual({ name: 'tracker', version: '2' });
	});

	it('keeps beats without downbeats', () => {
		expect(parseAnalyzerOutput('[0.5, 1, 1.5]').positions).toBeNull();
	});

	it('refuses broken times', () => {
		expect(() => parseAnalyzerOutput('0.5\nabc\n')).toThrow(/beat 2 has no valid time/);
	});
});

/** 44.1 kHz mono: silence, then a 220 Hz tone from `from` to `to` seconds, louder after `loud`. */
function tone(seconds: number, from: number, to: number, loud: number): Float32Array {
	const samples = new Float32Array(Math.round(seconds * 44100));
	for (let i = 0; i < samples.length; i++) {
		const t = i / 44100;
		if (t >= from && t < to)
			samples[i] = (t >= loud ? 0.5 : 0.05) * Math.sin(2 * Math.PI * 220 * t);
	}
	return samples;
}

describe('beats file', () => {
	const samples = tone(5, 0.5, 4.6, 3);
	const beats = parseAnalyzerOutput(
		// 0.1 s is before the sound; 4.62 s is just after it stops, so its whole beat is silent.
		[0.1, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 4.62]
			.map((t, i) => `${t}\t${((i + 2) % 4) + 1}`)
			.join('\n')
	);
	const { file: built, dropped } = buildBeatsFile(
		beats,
		samples,
		{ file: 'tone.wav', sha256: 'a'.repeat(64) },
		{ name: 'test', version: '1' }
	);

	it('leaves out beats placed in silence', () => {
		expect(dropped).toBe(2);
		expect(built.beats.map((b) => b.time)).toEqual([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5]);
	});

	it('numbers bars from the first downbeat and measures energy', () => {
		expect(built.beats.slice(0, 3).map((b) => [b.bar, b.beat])).toEqual([
			[0, 4],
			[1, 1],
			[1, 2]
		]);
		expect(built.beatsPerBar).toBe(4);
		expect(built.tempo).toBe(120);
		expect(built.bars.map((b) => [b.bar, b.start])).toEqual([
			[1, 1],
			[2, 3]
		]);
		// −29 dB for a 0.05 sine, −9 dB for 0.5; only bar 2 has the loud part.
		expect(built.beats[1].energy).toBeCloseTo(-29, 0);
		expect(built.beats[6].energy).toBeCloseTo(-9, 0);
		expect(built.bars[0].energy).toBeCloseTo(-29, 0);
		expect(built.bars[1].energy - built.bars[0].energy).toBeGreaterThan(15);
	});

	it('writes one beat per line in a stable format', () => {
		const text = formatBeatsFile(built);
		expect(text).toContain('\t\t{ "time": 1, "bar": 1, "beat": 1, "energy": ');
		expect(BeatsFileShape.parse(JSON.parse(text))).toEqual(built);
	});
});

describe('visualfries beats', () => {
	async function tempDir() {
		return fs.mkdtemp(path.join(os.tmpdir(), 'vf-beats-test-'));
	}

	it('needs input and output placeholders', () => {
		expect(() => commandBeats('tracker {input}')).toThrow(/\{output\}/);
	});

	it('names the analyzer after the program, without quotes or path', () => {
		expect(commandBeats('"/opt/my tools/tracker" {input} {output}').name).toBe('tracker');
		expect(commandBeats("'C:\\bin\\beat.exe' {input} {output}").name).toBe('beat.exe');
		expect(commandBeats('/usr/bin/beat-tracker --in {input} --out {output}').name).toBe(
			'beat-tracker'
		);
		expect(commandBeats('x {input} {output}', { name: 'mine' }).name).toBe('mine');
	});

	it.skipIf(!hasFfmpeg)('runs any analyzer command and writes the beats file', async () => {
		const dir = await tempDir();
		const music = path.join(dir, 'my music.wav');
		const r = spawnSync('ffmpeg', [
			'-y',
			'-loglevel',
			'error',
			'-f',
			'lavfi',
			'-i',
			'sine=frequency=220:duration=4',
			music
		]);
		expect(r.status).toBe(0);
		const lines = [0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((t, i) => `${t} ${(i % 4) + 1}`).join('\\n');
		const result = await analyzeBeats(music, {
			analyzer: commandBeats(`test -s {input} && printf '${lines}\\n' > {output}`, {
				name: 'printf',
				version: '1'
			})
		});
		expect(result).toMatchObject({ beats: 7, bars: 2, beatsPerBar: 4, tempo: 120, dropped: 0 });
		expect(result.output).toBe(path.join(dir, 'my music.beats.json'));
		const written = BeatsFileShape.parse(JSON.parse(await fs.readFile(result.output, 'utf8')));
		expect(written.source).toMatchObject({ file: 'my music.wav', duration: 4 });
		expect(written.source.sha256).toBe(await fileSha256(music));
		expect(written.analyzer).toMatchObject({ name: 'printf', version: '1' });
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('loads beats with the project and refuses beats of another music file', async () => {
		const dir = await tempDir();
		await fs.writeFile(path.join(dir, 'music.wav'), 'not really audio');
		const sha256 = await fileSha256(path.join(dir, 'music.wav'));
		await fs.writeFile(
			path.join(dir, 'music.beats.json'),
			formatBeatsFile({ ...file, source: { ...file.source, sha256 } })
		);
		const projectFile = path.join(dir, 'video.vf.json');
		const write = (music: Record<string, unknown>) =>
			fs.writeFile(
				projectFile,
				JSON.stringify({
					size: [1080, 1920],
					fps: 30,
					music: [{ src: 'music.wav', beats: 'music.beats.json', ...music }],
					clips: [{ id: 'c', block: 'b.svelte', from: { bar: 1 }, until: { bar: 3 } }]
				})
			);
		await write({ tempo: 'double' });
		const loaded = await loadMotionProject(projectFile);
		expect(loaded.resolved.clips[0]).toMatchObject({ start: 1, end: 3 });
		const grid = describeMusicGrid(loaded);
		expect(grid).toMatch(
			/240\.0 BPM · 4 beats per bar · 33 beats · 8 bars · corrections: tempo double/
		);
		expect(grid).toMatch(/fixture 1\.0\.0/);
		// Rendered clips go stale when the beats file or a correction changes.
		const hash = loaded.musicHash;
		expect(hash).toMatch(/^[0-9a-f]{12}$/);
		expect((await loadMotionProject(projectFile)).musicHash).toBe(hash);
		await write({ tempo: 'double', shift: 0.01 });
		const shifted = (await loadMotionProject(projectFile)).musicHash;
		expect(shifted).not.toBe(hash);
		await fs.writeFile(
			path.join(dir, 'music.beats.json'),
			formatBeatsFile({ ...file, tempo: 121, source: { ...file.source, sha256 } })
		);
		expect((await loadMotionProject(projectFile)).musicHash).not.toBe(shifted);
		await fs.writeFile(path.join(dir, 'music.wav'), 'another track');
		await expect(loadMotionProject(projectFile)).rejects.toThrow(
			/music\.wav changed since music\.beats\.json was made\. Run: visualfries beats music\.wav/
		);
		await fs.rm(dir, { recursive: true, force: true });
	});
});
