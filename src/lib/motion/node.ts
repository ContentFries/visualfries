import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BrandShape, type MotionFont, type MotionMusic, type MotionProject } from './project.js';
import { NEUTRAL_BRAND, resolveBrand, type ResolvedBrand } from './brand.js';
import { BUILTIN_STYLES, NEUTRAL_STYLE, resolveStyle, type ResolvedStyle } from './style.js';
import { isProgramProject, parseMotionProject } from './timeline.js';
import { parseTranscriptWords, type MotionWord } from './transcript.js';
import { resolveCutList, type CutList, type ProgramInputs, type SourceInfo } from './cutlist.js';
import { resolveProgram, type ProgramHashes, type ResolvedProgram } from './program.js';
import { resolveMotionProject, type ResolvedClip, type ResolvedProject } from './resolve.js';
import { resolveMoment } from './moment.js';
import { footageFrameRange } from './footage.js';
import {
	BeatsFileShape,
	barRows,
	formatBarGrid,
	programBeats,
	type BarRow,
	type BeatsFile,
	type MusicBeats
} from './beat-grid.js';
import { fileSha256 } from './beats.js';
import { footageMap, footageRanges, type FootageMap, type FrameRange } from './footage-map.js';
import type { FootageFrames, FootageRange, SubjectBox } from './resolve.js';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROMIUM_FLAGS = ['--enable-blink-features=CanvasDrawElement', '--font-render-hinting=none'];
/**
 * Pages load the bundle, fonts, styles and footage frames from this one origin (served by
 * Playwright from disk): HTML-in-Canvas leaves cross-origin images, such as file:// frames,
 * out of the captured frame.
 */
const ORIGIN = 'http://visualfries.local';
const originUrl = (abs: string) => `${ORIGIN}/@fs${pathToFileURL(abs).pathname}`;

export type LoadedMotionProject = {
	file: string;
	dir: string;
	project: MotionProject;
	/** Program-time words the clips resolve against (the program transcript in program mode). */
	words: MotionWord[] | null;
	/** Short hash of the transcript's words and times; changes with every re-take. */
	transcriptHash: string | null;
	/** The project's music items with their beats (corrected and placed in the program). */
	music: LoadedMusic[];
	/**
	 * Short hash of every beats file and its corrections (`from`, `until`, `shift`, `downbeat`,
	 * `tempo`); null without music beats. Beat-anchored clips move when it changes.
	 */
	musicHash: string | null;
	brand: LoadedBrand;
	style: LoadedStyle;
	resolved: ResolvedProject;
	/**
	 * What the program resolves from: the project-level transcript, transcripts of single footage
	 * sources (`footage.<name>.transcript`, source time) and, in program mode only, the probed
	 * footage files whose lengths the cut list needs.
	 */
	inputs: ProgramInputs;
	/**
	 * Short hashes: project file, transcripts by source, footage picture files (video and matte,
	 * size and time; the sound is mixed fresh on every render).
	 */
	hashes: {
		project: string;
		transcript: string | null;
		transcripts: Record<string, string>;
		sources: Record<string, string>;
	};
	cutList: CutList;
};

export type LoadedMusic = {
	music: MotionMusic;
	/** Absolute path of the beats file; null when the item has none. */
	beatsFile: string | null;
	analysis: BeatsFile | null;
	/** SHA-256 of the beats file as read; null when the item has none. */
	beatsHash: string | null;
	beats: MusicBeats | null;
	/** Bars in program seconds, for the `check` grid. */
	bars: BarRow[];
};

/**
 * Reads each music item's beats file. A beats file made from another version of the music
 * (its SHA-256 differs) is an error, like a word cue after a re-take; nothing is re-analysed.
 */
async function loadMusic(project: MotionProject, dir: string): Promise<LoadedMusic[]> {
	const loaded: LoadedMusic[] = [];
	for (const music of project.music ?? []) {
		if (!music.beats) {
			loaded.push({
				music,
				beatsFile: null,
				analysis: null,
				beatsHash: null,
				beats: null,
				bars: []
			});
			continue;
		}
		const beatsFile = path.resolve(dir, music.beats);
		const src = path.resolve(dir, music.src);
		let analysis: BeatsFile;
		let beatsHash: string;
		try {
			const text = await fs.readFile(beatsFile, 'utf8');
			beatsHash = createHash('sha256').update(text).digest('hex');
			analysis = BeatsFileShape.parse(JSON.parse(text));
		} catch (error) {
			throw new Error(
				`Music "${music.id ?? music.src}": cannot read ${music.beats} (${(error as Error).message.split('\n')[0]}). Make it with: visualfries beats ${music.src} --output ${music.beats}`
			);
		}
		if (!existsSync(src)) throw new Error(`Music "${music.id ?? music.src}": ${src} not found.`);
		if ((await fileSha256(src)) !== analysis.source.sha256)
			throw new Error(
				`${music.src} changed since ${music.beats} was made. Run: visualfries beats ${music.src} --output ${music.beats}`
			);
		let beats: MusicBeats;
		try {
			beats = programBeats(analysis, music);
		} catch (error) {
			throw new Error(`Music "${music.id ?? music.src}": ${(error as Error).message}`);
		}
		const corrected = music.tempo !== undefined || music.downbeat !== undefined;
		loaded.push({
			music,
			beatsFile,
			analysis,
			beatsHash,
			beats,
			bars: barRows(beats.grid, analysis.bars, corrected)
		});
	}
	const ids = loaded.map((m) => m.music.id).filter(Boolean);
	const twice = ids.find((id, i) => ids.indexOf(id) !== i);
	if (twice) throw new Error(`Two music items have the id "${twice}".`);
	return loaded;
}

export type LoadedBrand = {
	resolved: ResolvedBrand;
	/** Short hash of the brand's values and the contents of its font and logo files; null without a brand. */
	hash: string | null;
	/** The brand file, null for an inline brand or none. */
	file: string | null;
	/** Font faces to load, with absolute paths. */
	fonts: MotionFont[];
	/** Absolute paths of every file the brand references (fonts, logos), served to the page. */
	assets: string[];
};

export type LoadedStyle = {
	resolved: ResolvedStyle;
	/** Short hash of the layered style; null without a style. */
	hash: string | null;
};

const shortHash = (data: string | Buffer) =>
	createHash('sha1').update(data).digest('hex').slice(0, 12);

/** JSON with sorted keys, so equal values always hash the same. */
function canonical(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value && typeof value === 'object')
		return `{${Object.keys(value)
			.sort()
			.filter((k) => (value as Record<string, unknown>)[k] !== undefined)
			.map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
			.join(',')}}`;
	return JSON.stringify(value);
}

const issues = (error: { issues: { path: PropertyKey[]; message: string }[] }) =>
	error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');

/** Read and resolve the project's brand: a file next to the project or an inline object. */
export async function loadBrand(project: MotionProject, dir: string): Promise<LoadedBrand> {
	if (project.brand === undefined)
		return { resolved: NEUTRAL_BRAND, hash: null, file: null, fonts: [], assets: [] };
	let file: string | null = null;
	let data: unknown = project.brand;
	if (typeof project.brand === 'string') {
		file = path.resolve(dir, project.brand);
		if (!existsSync(file)) throw new Error(`Brand file not found: ${file}`);
		try {
			data = JSON.parse(await fs.readFile(file, 'utf8'));
		} catch (error) {
			throw new Error(`Brand file ${file}: ${(error as Error).message}`);
		}
	}
	const parsed = BrandShape.safeParse(data);
	if (!parsed.success) throw new Error(`Brand ${file ?? '(inline)'}: ${issues(parsed.error)}`);
	const brand = parsed.data;
	const base = file ? path.dirname(file) : dir;
	const assets: string[] = [];
	const absolute = (ref: string) => {
		const abs = path.resolve(base, ref);
		if (!existsSync(abs)) throw new Error(`Brand ${file ?? '(inline)'}: file not found: ${abs}`);
		if (!assets.includes(abs)) assets.push(abs);
		return abs;
	};
	const fonts = (['heading', 'body', 'mono'] as const).flatMap((role) => {
		const font = brand.fonts[role];
		return font ? [{ ...font, src: absolute(font.src) }] : [];
	});
	const resolved = resolveBrand(brand, (ref) => originUrl(absolute(ref)));
	// The hash covers what decides pixels: the values and the files' contents, wherever they are.
	const contents: Record<string, string> = {};
	for (const abs of assets) contents[path.relative(base, abs)] = shortHash(await fs.readFile(abs));
	const hash = shortHash(canonical({ brand, files: contents }));
	return { resolved, hash, file, fonts, assets };
}

/** Resolve the project's style through its `extends` chain (built-ins, style files, inline). */
export function loadStyle(project: MotionProject, dir: string): LoadedStyle {
	if (project.style === undefined) return { resolved: NEUTRAL_STYLE, hash: null };
	const resolved = resolveStyle(project.style, (ref, from) => {
		const abs = path.resolve(from ? path.dirname(from) : dir, ref);
		if (!existsSync(abs))
			throw new Error(
				`Unknown style "${ref}": not a built-in style (${Object.keys(BUILTIN_STYLES).join(', ')}) and no file at ${abs}.`
			);
		try {
			return { id: abs, data: JSON.parse(readFileSync(abs, 'utf8')) };
		} catch (error) {
			throw new Error(`Style file ${abs}: ${(error as Error).message}`);
		}
	});
	const { layers: _layers, neutral: _neutral, ...values } = resolved;
	return { resolved, hash: shortHash(canonical(values)) };
}

const wordsHash = (words: MotionWord[]) =>
	shortHash(JSON.stringify(words.map((w) => [w.raw, w.start, w.end])));

