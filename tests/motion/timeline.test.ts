import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { isMotionProject, MotionProjectShape } from '$lib/motion/project.js';
import { isProgramProject, parseMotionProject } from '$lib/motion/timeline.js';
import { parseTranscriptWords } from '$lib/motion/transcript.js';
import { resolveMotionProject } from '$lib/motion/resolve.js';

const ROOT = path.resolve(__dirname, '../..');
const SNAPSHOT = path.join(__dirname, 'fixtures/legacy/resolve.snapshot.json');
const SKIP = new Set(['node_modules', 'dist', '.git', '.svelte-kit', '.visualfries']);

function projectFiles(dir = ROOT): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		if (SKIP.has(entry.name)) return [];
		const abs = path.join(dir, entry.name);
		if (entry.isDirectory()) return projectFiles(abs);
		return entry.name.endsWith('.vf.json') ? [path.relative(ROOT, abs)] : [];
	});
}

/** Same computation as the snapshot was captured with on main (0.6.1). */
function resolveLegacy(rel: string) {
	const abs = path.join(ROOT, rel);
	const project = MotionProjectShape.parse(JSON.parse(fs.readFileSync(abs, 'utf8')));
	const t = project.transcript ? path.resolve(path.dirname(abs), project.transcript) : null;
	const words =
		t && fs.existsSync(t) ? parseTranscriptWords(JSON.parse(fs.readFileSync(t, 'utf8'))) : null;
	return resolveMotionProject(project, words);
}

describe('timeline schema: backward compatibility', () => {
	it('parses every project file in the repository', () => {
		const files = projectFiles();
		expect(files.length).toBeGreaterThan(15);
		for (const file of files) {
			const json = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
			expect(() => parseMotionProject(json, file), file).not.toThrow();
			expect(isMotionProject(json), file).toBe(true);
		}
	});

	it('resolves every demo and legacy fixture exactly as main did', () => {
		const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
		const now: Record<string, unknown> = {};
		for (const file of Object.keys(snapshot)) now[file] = resolveLegacy(file);
		// Compared as JSON text: same keys in the same order, same numbers to the last digit.
		expect(JSON.stringify(now)).toBe(JSON.stringify(snapshot));
	});

	it('keeps projects without cuts or shots in inserts mode', () => {
		for (const file of projectFiles()) {
			if (file.includes('fixtures/program')) continue;
			const project = parseMotionProject(
				JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'))
			);
			expect(isProgramProject(project), file).toBe(false);
		}
	});
});

describe('timeline schema: program projects', () => {
	const base = { size: [1080, 1920], fps: 30, footage: { talk: { src: 'talk.mp4' } } };

	it('accepts a cut list without clips', () => {
		const project = parseMotionProject({
			...base,
			cuts: [{ source: 'talk', in: 'hello there', out: { say: 'see you', edge: 'end' } }]
		});
		expect(project.clips).toEqual([]);
		expect(isProgramProject(project)).toBe(true);
		expect(isMotionProject({ ...base, cuts: [] })).toBe(true);
	});

	it('takes music as a list in program mode, beats corrections included', () => {
		const music = [{ id: 'bed', src: 'm.mp3', beats: 'm.beats.json', from: 2, tempo: 'half' }];
		const project = parseMotionProject({ ...base, cuts: [{ source: 'talk' }], music });
		expect(project.music).toEqual(music);
	});

	it('takes every new item kind and clip field', () => {
		const project = parseMotionProject({
			...base,
			footage: {
				talk: { src: 'talk.mp4', transcript: 'talk.json', audio: 'mic.wav' },
				gen: { src: 'gen.mp4', provenance: { provider: 'acme', prompt: 'a cat', seed: 7 } }
			},
			cuts: [
				{ id: 'a', source: 'talk', in: 1.5, out: { frame: 90 } },
				{
					source: 'talk',
					in: 'and then',
					transition: { type: 'push', duration: 0.4, align: 'start', direction: 'left' },
					audio: { split: -0.2, crossfade: 0.02, gain: -3 }
				}
			],
			shots: [
				{
					shot: 'punch',
					from: 'and then',
					until: { frame: 120 },
					morph: 0.2,
					keys: [{ at: { moment: 'mid' }, scale: 1.2 }]
				},
				{ shot: 'shots/Split.ts', from: 5, until: 6, source: { name: 'gen', in: 2 } }
			],
			clips: [
				{
					id: 'c',
					block: 'b.svelte',
					from: 1,
					until: 2,
					slot: 'panel',
					layer: 'behind',
					transition: 'wipe',
					keys: [{ at: 0, x: '10%', y: 20, opacity: 0.5, props: { color: '#f00' }, mix: 'oklch' }]
				}
			],
			music: [{ src: 'm.mp3', from: 0 }],
			sfx: [{ at: 'and then', sound: 'whoosh', gain: -2 }],
			duration: 12
		});
		expect(project.footage?.gen.provenance).toEqual({ provider: 'acme', prompt: 'a cat', seed: 7 });
		expect(project.clips[0]).toMatchObject({ slot: 'panel', layer: 'behind', transition: 'wipe' });
	});
});

describe('timeline schema: readable errors', () => {
	const base = { size: [100, 100], fps: 30 };
	const error = (value: unknown) => {
		try {
			parseMotionProject(value, 'p.vf.json');
		} catch (e) {
			return (e as Error).message;
		}
		throw new Error('expected a parse error');
	};

	it('names the file and one problem per line', () => {
		expect(error(base)).toBe(
			'p.vf.json is not a valid motion project:\n  clips: Add at least one clip, or "cuts" or "shots" for a whole program.'
		);
	});

	it('reports the alternative that got furthest', () => {
		expect(error({ ...base, cuts: [{ source: 'talk', in: { sya: 'x' } }] })).toMatch(
			/^ {2}cuts\[0\]\.in\.say: .*expected string/m
		);
		expect(error({ ...base, clips: [{ id: 'a', block: 'b', from: true, until: 1 }] })).toMatch(
			/clips\[0\]\.from: expected number, string or object\./
		);
	});

	it('points at nested fields', () => {
		const message = error({
			...base,
			cuts: [
				{
					source: 'talk',
					in: -1,
					transition: { type: 'push', align: 'middle' },
					audio: { crossfade: 2 }
				}
			],
			clips: [{ id: 'a', block: 'b', from: 0, until: 1, keys: [{ at: 0, x: '12px' }] }]
		});
		expect(message).toMatch(/cuts\[0\]\.in: Too small/);
		expect(message).toMatch(/cuts\[0\]\.transition\.align: .*"center"\|"start"\|"end"/);
		expect(message).toMatch(/cuts\[0\]\.audio\.crossfade: Too big/);
		expect(message).toMatch(/clips\[0\]\.keys\[0\]\.x: length: number or "12%"/);
	});

	it('explains a bad footage name', () => {
		expect(
			error({ ...base, footage: { 'my talk': { src: 'a.mp4' } }, cuts: [{ source: 'talk' }] })
		).toMatch(/footage\.my talk: footage name: letters, digits, dash, underscore/);
	});
});
