import { findBadValues } from './badvalues.js';
import { flushSync, mount, unmount, type Component } from 'svelte';
import {
	Clip,
	MOTION_CONTEXT_KEY,
	registerClipRoot,
	type ClipController
} from './runtime.svelte.js';
import type { ResolvedClip } from './resolve.js';
import { seekTimeline } from './seek.js';
import { brandTokens, NEUTRAL_BRAND } from './brand.js';
import { NO_SLOT_TOKENS, formatTokens, resolveFormat } from './format.js';
import { createProgramScene, type ProgramScene } from './program-stage.js';
import type { StageSegment } from './segments.js';
import type { Animatable } from './keys.js';

export type StageFont = { family: string; url: string; weight?: string | number; style?: string };
export type StageOptions = {
	blocks: Record<string, Component<Record<string, unknown>>>;
	/** What each block exports as `animatable` (program mode: keyed props). */
	animatable?: Record<string, Animatable | undefined>;
	fonts?: StageFont[];
	css?: string;
	/** Paint wait in ms before a frame fails. */
	paintTimeout?: number;
	/** How each seek forces a fresh raster (see frame()). */
	invalidate?: 'filters' | 'reattach' | 'none';
};

type CanvasWithElements = HTMLCanvasElement & { requestPaint?: () => void };
type Ctx2DWithElements = CanvasRenderingContext2D & {
	drawElementImage?: (el: Element, x: number, y: number) => unknown;
};

export type FrameResult = {
	frame: number;
	t: number;
	image?: string;
	paintMs: number;
	mode: CaptureMode;
};
export type CaptureMode = 'html-in-canvas' | 'dom';
export type CheckIssue = { frame: number; message: string };

/**
 * Browser side of motion rendering. Everything that decides pixels lives here so
 * preview, local export and server export run the same code.
 */