/** Seconds of the first sound track of a file; null without one. */
async function probeSound(file: string): Promise<number | null> {
	const info = await ffprobeJson(file, [
		'-select_streams',
		'a:0',
		'-show_entries',
		'stream=index,duration:format=duration'
	]);
	if (!info.streams?.length) return null;
	const seconds = Number(info.streams[0].duration ?? info.format?.duration);
	return Number.isFinite(seconds) ? seconds : null;
}

/**
 * Size, frame count and sound of a footage file, with frames counted at the project rate. With
 * `audio` (the footage's separate sound file) the sound and its length come from that file.
 */
async function probeSource(file: string, fps: number, audio?: string): Promise<SourceInfo> {
	const info = await probeVideo(file);
	const sound = await probeSound(audio ?? file).catch(() => null);
	// Counted like prepareFootage counts them, so cut lengths and extracted frames agree.
	const direct = info.constant && Math.abs(info.fps - fps) < 0.01;
	return {
		frames: direct ? info.frames : Math.round(info.duration * fps),
		duration: info.duration,
		width: info.width,
		height: info.height,
		fps: info.fps,
		audio: sound !== null,
		...(sound !== null ? { audioDuration: sound } : {})
	};
}

/** `transcript` overrides the project's transcript (e.g. a re-recorded voiceover); relative to cwd. */
export async function loadMotionProject(
	file: string,
	opts: { transcript?: string } = {}
): Promise<LoadedMotionProject> {
	const abs = path.resolve(file);
	const dir = path.dirname(abs);
	const project = parseMotionProject(
		JSON.parse(await fs.readFile(abs, 'utf8')),
		path.basename(abs)
	);
	if (opts.transcript && isProgramProject(project))
		throw new Error(
			`--transcript cannot replace the words of ${path.basename(abs)}: it has "cuts" or "shots", so its words come from the footage transcripts ("footage.<name>.transcript", source time) through the cut list. Point those at the new transcript instead.`
		);
	const transcriptPath = opts.transcript
		? path.resolve(opts.transcript)
		: project.transcript
			? path.resolve(dir, project.transcript)
			: null;
	const words = transcriptPath
		? parseTranscriptWords(JSON.parse(await fs.readFile(transcriptPath, 'utf8')))
		: null;
	const music = await loadMusic(project, dir);
	const musicBeats = music.map((m) => m.beats).filter((b): b is MusicBeats => !!b);
	const timing = music
		.filter((m) => m.beatsHash)
		.map(({ music: m, beatsHash }) => [
			beatsHash,
			m.id ?? null,
			m.src,
			m.from ?? null,
			m.until ?? null,
			m.shift ?? null,
			m.downbeat ?? null,
			m.tempo ?? null
		]);
	const musicHash = timing.length
		? createHash('sha256').update(JSON.stringify(timing)).digest('hex').slice(0, 12)
		: null;
	const brand = await loadBrand(project, dir);
	const style = loadStyle(project, dir);
	const transcripts: Record<string, MotionWord[]> = {};
	const sources: Record<string, SourceInfo> = {};
	const hashes: LoadedMotionProject['hashes'] = {
		project: shortHash(await fs.readFile(abs)),
		transcript: words ? wordsHash(words) : null,
		transcripts: {},
		sources: {}
	};
	for (const [name, footage] of Object.entries(project.footage ?? {})) {
		if (footage.transcript) {
			const file = path.resolve(dir, footage.transcript);
			transcripts[name] = parseTranscriptWords(JSON.parse(await fs.readFile(file, 'utf8')));
			hashes.transcripts[name] = wordsHash(transcripts[name]);
		}
		const files = [footage.src, footage.matte]
			.filter((f): f is string => !!f)
			.map((f) => path.resolve(dir, f));
		const stats = await Promise.all(files.map((f) => fs.stat(f).catch(() => null)));
		hashes.sources[name] = shortHash(
			JSON.stringify(stats.map((st, i) => [path.relative(dir, files[i]), st?.size, st?.mtimeMs]))
		);
		if (isProgramProject(project) && stats[0]) {
			const audio = typeof footage.audio === 'string' ? path.resolve(dir, footage.audio) : null;
			const info = await probeSource(files[0], project.fps, audio ?? undefined);
			if (footage.audio === false) {
				info.audio = false;
				delete info.audioDuration;
			} else if (audio) info.audio = true;
			sources[name] = info;
		}
	}
	const look = { brand: brand.resolved, style: style.resolved };
	const inputs: ProgramInputs = { words, transcripts, sources, music: musicBeats, look };
	const common = { file: abs, dir, project, music, musicHash, brand, style, inputs, hashes };
	const cutList = resolveCutList(project, inputs);
	if (cutList.mode === 'inserts') {
		return {
			...common,
			words,
			transcriptHash: hashes.transcript,
			resolved: resolveMotionProject(project, words, musicBeats, look),
			cutList
		};
	}
	// Program mode: clips resolve against the program transcript, and a broken cut list is an
	// error of the project (program time is undefined without it).
	const resolved = resolveMotionProject(project, cutList.words, musicBeats, look);
	resolved.diagnostics.unshift(
		...cutList.diagnostics
			.filter((d) => d.level !== 'info')
			.map((d) => ({ level: d.level as 'error' | 'warning', field: d.field, message: d.message }))
	);
	return {
		...common,
		words: cutList.words,
		transcriptHash: cutList.words ? wordsHash(cutList.words) : null,
		resolved,
		cutList
	};
}

/**
 * The bar grid of each music item with beats, as text for `check`: one line per bar with its
 * program time, tempo, energy and first beats. A BPM column at twice (or half) the tempo you
 * hear means the analyzer chose the wrong level: set `"tempo": "half"` (or `"double"`).
 */
export function describeMusicGrid(loaded: LoadedMotionProject): string {
	const parts: string[] = [];
	for (const m of loaded.music) {
		if (!m.analysis || !m.beats) continue;
		const { music, analysis } = m;
		const factor = music.tempo === 'double' ? 2 : music.tempo === 'half' ? 0.5 : 1;
		const by = [analysis.analyzer.name, analysis.analyzer.version, analysis.analyzer.model]
			.filter(Boolean)
			.join(' ');
		const corrections = [
			music.tempo && `tempo ${music.tempo}`,
			music.downbeat !== undefined && `downbeat ${music.downbeat}`,
			music.shift !== undefined && `shift ${music.shift}s`
		].filter(Boolean);
		const bars = m.bars.filter((b) => b.bar > 0).length;
		parts.push(
			[
				`music ${music.id ? `"${music.id}" ` : ''}${music.src} · ${music.beats} (${by}) · from ${music.from ?? 0}s${music.until !== undefined ? ` until ${music.until}s` : ''}`,
				`  ${(analysis.tempo * factor).toFixed(1)} BPM · ${analysis.beatsPerBar ?? '?'} beats per bar · ${m.beats.grid.length} beats · ${bars} bars${corrections.length ? ` · corrections: ${corrections.join(', ')}` : ''}`,
				m.bars.length
					? formatBarGrid(m.bars)
					: '  no downbeats: bar anchors are not available, beat anchors are'
			].join('\n')
		);
	}
	return parts.join('\n\n');
}

/** Short content hashes of the files a program's pixels depend on besides footage. */
async function assetHashes(loaded: LoadedMotionProject): Promise<Record<string, string>> {
	const { project, dir } = loaded;
	const custom = (name: string, ext: RegExp) => (ext.test(name) ? [name] : []);
	const names = new Set([
		...project.clips.map((c) => c.block),
		...(project.shots ?? []).flatMap((s) => custom(s.shot, /\.(ts|js)$/)),
		...[...(project.cuts ?? []), ...(project.shots ?? []), ...project.clips].flatMap((item) =>
			item.transition
				? custom(
						typeof item.transition === 'string' ? item.transition : item.transition.type,
						/\.svelte$/
					)
				: []
		),
		...(project.fonts ?? []).map((f) => f.src),
		...(project.css ?? [])
	]);
	const out: Record<string, string> = {};
	for (const name of [...names].sort()) {
		const file = name.startsWith(BUILTIN_PREFIX) ? blockFile(dir, name) : path.resolve(dir, name);
		const content = await fs.readFile(file).catch(() => null);
		if (content) out[name] = shortHash(content);
	}
	return out;
}

/**
 * The resolved program for one format (see `resolveProgram`), with the hashes of the files
 * behind it. `write` also saves it as `.visualfries/program/<format>.json` next to the project.
 */
export async function motionProgram(
	loaded: LoadedMotionProject,
	opts: { format?: string; write?: boolean } = {}
): Promise<{ program: ResolvedProgram; file: string | null }> {
	const hashes: ProgramHashes = {
		...loaded.hashes,
		assets: await assetHashes(loaded),
		music: loaded.musicHash,
		brand: loaded.brand.hash,
		style: loaded.style.hash
	};
	const program = resolveProgram(loaded.project, { ...loaded.inputs, hashes }, opts);
	if (!opts.write) return { program, file: null };
	const file = path.join(loaded.dir, '.visualfries', 'program', `${program.format.name}.json`);
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.writeFile(file, JSON.stringify(program, null, 2) + '\n');
	return { program, file };
}

/** Throws when a requested clip id does not exist in the project. */
export function assertKnownClips(loaded: LoadedMotionProject, clipIds?: string[]) {
	const known = loaded.project.clips.map((c) => c.id);
	const unknown = (clipIds ?? []).filter((id) => !known.includes(id));
	if (unknown.length) {
		throw new Error(
			`Unknown clip ${unknown.map((id) => `"${id}"`).join(', ')}. Clips: ${known.join(', ')}`
		);
	}
}

