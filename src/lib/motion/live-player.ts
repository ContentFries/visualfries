import type { Component } from 'svelte';
import { createProgramScene, type ProgramScene } from './program-stage.js';
import { createLiveFootage, type LiveFootage } from './live-footage.js';
import {
	liveSegment,
	resolveLiveManifest,
	type LiveManifest,
	type LiveProgram,
	type LiveRange,
	type LiveSource
} from './live-manifest.js';
import {
	audioCorrection,
	createLiveClock,
	fitStage,
	frameAt,
	nextSource,
	skippedFrames,
	soundLeads
} from './live-sync.js';
import type { ResolvedBrand } from './brand.js';
import type { StageSegment } from './segments.js';
import type { StageFont } from './stage.js';
import type { Animatable } from './keys.js';

export type { LiveManifest, LiveSource, LiveRange, LiveProgram };

export type ProgramPlayerOptions = {
	/** A proxy video per footage source (see `LiveSource`). */
	footage: Record<string, LiveSource>;
	/** Source ranges and subject boxes per footage, as extraction cuts them (see `LiveRange`). */
	boxes?: Record<string, LiveRange[]>;
	/** The program's mixed sound; the clock follows it while it plays. */
	audio?: string | null;
	fonts?: StageFont[];
	/** The project's CSS, scoped to the player's host. */
	css?: string;
	/** Brand tokens, when `createProgramPlayer` gets a program rather than a segment. */
	brand?: ResolvedBrand;
};

export type PlayerFrame = {
	frame: number;
	time: number;
	/** Main-thread milliseconds the scene's seek and draw took. */
	work: number;
	/** Program frames passed over since the frame drawn before (0 while it keeps up). */
	skipped: number;
	perf: number;
};

export type PlayerStats = LiveFootage['stats'] & {
	audioCorrections: number;
	/** The clock minus the sound's own time, sampled about four times a second while playing. */
	audio: { at: number; offset: number }[];
};

export type ProgramPlayer = {
	readonly fps: number;
	readonly frames: number;
	readonly duration: number;
	readonly size: [number, number];
	/** Program seconds now. */
	readonly time: number;
	readonly playing: boolean;
	play(): Promise<void>;
	pause(): void;
	/** Seeks to program second `t`; resolves with the milliseconds until the picture shows it. */
	seek(t: number): Promise<number>;
	/** Calls `fn` for every frame drawn, and once more when playback stops at the end. */
	onFrame(fn: (f: PlayerFrame) => void): () => void;
	/** Draws another revision of the same program on the same proxies, at the same time. */
	update(program: StageSegment | LiveProgram): Promise<void>;
	stats: PlayerStats;
	destroy(): void;
};

type Blocks = Record<string, Component<Record<string, unknown>>>;
type AnimatableMap = Record<string, Animatable | undefined>;

const fontQuery = (f: StageFont) =>
	`${f.style ?? 'normal'} ${String(f.weight ?? 400).split(/\s+/)[0]} 32px ${JSON.stringify(f.family)}`;

/** The fonts on `document.fonts` (shadow roots ignore `@font-face`); removes them on `drop`. */
async function loadFonts(fonts: StageFont[]) {
	const faces = fonts.map(
		(f) =>
			new FontFace(f.family, `url(${JSON.stringify(f.url)})`, {
				weight: String(f.weight ?? 'normal'),
				style: f.style ?? 'normal',
				display: 'block'
			})
	);
	for (const face of faces) document.fonts.add(face);
	await Promise.all(faces.map((face) => face.load().catch(() => {})));
	await Promise.all(fonts.map((f) => document.fonts.load(fontQuery(f)).catch(() => {})));
	return () => faces.forEach((face) => document.fonts.delete(face));
}

/** The host's box: a stage scaled to fit it whole, centred, with the project's CSS. */
function mountStage(host: HTMLElement, seg: StageSegment, css: string) {
	const style = document.createElement('style');
	style.textContent = `#vf-stage{position:relative;overflow:hidden}\n${css}`;
	const frame = document.createElement('div');
	frame.style.cssText = 'position:relative;overflow:hidden;width:100%;height:100%';
	const stage = document.createElement('div');
	stage.id = 'vf-stage';
	const [w, h] = seg.size;
	stage.style.cssText = `position:absolute;left:0;top:0;overflow:hidden;width:${w}px;height:${h}px;transform-origin:0 0;background:${seg.background ?? 'transparent'}`;
	frame.appendChild(stage);
	host.append(style, frame);
	const fit = () => {
		const box = fitStage(host.clientWidth, host.clientHeight, w, h);
		stage.style.transform = `translate(${box.x}px,${box.y}px) scale(${box.scale})`;
		if (!host.clientHeight) frame.style.height = `${box.height}px`;
	};
	fit();
	const resize = new ResizeObserver(fit);
	resize.observe(host);
	return {
		stage,
		remove() {
			resize.disconnect();
			style.remove();
			frame.remove();
		}
	};
}

/**
 * Plays a resolved program in real time in the page: the same scene `render` draws (shots,
 * clips, behind layer, transitions), with time set once per animation frame from one clock and
 * the footage from proxy videos. `program` is a stage segment, or a resolved program the player
 * makes one of with `opts.brand`. The stage keeps the program's size, scaled to fit `host`.
 */
