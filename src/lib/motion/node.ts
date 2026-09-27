import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MotionProjectShape, type MotionProject } from './project.js';
import { parseTranscriptWords, type MotionWord } from './transcript.js';
import { resolveMotionProject, type ResolvedClip, type ResolvedProject } from './resolve.js';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CHROMIUM_FLAGS = ['--enable-blink-features=CanvasDrawElement', '--font-render-hinting=none'];

export type LoadedMotionProject = {
	file: string;
	dir: string;
	project: MotionProject;
	words: MotionWord[] | null;
	resolved: ResolvedProject;
};

/** `transcript` overrides the project's transcript (e.g. a re-recorded voiceover); relative to cwd. */
export async function loadMotionProject(
	file: string,
	opts: { transcript?: string } = {}
): Promise<LoadedMotionProject> {
	const abs = path.resolve(file);
	const dir = path.dirname(abs);
	const project = MotionProjectShape.parse(JSON.parse(await fs.readFile(abs, 'utf8')));
	const transcriptPath = opts.transcript
		? path.resolve(opts.transcript)
		: project.transcript
			? path.resolve(dir, project.transcript)
			: null;
	const words = transcriptPath
		? parseTranscriptWords(JSON.parse(await fs.readFile(transcriptPath, 'utf8')))
		: null;
	return { file: abs, dir, project, words, resolved: resolveMotionProject(project, words) };
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

type BundleResult = { dir: string; html: string };

/** Compile the project's blocks together with the stage runtime into one page. */
export async function bundleMotionProject(
	loaded: LoadedMotionProject,
	clips: ResolvedClip[]
): Promise<BundleResult> {
	const esbuild = await import('esbuild');
	const { compile, compileModule } = await import('svelte/compiler');
	const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-motion-'));
	const stageModule = path.join(HERE, 'stage.js');
	const motionIndex = path.join(HERE, 'index.js');
	// Blocks may import anything VisualFries depends on (svelte, gsap) without their own node_modules.
	const packageRoot = path.resolve(HERE, '..', '..');
	const nodePaths = [
		path.join(packageRoot, 'node_modules'),
		path.resolve(path.dirname(require.resolve('svelte/package.json')), '..'),
		path.resolve(path.dirname(require.resolve('gsap/package.json')), '..')
	];

	const blocks = [...new Set(clips.map((c) => c.block))];
	for (const block of blocks) {
		if (!existsSync(path.resolve(loaded.dir, block)))
			throw new Error(`Block file not found: ${block}`);
	}
	const entry = [
		`import { createMotionStage } from ${JSON.stringify(stageModule)};`,
		...blocks.map((b, i) => `import B${i} from ${JSON.stringify(path.resolve(loaded.dir, b))};`),
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

	const fonts = (loaded.project.fonts ?? []).map((f) => ({
		family: f.family,
		url: pathToFileURL(path.resolve(loaded.dir, f.src)).href,
		weight: f.weight,
		style: f.style
	}));
	let css = '';
	for (const file of loaded.project.styles ?? []) {
		const abs = path.resolve(loaded.dir, file);
		css += rebaseCssUrls(await fs.readFile(abs, 'utf8'), path.dirname(abs)) + '\n';
	}
	const cssBundle = path.join(outDir, 'bundle.css');
	const cssLink = existsSync(cssBundle) ? '<link rel="stylesheet" href="bundle.css">' : '';
	const html = path.join(outDir, 'index.html');
	await fs.writeFile(
		html,
		`<!doctype html><meta charset="utf-8">${cssLink}<script>window.__vfFonts=${JSON.stringify(fonts)};window.__vfCss=${JSON.stringify(
			css
		)};window.__vfInvalidate=new URLSearchParams(location.search).get('invalidate')||undefined;</script><body><script src="bundle.js"></script></body>`
	);
	return { dir: outDir, html };
}

/** Project CSS is inlined into a page elsewhere; make its relative url(...) absolute. */
function rebaseCssUrls(css: string, dir: string): string {
	return css.replace(/url\((\s*['"]?)([^'")]+)(['"]?\s*)\)/g, (all, open, ref, close) =>
		/^(data:|https?:|file:|#|\/)/.test(ref)
			? all
			: `url(${open}${pathToFileURL(path.resolve(dir, ref)).href}${close})`
	);
}

// ---------------------------------------------------------------- browser

export function findChromium(): string | undefined {
	const candidates = [
		process.env.VISUALFRIES_CHROMIUM,
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser',
		'/usr/bin/google-chrome',
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
	];
	return candidates.find((c) => c && existsSync(c));
}

type PageLike = {
	goto(url: string): Promise<unknown>;
	evaluate<R, A>(fn: (arg: A) => R | Promise<R>, arg: A): Promise<R>;
	locator(sel: string): {
		screenshot(opts: { omitBackground?: boolean; type?: 'png' }): Promise<Buffer>;
	};
	on(event: 'pageerror' | 'console', fn: (e: any) => void): void;
	close(): Promise<void>;
};
type BrowserLike = { newPage(opts: object): Promise<PageLike>; close(): Promise<void> };

async function launch(): Promise<BrowserLike> {
	const { chromium } = await import('playwright');
	const executablePath = findChromium();
	return chromium.launch({
		executablePath,
		args: CHROMIUM_FLAGS
	}) as unknown as Promise<BrowserLike>;
}

export type MotionPage = {
	mode: 'html-in-canvas' | 'dom';
	capture(frame: number): Promise<Buffer>;
	close(): Promise<void>;
};

async function openClip(
	browser: BrowserLike,
	bundle: BundleResult,
	clip: ResolvedClip,
	invalidate?: string
): Promise<MotionPage> {
	const page = await browser.newPage({
		viewport: { width: clip.size[0], height: clip.size[1] },
		deviceScaleFactor: 1
	});
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
	await page.goto(
		pathToFileURL(bundle.html).href + (invalidate ? `?invalidate=${invalidate}` : '')
	);
	let info: { mode: 'html-in-canvas' | 'dom' };
	try {
		info = await page.evaluate((data) => (window as any).__vfMotionStage.load(data), clip);
	} catch (error) {
		throw new Error(
			`Clip "${clip.id}" failed to load: ${(error as Error).message}\n${errors.join('\n')}`
		);
	}
	return {
		mode: info.mode,
		async capture(frame) {
			if (errors.length) throw new Error(`Clip "${clip.id}" page errors:\n${errors.join('\n')}`);
			const r = await page.evaluate(
				(n) => (window as any).__vfMotionStage.frame(n, true) as Promise<{ image?: string }>,
				frame
			);
			if (r.image) return Buffer.from(r.image.slice(r.image.indexOf(',') + 1), 'base64');
			return page.locator('#vf-stage').screenshot({ omitBackground: clip.alpha, type: 'png' });
		},
		close: () => page.close()
	};
}

// ---------------------------------------------------------------- still / sheet

export type StillRequest = { clip: string; at: string };

/** Frame for "extra", "extra.end+0.3", "2.5s", "f120", "end", "mid". */
export function frameForAt(clip: ResolvedClip, at: string): number {
	const last = clip.frames - 1;
	const pick = (n: number) => Math.max(0, Math.min(last, Math.round(n)));
	if (at === 'end') return last;
	if (at === 'mid') return pick(last / 2);
	if (/^f\d+$/.test(at)) return pick(Number(at.slice(1)));
	if (/^-?\d*\.?\d+s?$/.test(at)) return pick(parseFloat(at) * clip.fps);
	const m = /^([A-Za-z_][A-Za-z0-9_]*)(\.start|\.end)?([+-]\d*\.?\d+)?$/.exec(at);
	const builtin: Record<string, { start: number; end: number }> = {
		start: { start: 0, end: 0 },
		end: { start: clip.duration, end: clip.duration }
	};
	const cue = m && (clip.cues[m[1]] ?? builtin[m[1]]);
	if (!m || !cue)
		throw new Error(
			`Clip "${clip.id}": unknown moment "${at}". Cues: ${Object.keys(clip.cues).join(', ')}`
		);
	const base = m[2] === '.end' ? cue.end : cue.start;
	return pick((base + (m[3] ? Number(m[3]) : 0)) * clip.fps);
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
			const page = await openClip(browser, bundle, clip, opts.invalidate);
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
};

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
	await fs.mkdir(opts.output, { recursive: true });
	const bundle = await bundleMotionProject(loaded, clips);
	const browser = await launch();
	const jobs = opts.jobs ?? Math.min(6, os.cpus().length);
	const results: RenderedClip[] = [];
	try {
		for (const clip of clips) {
			const t0 = Date.now();
			const framesDir = await fs.mkdtemp(path.join(os.tmpdir(), `vf-frames-${clip.id}-`));
			const per = Math.ceil(clip.frames / jobs);
			let mode = '';
			const file = path.resolve(opts.output, `${clip.id}.${clip.alpha ? 'mov' : 'mp4'}`);
			try {
				await Promise.all(
					Array.from({ length: Math.min(jobs, clip.frames) }, async (_, j) => {
						const from = j * per;
						const to = Math.min(clip.frames, from + per);
						if (from >= to) return;
						const page = await openClip(browser, bundle, clip, opts.invalidate);
						mode = page.mode;
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
					: [
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
				await ffmpeg([
					'-y',
					'-framerate',
					String(clip.fps),
					'-i',
					path.join(framesDir, '%06d.png'),
					...codec,
					file
				]);
			} finally {
				if (!opts.keepFrames) await fs.rm(framesDir, { recursive: true, force: true });
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
				seconds: (Date.now() - t0) / 1000
			};
			results.push(r);
			opts.onProgress?.(`${clip.id}: ${clip.frames} frames in ${r.seconds.toFixed(1)} s (${mode})`);
		}
	} finally {
		await browser.close();
		await fs.rm(bundle.dir, { recursive: true, force: true });
	}
	// Re-rendering some clips updates their entries and keeps the rest of the manifest.
	const manifestPath = path.resolve(opts.output, 'manifest.json');
	let previous: RenderedClip[] = [];
	try {
		previous = JSON.parse(await fs.readFile(manifestPath, 'utf8')).clips ?? [];
	} catch {
		previous = [];
	}
	const rendered = new Set(results.map((r) => r.id));
	const merged = [...previous.filter((c) => !rendered.has(c.id)), ...results].sort(
		(a, b) => a.programStartFrame - b.programStartFrame
	);
	await fs.writeFile(
		manifestPath,
		JSON.stringify({ fps: loaded.project.fps, clips: merged }, null, 2)
	);
	return results;
}