/** Throws on errors of the given clips (all clips when omitted), including clips that failed to resolve. */
export function assertNoErrors(loaded: LoadedMotionProject, clipIds?: string[]) {
	const errors = loaded.resolved.diagnostics.filter(
		(d) => d.level === 'error' && (!clipIds || !d.clip || clipIds.includes(d.clip))
	);
	const known = new Set([...loaded.project.clips.map((c) => c.id)]);
	for (const id of clipIds ?? []) {
		if (!known.has(id))
			errors.push({
				level: 'error',
				clip: id,
				field: 'id',
				message: `Unknown clip. Clips: ${[...known].join(', ')}`
			});
	}
	if (errors.length) {
		throw new Error(
			'Project has errors:\n' +
				errors.map((e) => `  ${e.clip ?? '-'} ${e.field}: ${e.message}`).join('\n')
		);
	}
}

// ---------------------------------------------------------------- bundling

/**
 * What the page may read: whole `roots` (the bundle and extracted footage) and single `files`
 * (declared fonts and assets the project CSS points to). Nothing else in the project is served.
 */
export type BundleResult = {
	dir: string;
	html: string;
	roots: string[];
	files: string[];
	/** Extracted footage and, in program mode, the map from program to source frames. */
	footage: { frames: Record<string, FootageFrames>; map: FootageMap | null };
	/** The project's brand; the program stage sets its tokens on the whole stage. */
	brand: ResolvedBrand;
};

const BUILTIN_PREFIX = '@visualfries/';
/** Blocks that ship with VisualFries; a clip names them as `"block": "@visualfries/captions"`. */
const BUILTIN_BLOCKS: Record<string, string> = {
	captions: 'Captions.svelte',
	'speaker-depth': 'SpeakerDepth.svelte'
};

function blockFile(dir: string, block: string): string {
	if (!block.startsWith(BUILTIN_PREFIX)) return path.resolve(dir, block);
	const file = BUILTIN_BLOCKS[block.slice(BUILTIN_PREFIX.length)];
	return file ? path.join(HERE, 'blocks', file) : path.join(HERE, 'blocks', '__missing__');
}

/** Compile the project's blocks together with the stage runtime into one page. */
export async function bundleMotionProject(
	loaded: LoadedMotionProject,
	clips: ResolvedClip[]
): Promise<BundleResult> {
	const esbuild = await import('esbuild');
	const { compile, compileModule } = await import('svelte/compiler');
	const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-motion-'));
	// The package ships .js; tests bundle straight from the TypeScript source.
	const own = (name: string) =>
		existsSync(path.join(HERE, `${name}.js`))
			? path.join(HERE, `${name}.js`)
			: path.join(HERE, `${name}.ts`);
	const stageModule = own('stage');
	const motionIndex = own('index');
	// Blocks may import anything VisualFries depends on (svelte, gsap) without their own node_modules.
	const packageRoot = path.resolve(HERE, '..', '..');
	const nodePaths = [
		path.join(packageRoot, 'node_modules'),
		path.resolve(path.dirname(require.resolve('svelte/package.json')), '..'),
		path.resolve(path.dirname(require.resolve('gsap/package.json')), '..')
	];

	const blocks = [...new Set(clips.map((c) => c.block))];
	for (const block of blocks) {
		if (!existsSync(blockFile(loaded.dir, block)))
			throw new Error(
				block.startsWith(BUILTIN_PREFIX)
					? `Unknown built-in block "${block}". Built-in blocks: ${Object.keys(BUILTIN_BLOCKS)
							.map((b) => BUILTIN_PREFIX + b)
							.join(', ')}.`
					: `Block file not found: ${block}`
			);
	}
	const entry = [
		`import { createMotionStage } from ${JSON.stringify(stageModule)};`,
		...blocks.map((b, i) => `import B${i} from ${JSON.stringify(blockFile(loaded.dir, b))};`),
		`window.__vfMotionStage = createMotionStage({ blocks: { ${blocks
			.map((b, i) => `${JSON.stringify(b)}: B${i}`)
			.join(
				', '
			)} }, fonts: window.__vfFonts, css: window.__vfCss, invalidate: window.__vfInvalidate });`
	].join('\n');

	await esbuild.build({
		stdin: { contents: entry, resolveDir: loaded.dir, sourcefile: 'motion-entry.js', loader: 'js' },
		bundle: true,
		format: 'iife',
		outfile: path.join(outDir, 'bundle.js'),
		nodePaths,
		conditions: ['svelte', 'browser'],
		mainFields: ['svelte', 'browser', 'module', 'main'],
		logLevel: 'silent',
		loader: { '.png': 'dataurl', '.jpg': 'dataurl', '.svg': 'text' },
		plugins: [
			{
				name: 'visualfries-motion',
				setup(build) {
					build.onResolve({ filter: /^visualfries\/motion$/ }, () => ({ path: motionIndex }));
					build.onLoad({ filter: /\.svelte$/ }, async (args) => {
						const source = await fs.readFile(args.path, 'utf8');
						const out = compile(source, {
							filename: args.path,
							generate: 'client',
							css: 'injected',
							dev: false
						});
						return { contents: out.js.code, loader: 'js', resolveDir: path.dirname(args.path) };
					});
					build.onLoad({ filter: /\.svelte\.(js|ts)$/ }, async (args) => {
						let source = await fs.readFile(args.path, 'utf8');
						if (args.path.endsWith('.ts'))
							source = (await esbuild.transform(source, { loader: 'ts' })).code;
						const out = compileModule(source, {
							filename: args.path,
							generate: 'client',
							dev: false
						});
						return { contents: out.js.code, loader: 'js', resolveDir: path.dirname(args.path) };
					});
				}
			}
		]
	});

	const roots = [outDir];
	const files: string[] = [];
	// Project fonts, then the brand's (already absolute); the same face twice is loaded once.
	const faces = [
		...(loaded.project.fonts ?? []).map((f) => ({ ...f, src: path.resolve(loaded.dir, f.src) })),
		...loaded.brand.fonts
	].filter(
		(f, i, all) =>
			all.findIndex(
				(g) =>
					g.family === f.family && g.src === f.src && g.weight === f.weight && g.style === f.style
			) === i
	);
	const fonts = faces.map((f) => {
		files.push(f.src);
		return { family: f.family, url: originUrl(f.src), weight: f.weight, style: f.style };
	});
	files.push(...loaded.brand.assets);
	let css = '';
	for (const file of loaded.project.css ?? []) {
		const abs = path.resolve(loaded.dir, file);
		css += rebaseCssUrls(await fs.readFile(abs, 'utf8'), path.dirname(abs), files) + '\n';
	}
	const footage = await extractFootage(loaded, clips);
	roots.push(...footage.roots);
	const cssBundle = path.join(outDir, 'bundle.css');
	const cssLink = existsSync(cssBundle) ? '<link rel="stylesheet" href="bundle.css">' : '';
	const html = path.join(outDir, 'index.html');
	await fs.writeFile(
		html,
		`<!doctype html><meta charset="utf-8">${cssLink}<script>window.__vfFonts=${JSON.stringify(fonts)};window.__vfCss=${JSON.stringify(
			css
		)};window.__vfInvalidate=new URLSearchParams(location.search).get('invalidate')||undefined;</script><body><script src="bundle.js"></script></body>`
	);
	return {
		dir: outDir,
		html,
		roots,
		files,
		footage: { frames: footage.frames, map: footage.map },
		brand: loaded.brand.resolved
	};
}