export async function createProgramPlayer(
	host: HTMLElement,
	program: StageSegment | LiveProgram,
	blocks: Blocks,
	animatable: AnimatableMap,
	opts: ProgramPlayerOptions
): Promise<ProgramPlayer> {
	let seg = liveSegment(program, opts.footage, opts.boxes, opts.brand);
	const fps = seg.fps;
	const frames = seg.startFrame + seg.frames;
	const duration = frames / fps;
	const dropFonts = await loadFonts(opts.fonts ?? []);

	const clock = createLiveClock();
	const audio = opts.audio ? new Audio() : null;
	if (audio) {
		audio.crossOrigin = 'anonymous';
		audio.preload = 'auto';
		audio.src = opts.audio!;
	}
	const mounted = mountStage(host, seg, opts.css ?? '');
	const footage = createLiveFootage(opts.footage, fps, clock.at, seg.footageMap, host);
	const stats: PlayerStats = Object.assign(footage.stats, {
		audioCorrections: 0,
		audio: [] as PlayerStats['audio']
	});

	let scene: ProgramScene = createProgramScene(mounted.stage, seg, blocks, animatable, footage);
	await Promise.all(scene.ready);
	await document.fonts.ready;

	const listeners = new Set<(f: PlayerFrame) => void>();
	let shown = -1;
	let sampled = 0;
	let raf = 0;
	let drawing: Promise<void> = Promise.resolve();

	/** While the sound plays, the clock follows it (see `audioCorrection`). */
	function followSound(perf: number) {
		if (!soundLeads(clock.playing, audio)) return;
		const t = clock.at(perf);
		const sound = audio!.currentTime;
		if (perf - sampled > 250) {
			sampled = perf;
			stats.audio.push({ at: t, offset: t - sound });
		}
		const jump = audioCorrection(t, sound);
		if (jump === null) return;
		clock.set(jump, perf);
		stats.audioCorrections++;
	}

	/** At the end the player stops itself on the last frame. */
	function stopAtEnd(perf: number) {
		if (!clock.playing || clock.at(perf) < duration) return false;
		pause();
		clock.set(duration - 1 / fps, perf);
		return true;
	}

	/** Seeks the footage to the next source before the picture cuts to it. */
	function prerollNext(f: number) {
		const next = nextSource(seg.footageMap, f);
		if (!next) return;
		footage.preroll('a', next.source, next.frame);
		if (seg.transitions.length) footage.preroll('b', next.source, next.frame);
	}

	function drawFrame(f: number, t: number, perf: number) {
		const start = performance.now();
		scene.seek(f);
		drawing = scene.draw(f).catch((e) => console.error(e));
		const work = performance.now() - start;
		const skipped = skippedFrames(clock.playing, shown, f);
		shown = f;
		if (clock.playing) prerollNext(f);
		for (const fn of listeners) fn({ frame: f, time: t, work, skipped, perf });
	}

	function render(perf: number) {
		followSound(perf);
		// Listeners hear the end once more, so they see the player stopped.
		const ended = stopAtEnd(perf);
		const t = clock.at(perf);
		const f = frameAt(t, fps, frames);
		if (f !== shown || ended) drawFrame(f, t, perf);
		footage.tick(t, f, clock.playing);
	}

	function loop(perf: number) {
		raf = requestAnimationFrame(loop);
		render(perf);
	}
	raf = requestAnimationFrame(loop);

	/** Starts the sound at `t`; resolves with where it started, or `t` without sound. */
	async function startSound(t: number) {
		if (!audio) return t;
		audio.currentTime = t;
		await audio.play().catch(() => {});
		return audio.paused ? t : audio.currentTime;
	}

	async function play() {
		if (clock.playing) return;
		const at = clock.at(performance.now());
		// From the start again once at the end.
		const t = await startSound(at >= duration - 1 / fps ? 0 : at);
		const now = performance.now();
		clock.set(t, now);
		clock.play(now);
	}

	function pause() {
		clock.pause(performance.now());
		audio?.pause();
	}

	async function seek(t: number) {
		const start = performance.now();
		clock.set(Math.max(0, Math.min(duration - 1 / fps, t)), start);
		if (audio) audio.currentTime = clock.at(start);
		render(start);
		await Promise.all([footage.settled(), drawing]);
		// What the videos now show is painted into the pictures on the next tick, shown after it.
		await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
		return performance.now() - start;
	}

	async function update(next: StageSegment | LiveProgram) {
		const fresh = liveSegment(next, opts.footage, opts.boxes, opts.brand);
		if (fresh.fps !== fps || fresh.startFrame + fresh.frames !== frames)
			throw new Error('update() takes the same program at the same length; mount a new player.');
		const old = scene;
		footage.reset(fresh.footageMap);
		const made = createProgramScene(mounted.stage, fresh, blocks, animatable, footage);
		old.destroy();
		seg = fresh;
		scene = made;
		await Promise.all(made.ready);
		shown = -1;
		render(performance.now());
	}

	return {
		fps,
		frames,
		duration,
		size: seg.size,
		get time() {
			return clock.at(performance.now());
		},
		get playing() {
			return clock.playing;
		},
		play,
		pause,
		seek,
		onFrame(fn) {
			listeners.add(fn);
			return () => listeners.delete(fn);
		},
		update,
		stats,
		destroy() {
			cancelAnimationFrame(raf);
			listeners.clear();
			audio?.pause();
			audio?.removeAttribute('src');
			scene.destroy();
			footage.destroy();
			mounted.remove();
			dropFonts();
		}
	};
}

/**
 * A live preview folder's player (see `LiveManifest`): `base` is the manifest's URL, so the
 * files it names resolve against it. What a preview bundle's `createPlayer` calls.
 */
export function mountLivePreview(
	host: HTMLElement,
	manifest: LiveManifest,
	base: string,
	blocks: Blocks,
	animatable: AnimatableMap
): Promise<ProgramPlayer> {
	const m = resolveLiveManifest(manifest, base);
	return createProgramPlayer(host, m.segment, blocks, animatable, {
		footage: m.footage,
		boxes: m.boxes,
		audio: m.audio,
		fonts: m.fonts,
		css: m.css
	});
}