export function createMotionStage(options: StageOptions) {
	const probe = document.createElement('canvas').getContext('2d') as Ctx2DWithElements | null;
	const mode: CaptureMode =
		typeof probe?.drawElementImage === 'function' ? 'html-in-canvas' : 'dom';
	const paintTimeout = options.paintTimeout ?? 2000;

	const style = document.createElement('style');
	style.textContent =
		(options.fonts ?? [])
			.map(
				(f) =>
					`@font-face{font-family:${JSON.stringify(f.family)};src:url(${JSON.stringify(f.url)});` +
					`font-weight:${f.weight ?? 'normal'};font-style:${f.style ?? 'normal'};font-display:block}`
			)
			.join('\n') +
		'\nhtml,body{margin:0;background:transparent}\n#vf-stage{position:relative;overflow:hidden}\n' +
		(options.css ?? '');
	document.head.appendChild(style);

	let canvas: CanvasWithElements | null = null;
	let ctx: Ctx2DWithElements | null = null;
	let stage: HTMLDivElement | null = null;
	let active: {
		controller: ClipController;
		instance: ReturnType<typeof mount>;
		data: ResolvedClip;
	} | null = null;
	/** Program mode: the segment on the stage (see `loadSegment`). */
	let segment: ProgramScene | null = null;
	let seeks = 0;
	/** `<canvas layoutsubtree>` elements the block nests in the stage, as of the last seek. */
	let nested: HTMLCanvasElement[] = [];

	async function load(data: ResolvedClip) {
		try {
			return await mountClip(data);
		} catch (error) {
			// A font or useReady failure must not leave a half-loaded clip on the page.
			unload();
			throw error;
		}
	}

	/**
	 * Program mode: a range of the program (or all of it) on one stage, with the footage the cut
	 * list shows and every clip on screen in it. `frame(n)` then takes program frames.
	 */
	async function loadSegment(data: StageSegment) {
		try {
			return await mountSegment(data);
		} catch (error) {
			unload();
			throw error;
		}
	}

	async function mountSegment(data: StageSegment) {
		unload();
		if (data.insert?.holdout && mode === 'dom')
			throw new Error(
				'A holdout insert (a clip with "layer": "behind") needs HTML-in-Canvas capture (Chromium with the CanvasDrawElement flag).'
			);
		createStage(data.size, data.background);
		await loadFonts();
		segment = createProgramScene(stage!, data, options.blocks, options.animatable);
		findNestedCanvases();
		assertNoEffectOverNestedCanvas();
		await Promise.all(segment.ready);
		await document.fonts.ready;
		return { mode, frames: data.frames, fps: data.fps, startFrame: data.startFrame };
	}

	function createStage([width, height]: [number, number], background: string | null) {
		stage = document.createElement('div');
		stage.id = 'vf-stage';
		stage.style.width = `${width}px`;
		stage.style.height = `${height}px`;
		stage.style.background = background ?? 'transparent';
		if (mode === 'html-in-canvas') {
			canvas = document.createElement('canvas') as CanvasWithElements;
			canvas.setAttribute('layoutsubtree', '');
			canvas.width = width;
			canvas.height = height;
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
			canvas.appendChild(stage);
			document.body.appendChild(canvas);
			ctx = canvas.getContext('2d') as Ctx2DWithElements;
		} else {
			document.body.appendChild(stage);
		}
	}

	/** Fonts first: blocks and engines measure text when they mount. */
	async function loadFonts() {
		const query = (f: StageFont) =>
			`${f.style ?? 'normal'} ${String(f.weight ?? 400).split(/\s+/)[0]} 32px ${JSON.stringify(f.family)}`;
		await Promise.all((options.fonts ?? []).map((f) => document.fonts.load(query(f))));
		const missing = (options.fonts ?? []).filter((f) => !document.fonts.check(query(f)));
		if (missing.length)
			throw new Error(`Fonts failed to load: ${missing.map((f) => f.family).join(', ')}`);
	}

	async function mountClip(data: ResolvedClip) {
		unload();
		createStage(data.size, data.background);
		await loadFonts();
		const Block = options.blocks[data.block];
		if (!Block) throw new Error(`Block "${data.block}" is not in the bundle.`);
		const root = document.createElement('div');
		root.className = 'vf-clip';
		root.style.cssText = 'position:absolute;inset:0';
		// Brand tokens and safe insets for every block; custom properties alone change no pixels.
		const format = data.format ?? resolveFormat(data.size);
		root.dataset.format = format.class;
		for (const [name, value] of Object.entries({
			...brandTokens(data.brand ?? NEUTRAL_BRAND),
			...formatTokens(format),
			...NO_SLOT_TOKENS
		}))
			root.style.setProperty(name, value);
		stage!.appendChild(root);
		const controller: ClipController = {
			clip: new Clip(data),
			root,
			timelines: [],
			frameFns: [],
			ready: []
		};
		registerClipRoot(controller);
		const instance = mount(Block, {
			target: root,
			props: { ...data.props },
			context: new Map([[MOTION_CONTEXT_KEY, controller]])
		});
		flushSync();
		active = { controller, instance, data };
		findNestedCanvases();
		assertNoEffectOverNestedCanvas();
		await Promise.all(controller.ready);
		await document.fonts.ready;
		return { mode, frames: data.frames, fps: data.fps };
	}

	/** Sets clip time and runs the clip's logic; resolves once every `useFrame` promise settles. */
	async function applyTime(frame: number) {
		if (segment) {
			segment.seek(frame);
			findNestedCanvases();
			assertNoEffectOverNestedCanvas();
			await segment.draw(frame);
			return frame / segment.fps;
		}
		if (!active) throw new Error('No clip loaded.');
		const { controller, data } = active;
		const t = frame / data.fps;
		controller.clip.t = t;
		controller.clip.frame = frame;
		flushSync();
		for (const tl of controller.timelines) seekTimeline(tl, t);
		// Before `useFrame`: a block that awaits its own canvas's paint would crash there.
		findNestedCanvases();
		assertNoEffectOverNestedCanvas();
		const pending: Promise<unknown>[] = [];
		for (const fn of controller.frameFns) {
			const result = fn({ t, frame, clip: controller.clip });
			if (result && typeof (result as Promise<unknown>).then === 'function')
				pending.push(result as Promise<unknown>);
		}
		await Promise.all(pending);
		return t;
	}

	function nextPaint(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!canvas) {
				// DOM mode: two animation frames, with the same timeout guarantee.
				const timer = setTimeout(
					() => reject(new Error(`Paint did not happen within ${paintTimeout} ms.`)),
					paintTimeout
				);
				requestAnimationFrame(() =>
					requestAnimationFrame(() => {
						clearTimeout(timer);
						resolve();
					})
				);
				return;
			}
			const c = canvas;
			const timer = setTimeout(() => {
				c.removeEventListener('paint', done);
				reject(new Error(`Paint did not happen within ${paintTimeout} ms.`));
			}, paintTimeout);
			function done() {
				clearTimeout(timer);
				resolve();
			}
			c.addEventListener('paint', done, { once: true });
			c.requestPaint?.();
		});
	}

	/** Refreshes `nested`: the `<canvas layoutsubtree>` elements inside the stage's own canvas. */
	function findNestedCanvases() {
		nested =
			canvas && stage
				? [...stage.querySelectorAll<HTMLCanvasElement>('canvas[layoutsubtree]')]
				: [];
	}

	/**
	 * Chromium's renderer crashes when a nested `<canvas layoutsubtree>`, or anything between it
	 * and the stage's canvas, has a CSS filter or mask. Name the element instead, and unload the
	 * clip first so the browser's next paint does not crash the page anyway.
	 */
	function assertNoEffectOverNestedCanvas() {
		for (const inner of nested) {
			for (let el: Element | null = inner; el && el !== canvas; el = el.parentElement) {
				const style = getComputedStyle(el);
				const effect =
					style.filter !== 'none' ? 'filter' : style.maskImage !== 'none' ? 'mask' : null;
				if (!effect) continue;
				const where = describe(el);
				unload();
				throw new Error(
					`${where} has a CSS ${effect} and holds a <canvas layoutsubtree>; Chromium crashes on that. Move the ${effect} inside the canvas, onto its children, or into the canvas drawing.`
				);
			}
		}
	}

	/** Seek, repaint, draw. With `capture`, returns a PNG data URL (html-in-canvas mode only). */
	async function frame(n: number, capture = false): Promise<FrameResult> {
		const t0 = performance.now();
		// Force a fresh raster of the whole subtree: Chromium otherwise reuses cached raster for
		// transform-animated layers and the pixels depend on seek history.
		const how = options.invalidate ?? 'filters';
		// A filter on the stage would crash Chromium once a block nests a `<canvas layoutsubtree>`
		// (a WebGL canvas sampling its children), so such a stage is re-inserted instead. The
		// re-insert comes before the seek: a nested canvas re-inserted after its own paint is left
		// out of the next paint of the stage's canvas, and the frame would come out without it.
		const reattach = how === 'reattach' || (how === 'filters' && nested.length > 0);
		if (reattach && canvas) canvas.appendChild(stage!);
		// The seek may mount a nested canvas under the previous frame's filter, so the filter is
		// off during the seek and toggled after it. Nothing paints in between.
		if (how === 'filters') stage!.style.filter = '';
		const t = await applyTime(n);
		if (how === 'filters' && nested.length === 0)
			stage!.style.filter = ++seeks % 2 ? 'saturate(1)' : 'contrast(1)';
		await nextPaint();
		const paintMs = performance.now() - t0;
		let image: string | undefined;
		if (ctx && canvas) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawElementImage!(stage!, 0, 0);
			await holdoutPass(ctx);
			if (capture) image = canvas.toDataURL('image/png');
		}
		return { frame: n, t, image, paintMs, mode };
	}

	/**
	 * A holdout insert (`layer: "behind"` in the inserts export): the subject, drawn alone where
	 * the program draws it over the clip, is erased from the captured clip, so the clip's alpha
	 * becomes alpha × (1 − subject alpha) and its colours stay.
	 */
	async function holdoutPass(c: Ctx2DWithElements) {
		const scene = segment;
		if (!scene?.holdout(true)) return;
		try {
			if ((options.invalidate ?? 'filters') === 'filters' && nested.length === 0)
				stage!.style.filter = ++seeks % 2 ? 'saturate(1)' : 'contrast(1)';
			await nextPaint();
			c.globalCompositeOperation = 'destination-out';
			c.drawElementImage!(stage!, 0, 0);
		} finally {
			c.globalCompositeOperation = 'source-over';
			scene.holdout(false);
		}
	}

	function unload() {
		segment?.destroy();
		segment = null;
		if (active) {
			unmount(active.instance);
			active = null;
		}
		canvas?.remove();
		stage?.remove();
		canvas = null;
		ctx = null;
		stage = null;
		nested = [];
	}

	/**
	 * Run the clip's logic at the given frames without painting: collects exceptions (unknown
	 * cues, bad eases, maps going back in time) and wall-clock CSS animations.
	 */
	async function check(
		frames: number[]
	): Promise<{ errors: CheckIssue[]; warnings: CheckIssue[] }> {
		const errors: CheckIssue[] = [];
		const warnings: CheckIssue[] = [];
		const seen = new Set<string>();
		if (stage) stage.style.filter = ''; // a frame's filter would fail a canvas mounted mid-clip
		for (const n of frames) {
			try {
				await applyTime(n);
			} catch (error) {
				const message = (error as Error).message;
				if (!errors.some((e) => e.message === message)) errors.push({ frame: n, message });
				if (!active && !segment) break; // unloaded to keep the page alive
				continue;
			}
			let measured: string[] = [];
			try {
				measured = (await segment?.measure(n)) ?? [];
			} catch (error) {
				const message = (error as Error).message;
				if (!errors.some((e) => e.message === message)) errors.push({ frame: n, message });
			}
			for (const message of [...(segment?.warnings(n) ?? []), ...measured])
				if (!warnings.some((w) => w.message === message)) warnings.push({ frame: n, message });
			// broken math renders nothing and throws nothing: NaN/undefined in styles and SVG geometry
			if (stage && seen.size < 5) {
				for (const bad of findBadValues(stage)) {
					const key = `${bad.path}|${bad.attr}`;
					if (seen.has(key)) continue;
					seen.add(key);
					if (seen.size > 5) break;
					const token = (
						bad.attr === 'd'
							? /NaN|undefined|-?Infinity/
							: /(?<![A-Za-z])(NaN|undefined|-?Infinity)/
					).exec(bad.value);
					errors.push({
						frame: n,
						message: `${token?.[1] ?? token?.[0]} in <${bad.path.split(' > ').pop()} ${bad.attr}> (${bad.path}): ${bad.attr}="${bad.value}"`
					});
				}
			}
		}
		const running = document.getAnimations();
		if (running.length) {
			const where = running
				.slice(0, 3)
				.map((a) => {
					const el = (a.effect as KeyframeEffect | null)?.target as Element | null;
					return el ? describe(el) : 'element';
				})
				.join(', ');
			warnings.push({
				frame: frames[frames.length - 1] ?? 0,
				message: `${running.length} CSS animation(s)/transition(s) run on wall-clock time (${where}); they will not follow seeks. Drive them from clip time instead.`
			});
		}
		return { errors, warnings };
	}

	/** Events the loaded clip's blocks recorded (`clip.event`, `use:motion`), in time order. */
	function events() {
		return active?.controller.clip.events() ?? [];
	}

	return { mode, load, loadSegment, frame, check, unload, events };
}

function describe(el: Element): string {
	// `className` of an SVG element is an SVGAnimatedString, not the class text.
	const cls = el.getAttribute('class');
	return `<${el.tagName.toLowerCase()}${el.id ? ` id="${el.id}"` : ''}${cls ? ` class="${cls}"` : ''}>`;
}