/** Project CSS is inlined into a page elsewhere; make its relative url(...) absolute. */
function rebaseCssUrls(css: string, dir: string, files: string[]): string {
	return css.replace(/url\((\s*['"]?)([^'")]+)(['"]?\s*)\)/g, (all, open, ref, close) => {
		if (/^(data:|https?:|#)/.test(ref)) return all;
		// Keep `#fragment` and `?query` (SVG filters and masks point into a file).
		const cut = ref.search(/[?#]/);
		const file = cut === -1 ? ref : ref.slice(0, cut);
		const suffix = cut === -1 ? '' : ref.slice(cut);
		const abs = file.startsWith('file:') ? fileURLToPath(file) : path.resolve(dir, file);
		files.push(abs);
		return `url(${open}${originUrl(abs)}${suffix}${close})`;
	});
}

// ---------------------------------------------------------------- browser

export function findChromium(): string | undefined {
	// Same order as `visualfries doctor`; without a match Playwright uses its own build.
	const candidates = [
		process.env.VISUALFRIES_CHROMIUM_PATH,
		process.env.VISUALFRIES_CHROMIUM, // earlier name, kept for existing setups
		process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser',
		'/usr/bin/google-chrome',
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
	];
	return candidates.find((c) => c && existsSync(c));
}

type RouteLike = {
	request(): { url(): string };
	fulfill(response: {
		status: number;
		body?: Buffer | string;
		contentType?: string;
	}): Promise<void>;
};
type PageLike = {
	goto(url: string): Promise<unknown>;
	route(url: string, handler: (route: RouteLike) => unknown): Promise<void>;
	evaluate<R, A>(fn: (arg: A) => R | Promise<R>, arg: A): Promise<R>;
	locator(sel: string): {
		screenshot(opts: { omitBackground?: boolean; type?: 'png' }): Promise<Buffer>;
	};
	on(event: 'pageerror' | 'console' | 'crash', fn: (e: any) => void): void;
	close(): Promise<void>;
};
export type BrowserLike = { newPage(opts: object): Promise<PageLike>; close(): Promise<void> };

export async function launch(): Promise<BrowserLike> {
	let chromium: { launch(opts: object): Promise<unknown> };
	try {
		({ chromium } = await import('playwright'));
	} catch {
		throw new Error(
			'playwright is required for rendering. Install it with `npm install playwright` (it is an optional peer dependency).'
		);
	}
	const executablePath = findChromium();
	return chromium.launch({
		executablePath,
		args: CHROMIUM_FLAGS
	}) as unknown as Promise<BrowserLike>;
}

export type MotionPage = {
	mode: 'html-in-canvas' | 'dom';
	capture(frame: number): Promise<Buffer>;
	check(frames: number[]): Promise<{
		errors: { frame: number; message: string }[];
		warnings: { frame: number; message: string }[];
	}>;
	close(): Promise<void>;
};

/**
 * Longest a page may take to load a clip or render one frame. A frame normally takes well under a
 * second; past this the page is stuck (a block that never returns, a renderer that stopped).
 */
const PAGE_TIMEOUT_MS = 60_000;

/** The page's own message, without Playwright's prefix and the bundle stack trace. */
function pageMessage(error: unknown): string {
	return (error as Error).message.replace(/^page\.evaluate: (Error: )?/, '').split('\n    at ')[0];
}

/** One page with one clip loaded (see `openStagePage`). Exported for tests. */
export async function openClip(
	browser: BrowserLike,
	bundle: Pick<BundleResult, 'html' | 'roots' | 'files'>,
	clip: ResolvedClip,
	opts: { invalidate?: string; timeout?: number } = {}
): Promise<MotionPage> {
	return openStagePage(
		browser,
		bundle,
		{ name: `Clip "${clip.id}"`, size: clip.size, alpha: clip.alpha, load: 'load', data: clip },
		opts
	);
}

/** What a page loads: one clip (`load`) or a segment of the program (`loadSegment`). */
export type StageTarget = {
	/** How errors name it: `Clip "intro"`, `Segment "seg2"`. */
	name: string;
	size: [number, number];
	alpha: boolean;
	load: 'load' | 'loadSegment';
	data: unknown;
};

/**
 * One page with a clip or a segment loaded. Every call fails as soon as the page crashes or
 * stops answering: Playwright leaves a call to a crashed page pending forever, so without this a
 * renderer crash would hang `render` instead of failing it.
 */
export async function openStagePage(
	browser: BrowserLike,
	bundle: Pick<BundleResult, 'html' | 'roots' | 'files'>,
	target: StageTarget,
	opts: { invalidate?: string; timeout?: number } = {}
): Promise<MotionPage> {
	const { name } = target;
	const page = await browser.newPage({
		viewport: { width: target.size[0], height: target.size[1] },
		deviceScaleFactor: 1
	});
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
	let crashed = false;
	let onCrash: (() => void) | null = null;
	page.on('crash', () => {
		crashed = true;
		onCrash?.();
	});
	const timeout = opts.timeout ?? PAGE_TIMEOUT_MS;
	/** `prefix: message`, unless `settle` already named the clip in it. */
	const named = (prefix: string, error: unknown) => {
		const message = pageMessage(error);
		return message.startsWith(name) ? message : `${prefix}: ${message}`;
	};
	/** `work`, or an error as soon as the page crashes or `ms` pass. One call at a time. */
	async function settle<T>(what: string, work: Promise<T>, ms = timeout): Promise<T> {
		let timer: ReturnType<typeof setTimeout> | undefined;
		const failure = new Promise<never>((_, reject) => {
			const crash = () =>
				reject(
					new Error(
						`${name}: the browser page crashed during ${what} (Chromium's renderer process died).`
					)
				);
			if (crashed) return crash();
			onCrash = crash;
			timer = setTimeout(
				() =>
					reject(
						new Error(
							`${name}: ${what} did not finish within ${ms / 1000} s; the page stopped responding (a useFrame or useReady promise that never settles, or an endless loop).`
						)
					),
				ms
			);
		});
		work.catch(() => {}); // still pending when the page crashed; it may reject after the race
		try {
			return await Promise.race([work, failure]);
		} finally {
			clearTimeout(timer);
			onCrash = null;
		}
	}
	await page.route(`${ORIGIN}/**`, (route) => serveAllowed(route, bundle, errors));
	await settle(
		'loading',
		page.goto(originUrl(bundle.html) + (opts.invalidate ? `?invalidate=${opts.invalidate}` : ''))
	);
	let info: { mode: 'html-in-canvas' | 'dom' };
	try {
		info = await settle(
			'loading',
			page.evaluate(({ load, data }) => (window as any).__vfMotionStage[load](data), {
				load: target.load,
				data: target.data
			})
		);
	} catch (error) {
		throw new Error([named(`${name} failed to load`, error), ...errors].join('\n'));
	}
	return {
		mode: info.mode,
		async capture(frame) {
			if (errors.length) throw new Error(`${name} page errors:\n${errors.join('\n')}`);
			let r: { image?: string };
			try {
				r = await settle(
					`frame ${frame}`,
					page.evaluate(
						(n) => (window as any).__vfMotionStage.frame(n, true) as Promise<{ image?: string }>,
						frame
					)
				);
			} catch (error) {
				throw new Error(named(`${name}, frame ${frame}`, error));
			}
			if (r.image) return Buffer.from(r.image.slice(r.image.indexOf(',') + 1), 'base64');
			return settle(
				`frame ${frame}`,
				page.locator('#vf-stage').screenshot({ omitBackground: target.alpha, type: 'png' })
			);
		},
		async check(frames) {
			// One call runs the whole list, so it gets the frame budget per ten frames.
			const found = await settle(
				'check',
				page.evaluate((list) => (window as any).__vfMotionStage.check(list), frames),
				timeout * Math.max(1, Math.ceil(frames.length / 10))
			);
			for (const e of errors) found.errors.push({ frame: -1, message: e });
			return found;
		},
		close: () => page.close()
	};
}

const CONTENT_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ttf': 'font/ttf',
	'.otf': 'font/otf',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
	'.mp3': 'audio/mpeg',
	'.wav': 'audio/wav'
};

/** Serves `${ORIGIN}/@fs/<absolute path>` from disk: only allowed folders and files. */
async function serveAllowed(
	route: RouteLike,
	allowed: Pick<BundleResult, 'roots' | 'files'>,
	errors: string[]
) {
	const { pathname } = new URL(route.request().url());
	if (!pathname.startsWith('/@fs/')) return route.fulfill({ status: 404 });
	let abs: string;
	let real: string;
	try {
		abs = fileURLToPath(`file://${pathname.slice('/@fs'.length)}`);
		// Resolve symlinks first, so a link inside the project cannot reach outside it.
		real = await fs.realpath(abs);
	} catch {
		return route.fulfill({ status: 404 });
	}
	const realOf = (p: string) => fs.realpath(p).catch(() => p);
	const realRoots = await Promise.all(allowed.roots.map(realOf));
	const realFiles = await Promise.all(allowed.files.map(realOf));
	const inRoot = realRoots.some((root) => real === root || real.startsWith(root + path.sep));
	if (!inRoot && !realFiles.includes(real)) {
		errors.push(`Blocked a request outside the project: ${abs}`);
		return route.fulfill({ status: 403 });
	}
	try {
		const body = await fs.readFile(real);
		return route.fulfill({
			status: 200,
			body,
			contentType: CONTENT_TYPES[path.extname(abs).toLowerCase()] ?? 'application/octet-stream'
		});
	} catch {
		return route.fulfill({ status: 404 });
	}
}

// ---------------------------------------------------------------- footage

type VideoInfo = {
	width: number;
	height: number;
	fps: number;
	frames: number;
	/** Seconds from the first frame to the end of the last one. */
	duration: number;
	/** False when the frame intervals are not all equal (variable frame rate, dropped frames). */
	constant: boolean;
};

function ffprobeJson(file: string, args: string[]): Promise<any> {
	return new Promise((resolve, reject) => {
		const p = spawn(process.env.FFPROBE_PATH || 'ffprobe', [
			'-v',
			'error',
			...args,
			'-of',
			'json',
			file
		]);
		let out = '';
		let err = '';
		p.stdout.on('data', (d) => (out += d));
		p.stderr.on('data', (d) => (err += d));
		p.on('error', reject);
		p.on('close', (code) =>
			code === 0
				? resolve(JSON.parse(out))
				: reject(new Error(`ffprobe failed for ${file}: ${err.slice(-400)}`))
		);
	});
}

/**
 * Presentation timestamps (in time-base ticks) of the frames the first video stream shows.
 * Packets flagged for discard (edit-list preroll of a stream-copied cut) are left out.
 */
function packetTimestamps(file: string): Promise<number[]> {
	return new Promise((resolve, reject) => {
		const p = spawn(process.env.FFPROBE_PATH || 'ffprobe', [
			'-v',
			'error',
			'-select_streams',
			'v:0',
			'-show_entries',
			'packet=pts,flags',
			'-of',
			'csv=p=0',
			file
		]);
		let out = '';
		let err = '';
		p.stdout.on('data', (d) => (out += d));
		p.stderr.on('data', (d) => (err += d));
		p.on('error', reject);
		p.on('close', (code) =>
			code === 0
				? resolve(
						out
							.split('\n')
							.map((line) => line.split(','))
							.filter(([pts, flags = '']) => {
								const value = pts?.trim();
								return value && value !== 'N/A' && !flags.includes('D');
							})
							.map(([pts]) => Number(pts))
							.filter((n) => Number.isFinite(n))
					)
				: reject(new Error(`ffprobe failed for ${file}: ${err.slice(-400)}`))
		);
	});
}

/**
 * Size, nominal frame rate, frame count and duration of a video's first stream, from its packet
 * timestamps. `constant` is false when any frame interval differs from the others (a dropped or
 * repeated frame, a variable-frame-rate recording).
 */
function quarterTurn(stream: any): boolean {
	const fromSideData = (stream.side_data_list ?? []).find(
		(d: any) => d.rotation !== undefined
	)?.rotation;
	const rotation = Number(fromSideData ?? stream.tags?.rotate ?? 0);
	return Math.abs(rotation) % 180 === 90;
}

export async function probeVideo(file: string): Promise<VideoInfo> {
	const info = await ffprobeJson(file, [
		'-select_streams',
		'v:0',
		'-show_entries',
		'stream=width,height,r_frame_rate,time_base:stream_side_data=rotation:stream_tags=rotate'
	]);
	const stream = info.streams?.[0];
	if (!stream) throw new Error(`No video stream in ${file}`);
	const rate = (value: unknown) => {
		const [num, den] = String(value).split('/').map(Number);
		return den ? num / den : num;
	};
	const fps = rate(stream.r_frame_rate);
	const timeBase = rate(stream.time_base);
	const pts = (await packetTimestamps(file)).sort((x, y) => x - y);
	if (!pts.length) throw new Error(`No video frames in ${file}`);
	const step = 1 / fps / timeBase;
	let constant = true;
	for (let i = 1; i < pts.length; i++) {
		// Allow one tick of rounding; anything else is a gap or a repeat.
		if (Math.abs(pts[i] - pts[i - 1] - step) > 1) {
			constant = false;
			break;
		}
	}
	return {
		// Decoders apply the rotation, so a portrait phone video decodes with swapped sides.
		...(quarterTurn(stream)
			? { width: stream.height, height: stream.width }
			: { width: stream.width, height: stream.height }),
		fps,
		frames: pts.length,
		duration: (pts[pts.length - 1] - pts[0]) * timeBase + 1 / fps,
		constant
	};
}

/** Default seconds extracted around the clips, for `offset` and delayed copies. */
const FOOTAGE_MARGIN_SECONDS = 2;

function edgeFrame(clips: ResolvedClip[], startFrame: number, total: number) {
	if (total <= 0) return { first: 0, last: 0 };
	const before = clips.every((c) => c.startFrame + c.frames <= startFrame);
	const index = before ? 0 : total - 1;
	return { first: index, last: index };
}

/**
 * Cache key of one extracted range: source, matte, their sizes and times, frame rate and range.
 * Inserts mode has always used it for its one range, so existing caches stay valid.
 */
export function footageCacheKey(input: {
	src: string;
	matte: string | null;
	sizes: ([number, number] | null)[];
	fps: number;
	range: FrameRange;
}): string {
	const { src, matte, sizes, fps, range } = input;
	return createHash('sha1')
		.update(JSON.stringify({ src, matte, sizes, fps, range, boxes: 1 }))
		.digest('hex')
		.slice(0, 12);
}

type FootageSource = {
	name: string;
	src: string;
	matte: string | null;
	info: VideoInfo;
	sizes: ([number, number] | null)[];
	/** Same constant frame rate as the project: footage frames are program frames. */
	direct: boolean;
	total: number;
};

/**
 * Extracts the footage frames the given clips need (with a margin) into
 * `<project>/.visualfries/footage/`, attaches them to the clips and returns the folders to serve.
 * Inserts mode extracts one range per footage around the clips. Program mode extracts every
 * range of every source the program shows (cuts, the handles their transitions need, shots with
 * a source) plus the margin around what the clips show, each range on its own, and attaches the
 * footage map that turns program frames into source frames. Each range is cached by source,
 * matte, frame rate and range.
 */
export async function prepareFootage(
	loaded: LoadedMotionProject,
	clips: ResolvedClip[]
): Promise<string[]> {
	return (await extractFootage(loaded, clips)).roots;
}

/** `prepareFootage`, also returning the extracted frames and the footage map. */
async function extractFootage(
	loaded: LoadedMotionProject,
	clips: ResolvedClip[]
): Promise<{ roots: string[]; frames: Record<string, FootageFrames>; map: FootageMap | null }> {
	const footage = loaded.project.footage ?? {};
	const fps = loaded.project.fps;
	const sources: FootageSource[] = [];
	for (const [name, spec] of Object.entries(footage)) {
		const src = path.resolve(loaded.dir, spec.src);
		const matte = spec.matte ? path.resolve(loaded.dir, spec.matte) : null;
		for (const file of [src, matte])
			if (file && !existsSync(file)) throw new Error(`Footage "${name}": file not found: ${file}`);
		const info = await probeVideo(src);
		if (matte) {
			const m = await probeVideo(matte);
			// Two frames of difference are allowed; the epsilon absorbs float rounding.
			if (Math.abs(m.duration - info.duration) > 2 / info.fps + 1e-6)
				throw new Error(
					`Footage "${name}": the matte is ${m.duration.toFixed(2)} s long, the video ${info.duration.toFixed(2)} s. Make the matte from this video (visualfries matte).`
				);
		}
		// Same constant frame rate as the project: footage frames are program frames and a fast
		// input seek is exact. Otherwise decode from the start so the rate conversion keeps one
		// phase whatever range is extracted.
		const direct = info.constant && Math.abs(info.fps - fps) < 0.01;
		const total = direct ? info.frames : Math.round(info.duration * fps);
		const stats = await Promise.all([src, matte].map((f) => (f ? fs.stat(f) : null)));
		const sizes = stats.map((st) => (st ? ([st.size, st.mtimeMs] as [number, number]) : null));
		sources.push({ name, src, matte, info, sizes, direct, total });
	}

	const roots: string[] = [];
	const frames: Record<string, FootageFrames> = {};
	const extract = async (source: FootageSource, range: FrameRange) => {
		const extracted = await extractFootageRange(loaded.dir, source, fps, range);
		roots.push(extracted.dir);
		return extracted.range;
	};
	const attach = (source: FootageSource, startFrame: number, ranges: FootageRange[]) => {
		frames[source.name] = {
			url: ranges[0]?.url ?? '',
			first: ranges[0]?.first ?? 0,
			last: ranges[0]?.last ?? -1,
			ranges,
			total: source.total,
			width: source.info.width,
			height: source.info.height,
			startFrame,
			subject: !!source.matte,
			boxes: ranges[0]?.boxes
		};
	};

	if (loaded.cutList.mode === 'inserts') {
		for (const source of sources) {
			const spec = footage[source.name];
			const startFrame = Math.round((spec.start ?? 0) * fps);
			const margin =
				spec.margin === 'all'
					? source.total
					: Math.round((spec.margin ?? FOOTAGE_MARGIN_SECONDS) * fps);
			// Clips that never overlap the footage hold its nearest edge frame; "all" extracts every frame.
			const range =
				spec.margin === 'all'
					? { first: 0, last: Math.max(0, source.total - 1) }
					: (footageFrameRange(clips, startFrame, source.total, margin) ??
						edgeFrame(clips, startFrame, source.total));
			attach(source, startFrame, [await extract(source, range)]);
		}
		for (const clip of clips) clip.footage = frames;
		return { roots, frames, map: null };
	}

	// Items that fail to resolve are left out; `check` and `program` report them.
	const program = resolveProgram(loaded.project, loaded.inputs);
	const map = footageMap(program, Object.fromEntries(sources.map((s) => [s.name, s.total])));
	const margins = Object.fromEntries(
		sources.map((s) => {
			const margin = footage[s.name].margin;
			return [
				s.name,
				margin === 'all' ? s.total : Math.round((margin ?? FOOTAGE_MARGIN_SECONDS) * fps)
			];
		})
	);
	// Ranges less than a second apart are extracted as one: fewer decoder runs, few extra frames.
	const wanted = footageRanges(map, clips, margins, Math.round(fps));
	for (const source of sources) {
		const ranges: FootageRange[] = [];
		for (const range of wanted[source.name] ?? []) ranges.push(await extract(source, range));
		attach(source, 0, ranges);
	}
	for (const clip of clips) {
		clip.footage = frames;
		clip.footageMap = map;
	}
	return { roots, frames, map };
}

/** Extracts one range of a footage (plate, subject and boxes), or reuses the cached one. */
async function extractFootageRange(
	projectDir: string,
	source: FootageSource,
	fps: number,
	range: FrameRange
): Promise<{ dir: string; range: FootageRange }> {
	const { name, src, matte, info, direct, total } = source;
	const key = footageCacheKey({ src, matte, sizes: source.sizes, fps, range });
	const dir = path.join(projectDir, '.visualfries', 'footage', `${name}-${key}`);
	if (!existsSync(path.join(dir, 'done.json'))) {
		const tmp = `${dir}.tmp-${process.pid}-${randomUUID()}`;
		await fs.mkdir(path.join(tmp, 'plate'), { recursive: true });
		try {
			const count = range.last - range.first + 1;
			const seek = direct ? ['-ss', (range.first / fps).toFixed(6)] : [];
			const pick = direct
				? `fps=${fps}`
				: `fps=${fps},trim=start_frame=${range.first}:end_frame=${range.last + 1},setpts=PTS-STARTPTS`;
			await ffmpeg([
				'-y',
				...seek,
				'-i',
				src,
				'-vf',
				pick,
				'-frames:v',
				String(count),
				'-start_number',
				String(range.first),
				'-q:v',
				'2',
				path.join(tmp, 'plate', '%06d.jpg')
			]);
			if (matte) {
				await fs.mkdir(path.join(tmp, 'subject'), { recursive: true });
				await ffmpeg([
					'-y',
					...seek,
					'-i',
					src,
					'-i',
					matte,
					'-filter_complex',
					// The matte is padded before it is cut to the range, so a matte a frame or two
					// short holds its last frame even when only the end of the footage is extracted.
					`[0:v]${pick}[c];[1:v]fps=${fps},scale=${info.width}:${info.height},format=gray,tpad=stop_mode=clone:stop_duration=2,trim=start_frame=${range.first}:end_frame=${range.last + 1},setpts=PTS-STARTPTS[m];[c][m]alphamerge,format=rgba`,
					'-frames:v',
					String(count),
					'-start_number',
					String(range.first),
					'-compression_level',
					'1',
					path.join(tmp, 'subject', '%06d.png')
				]);
			}
			const written = (await fs.readdir(path.join(tmp, 'plate'))).length;
			let boxes: (SubjectBox | null)[] | undefined;
			if (matte) {
				const cutOuts = (await fs.readdir(path.join(tmp, 'subject'))).length;
				if (cutOuts !== written)
					throw new Error(
						`Footage "${name}": ${cutOuts} subject frames for ${written} picture frames; the matte does not cover the clips.`
					);
				boxes = await matteBoxes(matte, info, fps, range, written);
			}
			await fs.writeFile(
				path.join(tmp, 'done.json'),
				JSON.stringify({
					name,
					src,
					matte,
					first: range.first,
					last: range.first + written - 1,
					total,
					width: info.width,
					height: info.height,
					boxes
				})
			);
			// Publish atomically. If another run published the same frames first, keep theirs:
			// never delete a published folder another page may be reading.
			await fs.rename(tmp, dir).catch(async (error) => {
				if (!existsSync(path.join(dir, 'done.json'))) throw error;
			});
		} finally {
			await fs.rm(tmp, { recursive: true, force: true });
		}
	}
	const done = JSON.parse(await fs.readFile(path.join(dir, 'done.json'), 'utf8'));
	return {
		dir,
		range: { url: originUrl(dir) + '/', first: done.first, last: done.last, boxes: done.boxes }
	};
}

/** Width of the downscaled matte the subject boxes are measured on. */
const BOX_SAMPLE_WIDTH = 160;

/**
 * Bounding box of the subject in every extracted frame, measured on a downscaled matte
 * (white above half = subject). Frames without a subject get null.
 */
async function matteBoxes(
	matte: string,
	info: { width: number; height: number },
	fps: number,
	range: { first: number; last: number },
	count: number
): Promise<(SubjectBox | null)[]> {
	const w = BOX_SAMPLE_WIDTH;
	const h = Math.max(2, Math.round((info.height / info.width) * w));
	const raw = await ffmpegOutput([
		'-i',
		matte,
		'-vf',
		`fps=${fps},scale=${w}:${h}:flags=area,format=gray,tpad=stop_mode=clone:stop_duration=2,trim=start_frame=${range.first}:end_frame=${range.last + 1}`,
		'-frames:v',
		String(count),
		'-f',
		'rawvideo',
		'-pix_fmt',
		'gray',
		'pipe:1'
	]);
	const boxes: (SubjectBox | null)[] = [];
	for (let i = 0; i < count; i++) {
		const frame = raw.subarray(i * w * h, (i + 1) * w * h);
		boxes.push(frame.length === w * h ? measureSubject(frame, w, h) : null);
	}
	return boxes;
}

/** Subject box of one greyscale matte frame, in 0–1 coordinates. Exported for tests. */
export function measureSubject(gray: Uint8Array, w: number, h: number): SubjectBox | null {
	let x0 = w,
		y0 = h,
		x1 = -1,
		y1 = -1;
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++)
			if (gray[y * w + x] >= 128) {
				if (x < x0) x0 = x;
				if (x > x1) x1 = x;
				if (y < y0) y0 = y;
				if (y > y1) y1 = y;
			}
	if (x1 < 0) return null;
	// The head: the subject's top rows (about a twelfth of the frame height), centred.
	const band = Math.max(1, Math.round(h / 12));
	let sum = 0,
		n = 0;
	for (let y = y0; y < Math.min(h, y0 + band); y++)
		for (let x = x0; x <= x1; x++)
			if (gray[y * w + x] >= 128) {
				sum += x;
				n++;
			}
	const r = (v: number) => Math.round(v * 10000) / 10000;
	return {
		x: r(x0 / w),
		y: r(y0 / h),
		width: r((x1 + 1 - x0) / w),
		height: r((y1 + 1 - y0) / h),
		headX: r((sum / n + 0.5) / w),
		headY: r(y0 / h)
	};
}

// ---------------------------------------------------------------- still / sheet

export type StillRequest = { clip: string; at: string };

/** Frame for "extra", "extra.end+0.3", "2.5s", "f120", "end", "mid". */
export function frameForAt(clip: ResolvedClip, at: string): number {
	const seconds = resolveMoment(at, {
		id: clip.id,
		cues: clip.cues,
		duration: clip.duration,
		fps: clip.fps,
		beats: clip.beats?.map((b) => ({ index: b.index, time: b.local, bar: b.bar, beat: b.beat })),
		noBeats: clip.noBeats
	});
	return Math.max(0, Math.min(clip.frames - 1, Math.round(seconds * clip.fps)));
}

export type ClipCheck = {
	id: string;
	ok: boolean;
	mode?: string;
	errors: { frame?: number; message: string }[];
	warnings: { frame?: number; message: string }[];
	/** Frames whose pixels differed between two seek orders (with `determinism`). */
	nondeterministic?: number[];
};

/**
 * Mount every block and run its logic across the clip without rendering video: resolution
 * errors, runtime errors (unknown cue, bad ease, map order), wall-clock CSS animations and,
 * optionally, whether sampled frames come out identical in two seek orders.
 */
export async function checkMotionProject(
	loaded: LoadedMotionProject,
	opts: { clips?: string[]; determinism?: boolean } = {}
): Promise<ClipCheck[]> {
	assertKnownClips(loaded, opts.clips);
	const wanted = opts.clips?.length ? opts.clips : loaded.project.clips.map((c) => c.id);
	const results: ClipCheck[] = wanted.map((id) => {
		const diags = loaded.resolved.diagnostics.filter((d) => d.clip === id);
		return {
			id,
			ok: false,
			errors: diags
				.filter((d) => d.level === 'error')
				.map((d) => ({ message: `${d.field}: ${d.message}` })),
			warnings: diags
				.filter((d) => d.level === 'warning')
				.map((d) => ({ message: `${d.field}: ${d.message}` }))
		};
	});
	if (loaded.project.brand !== undefined) {
		// A brand change reaches a block only through tokens; colours written into it stay put.
		const found = new Map<string, string[]>();
		for (const clip of loaded.project.clips) {
			if (clip.block.startsWith(BUILTIN_PREFIX)) continue;
			const file = blockFile(loaded.dir, clip.block);
			if (!found.has(file))
				found.set(file, existsSync(file) ? hardCodedColors(await fs.readFile(file, 'utf8')) : []);
			const colors = found.get(file)!;
			const result = results.find((r) => r.id === clip.id);
			if (colors.length && result)
				result.warnings.push({
					message: `${clip.block} hard-codes ${colors.length} colour${colors.length > 1 ? 's' : ''} (${colors.slice(0, 4).join(', ')}${colors.length > 4 ? ', …' : ''}); a brand change will not reach ${colors.length > 1 ? 'them' : 'it'}. Use var(--brand-…) tokens or clip.brand.`
				});
		}
	}
	for (const r of results) {
		if (r.errors.length || loaded.resolved.clips.some((c) => c.id === r.id)) continue;
		r.errors.push({
			message: loaded.project.clips.some((c) => c.id === r.id)
				? 'Clip did not resolve, so it was not checked.'
				: `Unknown clip "${r.id}". Clips: ${loaded.project.clips.map((c) => c.id).join(', ')}.`
		});
	}
	const runnable = results
		.filter((r) => !r.errors.length)
		.map((r) => loaded.resolved.clips.find((c) => c.id === r.id))
		.filter((c): c is ResolvedClip => !!c);
	if (runnable.length) {
		const bundle = await bundleMotionProject(loaded, runnable);
		const browser = await launch();
		try {
			for (const clip of runnable) {
				const result = results.find((r) => r.id === clip.id)!;
				let page: MotionPage | undefined;
				try {
					page = await openClip(browser, bundle, clip);
					result.mode = page.mode;
					// Every 5th frame plus the frames around each cue.
					const frames = new Set<number>();
					for (let f = 0; f < clip.frames; f += 5) frames.add(f);
					for (const cue of Object.values(clip.cues))
						for (const d of [-1, 0, 1, 18]) frames.add(cue.frame + d);
					frames.add(clip.frames - 1);
					const list = [...frames].filter((f) => f >= 0 && f < clip.frames).sort((a, b) => a - b);
					const found = await page.check(list);
					result.errors.push(...found.errors);
					result.warnings.push(...found.warnings);
					if (opts.determinism && !found.errors.length) {
						const sample = list.filter(
							(_, i) => i % Math.max(1, Math.floor(list.length / 12)) === 0
						);
						const hash = (b: Buffer) => createHash('sha1').update(b).digest('hex');
						const forward = new Map<number, string>();
						for (const f of sample) forward.set(f, hash(await page.capture(f)));
						const differ: number[] = [];
						for (const f of [...sample].reverse())
							if (hash(await page.capture(f)) !== forward.get(f)) differ.push(f);
						if (differ.length) {
							result.nondeterministic = differ.sort((a, b) => a - b);
							result.errors.push({
								message: `Frames ${result.nondeterministic.join(', ')} look different depending on seek order. Something depends on history (wall-clock time, stateful random, state kept between frames).`
							});
						}
					}
				} catch (error) {
					result.errors.push({ message: (error as Error).message });
				} finally {
					await page?.close();
				}
			}
		} finally {
			await browser.close();
			await fs.rm(bundle.dir, { recursive: true, force: true });
		}
	}
	for (const r of results) r.ok = r.errors.length === 0;
	return results;
}

/**
 * Colour literals in a block's source (hex, rgb(), hsl()), each listed once. Black, white and
 * their transparent shades (shadows, scrims) and fallbacks inside `var(--x, …)` are left out.
 */
export function hardCodedColors(source: string): string[] {
	const stripped = source
		.replace(/&#x?[0-9a-f]+;/gi, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/var\(\s*--[\w-]+\s*,[^()]*(?:\([^()]*\)[^()]*)*\)/g, '');
	const neutral =
		/^(#(?:0{3,4}|0{6}(?:[0-9a-f]{2})?|f{3,4}|f{6}(?:[0-9a-f]{2})?)|(?:rgba?)\(\s*(?:0\s*[, ]\s*0\s*[, ]\s*0|255\s*[, ]\s*255\s*[, ]\s*255)\b.*)$/i;
	const found = new Set<string>();
	for (const m of stripped.matchAll(
		/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|(?:rgba?|hsla?)\([^)]*\)/g
	)) {
		const literal = m[0].replace(/\s+/g, ' ');
		if (!neutral.test(literal)) found.add(literal.toLowerCase());
	}
	return [...found];
}

/** Moments worth checking: start, each cue + 0.6 s settle, end. */
export function defaultMoments(clip: ResolvedClip): string[] {
	const cueMoments = Object.entries(clip.cues)
		.sort((a, b) => a[1].start - b[1].start)
		.map(([name]) => `${name}+0.6`);
	return ['f0', 'f10', ...cueMoments, 'end'];
}

export async function renderStills(
	loaded: LoadedMotionProject,
	requests: StillRequest[],
	opts: { invalidate?: string } = {}
): Promise<{ clip: string; at: string; frame: number; png: Buffer; mode: string }[]> {
	const byId = new Map(loaded.resolved.clips.map((c) => [c.id, c]));
	const ids = [...new Set(requests.map((r) => r.clip))];
	assertNoErrors(loaded, ids);
	const clips = ids.map((id) => byId.get(id)!);
	const bundle = await bundleMotionProject(loaded, clips);
	const browser = await launch();
	const out: { clip: string; at: string; frame: number; png: Buffer; mode: string }[] = [];
	try {
		for (const clip of clips) {
			const page = await openClip(browser, bundle, clip, { invalidate: opts.invalidate });
			for (const r of requests.filter((q) => q.clip === clip.id)) {
				const frame = frameForAt(clip, r.at);
				out.push({
					clip: clip.id,
					at: r.at,
					frame,
					png: await page.capture(frame),
					mode: page.mode
				});
			}
			await page.close();
		}
	} finally {
		await browser.close();
		await fs.rm(bundle.dir, { recursive: true, force: true });
	}
	return out;
}

/** One labelled grid image so an agent can review many moments in a single look. */
export async function composeSheet(
	images: { label: string; png: Buffer }[],
	opts: { columns?: number; width?: number } = {}
): Promise<Buffer> {
	const columns = opts.columns ?? Math.min(3, images.length);
	const cell = Math.floor((opts.width ?? 1920) / columns);
	const browser = await launch();
	try {
		const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
		const data = images.map((i) => ({
			label: i.label,
			src: 'data:image/png;base64,' + i.png.toString('base64')
		}));
		const url: string = await page.evaluate(
			async ({ data, columns, cell }) => {
				const imgs = await Promise.all(
					data.map(
						(d) =>
							new Promise<HTMLImageElement>((ok, fail) => {
								const im = new Image();
								im.onload = () => ok(im);
								im.onerror = fail;
								im.src = d.src;
							})
					)
				);
				const h = Math.round((cell * imgs[0].height) / imgs[0].width);
				const label = 28;
				const c = document.createElement('canvas');
				c.width = cell * columns;
				c.height = Math.ceil(imgs.length / columns) * (h + label);
				const g = c.getContext('2d')!;
				g.fillStyle = '#111';
				g.fillRect(0, 0, c.width, c.height);
				imgs.forEach((im, i) => {
					const x = (i % columns) * cell;
					const y = Math.floor(i / columns) * (h + label);
					g.fillStyle = '#333';
					g.fillRect(x, y + label, cell, h);
					g.drawImage(im, x, y + label, cell - 2, h - 2);
					g.fillStyle = '#fff';
					g.font = '600 18px sans-serif';
					g.fillText(data[i].label, x + 8, y + 20);
				});
				return c.toDataURL('image/png');
			},
			{ data, columns, cell }
		);
		return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
	} finally {
		await browser.close();
	}
}

// ---------------------------------------------------------------- render

export type RenderedClip = {
	id: string;
	file: string;
	frames: number;
	programStartFrame: number;
	programStart: number;
	programEnd: number;
	alpha: boolean;
	mode: string;
	seconds: number;
	/** Transcript the clip was timed against. */
	transcript: string | null;
	/** Music beats and corrections the clip was timed against (`musicHash`); absent without music. */
	music?: string;
	/** Hash of the brand the clip was rendered with (null: no brand). */
	brand: string | null;
	/** Hash of the layered style the clip was rendered with (null: no style). */
	style: string | null;
	/** Set when the clip was rendered against another transcript or music beats than the newest render. */
	stale?: boolean;
};

function ffmpegOutput(args: string[]): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, {
			stdio: ['ignore', 'pipe', 'pipe']
		});
		const out: Buffer[] = [];
		let err = '';
		p.stdout.on('data', (d: Buffer) => out.push(d));
		p.stderr.on('data', (d) => (err += d));
		p.on('error', reject);
		p.on('close', (code) =>
			code === 0
				? resolve(Buffer.concat(out))
				: reject(new Error(`ffmpeg failed (${code}): ${err.slice(-800)}`))
		);
	});
}

