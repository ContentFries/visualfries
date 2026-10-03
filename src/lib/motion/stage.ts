import { flushSync, mount, unmount, type Component } from 'svelte';
import { Clip, MOTION_CONTEXT_KEY, type ClipController } from './runtime.svelte.js';
import type { ResolvedClip } from './resolve.js';
import { seekTimeline } from './seek.js';

export type StageFont = { family: string; url: string; weight?: string | number; style?: string };
export type StageOptions = {
	blocks: Record<string, Component<Record<string, unknown>>>;
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
	let seeks = 0;

	async function load(data: ResolvedClip) {
		try {
			return await mountClip(data);
		} catch (error) {
			// A font or useReady failure must not leave a half-loaded clip on the page.
			unload();
			throw error;
		}
	}

	async function mountClip(data: ResolvedClip) {
		unload();
		const [width, height] = data.size;
		stage = document.createElement('div');
		stage.id = 'vf-stage';
		stage.style.width = `${width}px`;
		stage.style.height = `${height}px`;
		stage.style.background = data.background ?? 'transparent';
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

		// Fonts first: blocks and engines measure text when they mount.
		const query = (f: StageFont) =>
			`${f.style ?? 'normal'} ${String(f.weight ?? 400).split(/\s+/)[0]} 32px ${JSON.stringify(f.family)}`;
		await Promise.all((options.fonts ?? []).map((f) => document.fonts.load(query(f))));
		const missing = (options.fonts ?? []).filter((f) => !document.fonts.check(query(f)));
		if (missing.length)
			throw new Error(`Fonts failed to load: ${missing.map((f) => f.family).join(', ')}`);

		const Block = options.blocks[data.block];
		if (!Block) throw new Error(`Block "${data.block}" is not in the bundle.`);
		const root = document.createElement('div');
		root.className = 'vf-clip';
		root.style.cssText = 'position:absolute;inset:0';
		stage.appendChild(root);
		const controller: ClipController = {
			clip: new Clip(data),
			root,
			timelines: [],
			frameFns: [],
			ready: []
		};
		const instance = mount(Block, {
			target: root,
			props: { ...data.props },
			context: new Map([[MOTION_CONTEXT_KEY, controller]])
		});
		flushSync();
		active = { controller, instance, data };
		await Promise.all(controller.ready);
		await document.fonts.ready;
		return { mode, frames: data.frames, fps: data.fps };
	}

	/** Sets clip time and runs the clip's logic; resolves once every `useFrame` promise settles. */
	async function applyTime(frame: number) {
		if (!active) throw new Error('No clip loaded.');
		const { controller, data } = active;
		const t = frame / data.fps;
		controller.clip.t = t;
		controller.clip.frame = frame;
		flushSync();
		for (const tl of controller.timelines) seekTimeline(tl, t);
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

	/** Seek, repaint, draw. With `capture`, returns a PNG data URL (html-in-canvas mode only). */
	async function frame(n: number, capture = false): Promise<FrameResult> {
		const t0 = performance.now();
		const t = await applyTime(n);
		// Force a fresh raster of the whole subtree: Chromium otherwise reuses cached raster for
		// transform-animated layers and the pixels depend on seek history.
		const how = options.invalidate ?? 'filters';
		if (how === 'filters') stage!.style.filter = ++seeks % 2 ? 'saturate(1)' : 'contrast(1)';
		else if (how === 'reattach' && canvas) canvas.appendChild(stage!);
		await nextPaint();
		const paintMs = performance.now() - t0;
		let image: string | undefined;
		if (ctx && canvas) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawElementImage!(stage!, 0, 0);
			if (capture) image = canvas.toDataURL('image/png');
		}
		return { frame: n, t, image, paintMs, mode };
	}

	function unload() {
		if (active) {
			unmount(active.instance);
			active = null;
		}
		canvas?.remove();
		stage?.remove();
		canvas = null;
		ctx = null;
		stage = null;
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
		for (const n of frames) {
			try {
				await applyTime(n);
			} catch (error) {
				const message = (error as Error).message;
				if (!errors.some((e) => e.message === message)) errors.push({ frame: n, message });
			}
		}
		const running = document.getAnimations();
		if (running.length) {
			const where = running
				.slice(0, 3)
				.map((a) => {
					const el = (a.effect as KeyframeEffect | null)?.target as Element | null;
					return el
						? `<${el.tagName.toLowerCase()}${el.className ? ` class="${el.className}"` : ''}>`
						: 'element';
				})
				.join(', ');
			warnings.push({
				frame: frames[frames.length - 1] ?? 0,
				message: `${running.length} CSS animation(s)/transition(s) run on wall-clock time (${where}); they will not follow seeks. Drive them from clip time instead.`
			});
		}
		return { errors, warnings };
	}

	return { mode, load, frame, check, unload };
}