function ffmpeg(args: string[], input?: NodeJS.ReadableStream): Promise<void> {
	return new Promise((resolve, reject) => {
		const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, {
			stdio: ['pipe', 'ignore', 'pipe']
		});
		let err = '';
		p.stderr.on('data', (d) => (err += d));
		p.on('error', reject);
		p.on('close', (code) =>
			code === 0 ? resolve() : reject(new Error(`ffmpeg failed (${code}): ${err.slice(-800)}`))
		);
		if (input) input.pipe(p.stdin);
		else p.stdin.end();
	});
}

/** Video settings of every finished H.264 file: clips, and programs after their one final encode. */
export const H264_FINAL = [
	'-c:v',
	'libx264',
	'-crf',
	'14',
	'-preset',
	'medium',
	'-pix_fmt',
	'yuv420p',
	'-movflags',
	'+faststart'
];

/** The encoder went away while frames were being piped; the frames themselves were fine. */
export class FramePipeError extends Error {}

type FrameSink = { write(png: Buffer): Promise<void>; end(): Promise<void>; kill(): void };

/**
 * ffmpeg reading PNG frames from stdin, in order. `write` resolves once ffmpeg has taken the
 * frame (back-pressure), so at most a few frames are held in memory whatever the clip length.
 */
export function ffmpegFramePipe(args: string[]): FrameSink {
	const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
	let err = '';
	p.stderr.on('data', (d) => (err = (err + d).slice(-4000)));
	const done = new Promise<void>((resolve, reject) => {
		p.on('error', (e) => reject(new FramePipeError(`ffmpeg failed to start: ${e.message}`)));
		p.on('close', (code) =>
			code === 0
				? resolve()
				: reject(new FramePipeError(`ffmpeg failed (${code}): ${err.slice(-800)}`))
		);
	});
	done.catch(() => {}); // surfaced by write() / end()
	p.stdin.on('error', () => {}); // EPIPE: the exit code and stderr in `done` say why
	const gone = () =>
		done.then(() => {
			throw new FramePipeError('ffmpeg exited before all frames were written.');
		});
	return {
		async write(png: Buffer) {
			if (p.exitCode !== null || p.stdin.destroyed) return gone();
			if (!p.stdin.write(png))
				// once() rejects on a stdin 'error' (EPIPE when ffmpeg dies mid-stream); report the
				// process result instead, which carries the exit code and stderr.
				await Promise.race([once(p.stdin, 'drain').catch(gone), gone()]);
		},
		async end() {
			p.stdin.end();
			await done;
		},
		kill() {
			if (p.exitCode === null) p.kill('SIGKILL');
		}
	};
}

/**
 * ffmpeg input and mapping that mux the sound of the clip's `audio` footage, cut to the clip's
 * program range. Silence fills anything the footage does not cover.
 */
function audioInput(loaded: LoadedMotionProject, clip: ResolvedClip): string[] {
	if (!clip.audio) return [];
	const footage = loaded.project.footage?.[clip.audio];
	if (!footage) throw new Error(`Clip "${clip.id}": unknown audio footage "${clip.audio}".`);
	const src = path.resolve(loaded.dir, footage.src);
	// The picture places the footage on a whole frame; the sound follows the same frame.
	const from = clip.start - Math.round((footage.start ?? 0) * clip.fps) / clip.fps;
	const delayMs = Math.max(0, Math.round(-from * 1000));
	return [
		'-ss',
		Math.max(0, from).toFixed(6),
		'-i',
		src,
		'-map',
		'0:v',
		'-map',
		'1:a:0',
		'-af',
		`${delayMs ? `adelay=${delayMs}:all=1,` : ''}apad`,
		'-t',
		clip.duration.toFixed(6),
		...(clip.alpha ? ['-c:a', 'pcm_s16le'] : ['-c:a', 'aac', '-b:a', '192k'])
	];
}

/**
 * Pages take frames in turn (page j renders j, j + jobs, …) and a reorder buffer hands them to
 * ffmpeg in order. A page waits while it is more than a few frames ahead of the encoder, so
 * memory stays flat; frames are deterministic in any order, which `check --determinism` proves.
 */
export async function pipeFrames(
	frames: number,
	jobs: number,
	open: () => Promise<Pick<MotionPage, 'capture' | 'close'>>,
	sink: FrameSink,
	opts: { signal?: AbortSignal } = {}
) {
	const ahead = jobs * 2;
	const ready = new Map<number, Buffer>();
	let next = 0;
	let failed: unknown = null;
	let wake: (() => void)[] = [];
	const notify = () => {
		const w = wake;
		wake = [];
		w.forEach((f) => f());
	};
	const writer = (async () => {
		while (next < frames) {
			const png = ready.get(next);
			if (!png) {
				if (failed) return;
				await new Promise<void>((r) => wake.push(r));
				continue;
			}
			ready.delete(next);
			await sink.write(png);
			next++;
			notify();
		}
	})();
	const worker = async (j: number) => {
		const page = await open();
		try {
			for (let f = j; f < frames; f += jobs) {
				while (f - next >= ahead && !failed) await new Promise<void>((r) => wake.push(r));
				if (failed) return;
				// Another render this one is part of failed: stop at the next frame.
				opts.signal?.throwIfAborted();
				ready.set(f, await page.capture(f));
				notify();
			}
		} finally {
			await page.close();
		}
	};
	const fail = (e: unknown) => {
		failed ??= e;
		notify();
		throw e;
	};
	// Settle everything before reporting, so no page is still capturing when the browser closes.
	const settled = await Promise.allSettled([
		...Array.from({ length: jobs }, (_, j) => worker(j).catch(fail)),
		writer.catch(fail)
	]);
	if (failed) {
		sink.kill();
		throw failed;
	}
	const rejected = settled.find((r) => r.status === 'rejected');
	if (rejected) {
		sink.kill();
		throw (rejected as PromiseRejectedResult).reason;
	}
	await sink.end();
}

/** The original path, kept as the fallback and for --keep-frames: PNG files, then one encode. */
async function framesThenEncode(
	clip: ResolvedClip,
	jobs: number,
	open: () => Promise<MotionPage>,
	encode: string[],
	keep?: boolean
) {
	const framesDir = await fs.mkdtemp(path.join(os.tmpdir(), `vf-frames-${clip.id}-`));
	const per = Math.ceil(clip.frames / jobs);
	try {
		await Promise.all(
			Array.from({ length: Math.min(jobs, clip.frames) }, async (_, j) => {
				const from = j * per;
				const to = Math.min(clip.frames, from + per);
				if (from >= to) return;
				const page = await open();
				for (let f = from; f < to; f++) {
					await fs.writeFile(
						path.join(framesDir, `${String(f).padStart(6, '0')}.png`),
						await page.capture(f)
					);
				}
				await page.close();
			})
		);
		const written = (await fs.readdir(framesDir)).filter((f) => f.endsWith('.png')).length;
		if (written !== clip.frames)
			throw new Error(`Clip "${clip.id}": rendered ${written} of ${clip.frames} frames.`);
		await ffmpeg([
			'-y',
			'-framerate',
			String(clip.fps),
			'-i',
			path.join(framesDir, '%06d.png'),
			...encode
		]);
	} finally {
		if (!keep) await fs.rm(framesDir, { recursive: true, force: true });
	}
}

export async function renderMotionClips(
	loaded: LoadedMotionProject,
	opts: {
		output: string;
		clips?: string[];
		jobs?: number;
		invalidate?: string;
		keepFrames?: boolean;
		onProgress?: (msg: string) => void;
	}
): Promise<RenderedClip[]> {
	if (opts.jobs !== undefined && !(Number.isInteger(opts.jobs) && opts.jobs > 0)) {
		throw new Error(`--jobs must be a positive integer, got ${opts.jobs}.`);
	}
	assertNoErrors(loaded, opts.clips?.length ? opts.clips : undefined);
	const clips = opts.clips?.length
		? opts.clips.map((id) => loaded.resolved.clips.find((x) => x.id === id)!)
		: loaded.resolved.clips;
	// `--output out.mp4` (or `.mov`) names the file itself when one clip is rendered.
	const single = /\.(mp4|mov)$/i.test(opts.output) ? path.resolve(opts.output) : undefined;
	if (single) {
		if (clips.length !== 1)
			throw new Error(
				`--output ${opts.output} names one file, but ${clips.length} clips would render. Pick one with --clip <id>, or pass a directory.`
			);
		const ext = clips[0].alpha ? '.mov' : '.mp4';
		if (path.extname(single).toLowerCase() !== ext)
			throw new Error(
				`Clip "${clips[0].id}" renders ${ext === '.mov' ? 'a transparent .mov' : 'an .mp4'}; use --output <name>${ext}.`
			);
	}
	await fs.mkdir(single ? path.dirname(single) : opts.output, { recursive: true });
	const bundle = await bundleMotionProject(loaded, clips);
	// libx264 with yuv420p needs even dimensions; fail before capturing, not after.
	for (const clip of clips) {
		if (!clip.alpha && clip.size.some((n) => n % 2))
			throw new Error(
				`Clip "${clip.id}": size ${clip.size.join('×')} must be even for H.264. Use even dimensions or "alpha": true.`
			);
	}
	if (loaded.brand.hash || loaded.style.hash)
		opts.onProgress?.(
			`Brand ${loaded.brand.hash ?? 'none'}${loaded.brand.file ? ` (${path.relative(process.cwd(), loaded.brand.file)})` : ''}, style ${loaded.style.hash ?? 'none'}${loaded.style.resolved.layers.length ? ` (${loaded.style.resolved.layers.join(' → ')})` : ''}`
		);
	const browser = await launch();
	const jobs = opts.jobs ?? Math.min(6, os.cpus().length);
	const results: RenderedClip[] = [];
	try {
		for (const clip of clips) {
			const t0 = Date.now();
			const file = single ?? path.resolve(opts.output, `${clip.id}.${clip.alpha ? 'mov' : 'mp4'}`);
			const codec = clip.alpha
				? [
						'-c:v',
						'prores_ks',
						'-profile:v',
						'4444',
						'-pix_fmt',
						'yuva444p10le',
						'-alpha_bits',
						'16'
					]
				: H264_FINAL;
			// ffmpeg truncates its output as soon as it opens it, and the piped encode opens it before
			// the first frame. Encode next to the target and replace it only on success, so a failed
			// render keeps the last good file.
			const partial = path.join(
				path.dirname(file),
				`.${path.basename(file, path.extname(file))}.partial-${process.pid}${path.extname(file)}`
			);
			const encode = [...audioInput(loaded, clip), ...codec, partial];
			let mode = '';
			const open = async () => {
				const page = await openClip(browser, bundle, clip, { invalidate: opts.invalidate });
				mode = page.mode;
				return page;
			};
			let piped = !opts.keepFrames;
			try {
				if (piped) {
					try {
						const sink = ffmpegFramePipe([
							'-y',
							'-f',
							'image2pipe',
							'-framerate',
							String(clip.fps),
							'-c:v',
							'png',
							'-i',
							'pipe:0',
							...encode
						]);
						await pipeFrames(clip.frames, Math.min(jobs, clip.frames), open, sink);
					} catch (error) {
						if (!(error instanceof FramePipeError)) throw error;
						// Fallback: the slower path that writes every frame as a file first.
						opts.onProgress?.(
							`${clip.id}: piping frames to ffmpeg failed (${error.message.split('\n')[0]}); rendering again through frame files`
						);
						piped = false;
					}
				}
				if (!piped) await framesThenEncode(clip, jobs, open, encode, opts.keepFrames);
				await fs.rename(partial, file);
			} finally {
				await fs.rm(partial, { force: true });
			}
			const r: RenderedClip = {
				id: clip.id,
				file,
				frames: clip.frames,
				programStartFrame: clip.startFrame,
				programStart: clip.start,
				programEnd: clip.end,
				alpha: clip.alpha,
				mode,
				seconds: (Date.now() - t0) / 1000,
				transcript: loaded.transcriptHash,
				...(loaded.musicHash ? { music: loaded.musicHash } : {}),
				brand: loaded.brand.hash,
				style: loaded.style.hash
			};
			results.push(r);
			opts.onProgress?.(`${clip.id}: ${clip.frames} frames in ${r.seconds.toFixed(1)} s (${mode})`);
		}
	} finally {
		await browser.close();
		await fs.rm(bundle.dir, { recursive: true, force: true });
	}
	if (single) return results;
	// Re-rendering some clips updates their entries and keeps the rest of the manifest.
	const manifestPath = path.resolve(opts.output, 'manifest.json');
	let previous: RenderedClip[] = [];
	try {
		previous = JSON.parse(await fs.readFile(manifestPath, 'utf8')).clips ?? [];
	} catch {
		previous = [];
	}
	const rendered = new Set(results.map((r) => r.id));
	const current = new Set(loaded.project.clips.map((c) => c.id));
	const kept = previous
		.filter((c) => !rendered.has(c.id) && current.has(c.id))
		.map((c) => ({
			...c,
			stale:
				c.transcript !== loaded.transcriptHash ||
				(c.music ?? null) !== loaded.musicHash ||
				undefined
		}));
	const stale = kept.filter((c) => c.stale).map((c) => c.id);
	if (stale.length) {
		opts.onProgress?.(
			`Warning: ${stale.join(', ')} were rendered against another transcript or other music beats; their placement may be off. Re-render them.`
		);
	}
	// Entries written before brands existed have no hashes; they count as "no brand, no style".
	const otherLook = kept
		.filter(
			(c) => (c.brand ?? null) !== loaded.brand.hash || (c.style ?? null) !== loaded.style.hash
		)
		.map((c) => c.id);
	if (otherLook.length) {
		opts.onProgress?.(
			`Warning: ${otherLook.join(', ')} were rendered with another brand or style. Re-render them to match.`
		);
	}
	const merged = [...kept, ...results].sort((a, b) => a.programStartFrame - b.programStartFrame);
	await fs.writeFile(
		manifestPath,
		JSON.stringify(
			{
				fps: loaded.project.fps,
				size: loaded.project.size,
				transcript: loaded.transcriptHash,
				...(loaded.musicHash ? { music: loaded.musicHash } : {}),
				brand: loaded.brand.hash,
				style: loaded.style.hash,
				clips: merged
			},
			null,
			2
		)
	);
	return results;
}
