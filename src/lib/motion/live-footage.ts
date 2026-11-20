import type { FootagePictures } from './program-stage.js';
import type { FootageLayer } from './footage.js';
import type { FootageMap } from './footage-map.js';
import type { LiveSource } from './live-manifest.js';
import {
	alignTo,
	createWaits,
	drawnAlready,
	followClock,
	frameDrift,
	heldAt,
	offsetMoved,
	pictureCut,
	plateDraw,
	proxySettled,
	recentDrift,
	smoothDrift,
	type VideoStep,
	type VideoWant
} from './live-sync.js';

type SideName = 'a' | 'b';
/** A side's video, or `g`: the one `picture` seeks for frames no video on screen shows. */
type VideoSide = SideName | 'g';
type Look = { dim: number; blur: number; edge?: number };

type Pic = {
	el: HTMLCanvasElement;
	side: SideName;
	layer: 'plate' | 'subject';
	want: { source: string; frame: number } | null;
	look: Look;
	/** Video frame counter, video and look last drawn (see `Player.seq`). */
	drawn: { seq: number; video: HTMLVideoElement | null; look: string };
	paint(video: HTMLVideoElement, source: LiveSource, look: Look): void;
};

type Player = {
	video: HTMLVideoElement;
	source: string;
	side: VideoSide;
	/** The source frame `picture` last asked of it (side `g`); null: none. */
	asked: number | null;
	live: LiveSource;
	/** Counts presented video frames (requestVideoFrameCallback), so pictures redraw only then. */
	seq: number;
	/** What the scene wanted of it at the last tick; null while it is off screen. */
	want: VideoWant | null;
	/** Presented frames ahead of the clock, smoothed (see `presentedDrift`); null: no samples. */
	drift: number | null;
	/** `performance.now()` of the last drift sample. */
	sampled: number;
};

export type DriftSample = { at: number; drift: number; source: string };

export type LiveFootage = FootagePictures & {
	/**
	 * Keeps the videos on the clock and paints the pictures shown since the last tick: `t` is the
	 * program time in seconds, `frame` the program frame drawn.
	 */
	tick(t: number, frame: number, playing: boolean): void;
	/** Seeks `side`'s video of `source` to `frame` while another source is on screen. */
	preroll(side: SideName, source: string, frame: number): void;
	/**
	 * An explicit seek to program time `t`: seeks every video on screen to where it should be at
	 * once, playing too (`tick` would only let it catch up).
	 */
	align(t: number): void;
	/**
	 * Resolves once every video on screen shows the frame it should (after a seek), or at once
	 * after `destroy`; rejects when one fails to load.
	 */
	settled(): Promise<void>;
	/**
	 * Source frame `frame` of `source` as a picture of its own, for blocks (`<Footage>`,
	 * `<Subject>`, `clip.picture()`): `plate`, or `subject` with the matte as its alpha.
	 */
	picture(source: string, frame: number, layer: FootageLayer): Promise<HTMLCanvasElement>;
	/** Forgets the pictures (a new scene makes its own); the videos stay loaded. */
	reset(map: FootageMap | null): void;
	stats: { resyncs: number; drift: DriftSample[]; stalls: number };
	destroy(): void;
};

const VERT = `attribute vec2 p;varying vec2 uv;
void main(){uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);gl_Position=vec4(p,0.,1.);}`;
/**
 * The subject: picture × matte, premultiplied, its soft edge dimmed with the room
 * (colour × (1 − dim + dim × alpha^edge)), as the scene's SVG filter draws it.
 */
const FRAG = `precision mediump float;
uniform sampler2D tex;uniform float pk,dim,edge;varying vec2 uv;
void main(){
	vec3 c=texture2D(tex,pk>.5?vec2(uv.x*.5,uv.y):uv).rgb;
	float m=pk>.5?texture2D(tex,vec2(.5+uv.x*.5,uv.y)).r:1.;
	m=clamp((m-.02)/.96,0.,1.);
	c*=1.-dim+dim*pow(m,edge);
	gl_FragColor=vec4(c*m,m);
}`;

/** A WebGL canvas that draws the subject of a packed proxy frame with its look. */
function subjectPainter(el: HTMLCanvasElement) {
	const gl = el.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
	if (!gl) throw new Error('The live player needs WebGL.');
	const shader = (type: number, src: string) => {
		const s = gl.createShader(type)!;
		gl.shaderSource(s, src);
		gl.compileShader(s);
		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)!);
		return s;
	};
	const prog = gl.createProgram()!;
	gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
	gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
	gl.linkProgram(prog);
	gl.useProgram(prog);
	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
	const loc = gl.getAttribLocation(prog, 'p');
	gl.enableVertexAttribArray(loc);
	gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
	gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
	for (const [k, v] of [
		[gl.TEXTURE_MIN_FILTER, gl.LINEAR],
		[gl.TEXTURE_MAG_FILTER, gl.LINEAR],
		[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
		[gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]
	])
		gl.texParameteri(gl.TEXTURE_2D, k, v);
	const [pk, dim, edge] = ['pk', 'dim', 'edge'].map((name) => gl.getUniformLocation(prog, name));
	return (video: HTMLVideoElement, source: LiveSource, look: Look) => {
		const [w, h] = source.size;
		if (el.width !== w || el.height !== h) [el.width, el.height] = [w, h];
		gl.viewport(0, 0, w, h);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
		gl.uniform1f(pk, source.packed ? 1 : 0);
		gl.uniform1f(dim, look.dim);
		gl.uniform1f(edge, look.edge ?? 1);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	};
}

/** The plate on a 2D canvas, drawn as `plateDraw` says: cheap without a GPU too. */
function platePainter(el: HTMLCanvasElement) {
	let ctx = el.getContext('2d', { alpha: false })!;
	return (video: HTMLVideoElement, source: LiveSource, look: Look) => {
		const draw = plateDraw(source.size, el.style.height, look, video.videoWidth, source.packed);
		if (el.width !== draw.width || el.height !== draw.height) {
			[el.width, el.height] = [draw.width, draw.height];
			ctx = el.getContext('2d', { alpha: false })!;
		}
		ctx.filter = draw.filter;
		ctx.drawImage(video, 0, 0, draw.sourceWidth, video.videoHeight, 0, 0, draw.width, draw.height);
	};
}

const playVideo = (video: HTMLVideoElement) => void video.play().catch(() => {});

const videoState = (video: HTMLVideoElement) => ({
	seeking: video.seeking,
	readyState: video.readyState,
	currentTime: video.currentTime,
	failed: !!video.error
});

const loadError = (p: Player) =>
	new Error(
		`The live proxy of footage "${p.source}" failed to load: ${p.video.error?.message || `media error ${p.video.error?.code}`}.`
	);

/** A copy of a video frame (`sourceWidth` of it) at `size`, so later frames cannot change it. */
function snapshot(
	image: CanvasImageSource,
	sourceWidth: number,
	sourceHeight: number,
	size: [number, number]
) {
	const out = document.createElement('canvas');
	[out.width, out.height] = size;
	out.getContext('2d')!.drawImage(image, 0, 0, sourceWidth, sourceHeight, 0, 0, ...size);
	return out;
}

type Steps = {
	[K in VideoStep['kind']]: (
		p: Player,
		step: Extract<VideoStep, { kind: K }>,
		stats: LiveFootage['stats']
	) => void;
};

/** What each step of `followClock` does to a player's video. */
const STEPS: Steps = {
	none() {},
	pause({ video }, step) {
		video.pause();
		if (step.seek !== null) video.currentTime = step.seek;
	},
	seek(p, step, stats) {
		p.video.currentTime = step.time;
		p.drift = null;
		if (step.resync) {
			stats.resyncs++;
			p.video.playbackRate = 1;
		}
		if (step.play) playVideo(p.video);
	},
	play: ({ video }) => playVideo(video),
	rate({ video }, step) {
		if (video.playbackRate !== step.rate) video.playbackRate = step.rate;
	}
};

const apply = (p: Player, step: VideoStep, stats: LiveFootage['stats']) =>
	(STEPS[step.kind] as (p: Player, step: VideoStep, stats: LiveFootage['stats']) => void)(
		p,
		step,
		stats
	);

/** Drift samples kept for `stats` (about ten minutes at 25 fps). */
const MAX_SAMPLES = 15_000;

/**
 * Footage pictures for `createProgramScene` that play proxy videos instead of loading extracted
 * frames: one video per side and source, kept on the program clock (`tick`), drawn into canvases
 * the scene places, turns and filters like its `<img>` pictures. The subject comes from the
 * packed matte through WebGL. The videos sit hidden in `parent`.
 */
export function createLiveFootage(
	sources: Record<string, LiveSource>,
	fps: number,
	clockAt: (perf: number) => number,
	map: FootageMap | null,
	parent: HTMLElement
): LiveFootage {
	const holder = document.createElement('div');
	holder.style.cssText =
		'position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none';
	parent.appendChild(holder);
	const players = new Map<string, Player>();
	let pics = new Map<HTMLElement, Pic>();
	const stats = { resyncs: 0, drift: [] as DriftSample[], stalls: 0 };
	let playing = false;
	const waits = createWaits(requestAnimationFrame, cancelAnimationFrame, () => performance.now());
	/** Draws the subject of a packed frame for `picture` (made on first use). */
	let matte: { el: HTMLCanvasElement; paint: Pic['paint'] } | null = null;

	function player(side: VideoSide, source: string): Player {
		const key = `${side}:${source}`;
		const p = players.get(key);
		if (p) return p;
		const live = sources[source];
		if (!live) throw new Error(`No live proxy for footage "${source}".`);
		const video = document.createElement('video');
		video.crossOrigin = 'anonymous';
		video.muted = true;
		video.playsInline = true;
		video.preload = 'auto';
		video.src = live.url;
		holder.appendChild(video);
		const made: Player = {
			video,
			source,
			side,
			live,
			asked: null,
			seq: 0,
			want: null,
			drift: null,
			sampled: 0
		};
		video.addEventListener('waiting', () => playing && made.want && stats.stalls++);
		const onFrame = (now: number, meta: VideoFrameCallbackMetadata) => {
			made.seq++;
			const t = clockAt(meta.expectedDisplayTime);
			const sample = frameDrift(made.want, playing, video.seeking, meta.mediaTime, t, fps);
			if (sample !== null) measured(made, sample, now, t);
			video.requestVideoFrameCallback(onFrame);
		};
		video.requestVideoFrameCallback(onFrame);
		players.set(key, made);
		return made;
	}

	/** A drift sample of `p` at `now` (ms), `t` the clock when its frame shows. */
	function measured(p: Player, sample: number, now: number, t: number) {
		p.drift = smoothDrift(recentDrift(p.drift, p.sampled, now), sample);
		p.sampled = now;
		if (stats.drift.length < MAX_SAMPLES)
			stats.drift.push({ at: t, drift: sample, source: p.source });
	}

	const visible = (pic: Pic) => !!pic.want && pic.el.style.display !== 'none';

	/** What the scene wants of each player at program frame `frame`. */
	function wants(frame: number) {
		const wanted = new Map<Player, VideoWant>();
		for (const pic of [...pics.values()].filter(visible)) {
			const { source, frame: srcFrame } = pic.want!;
			const held = heldAt(map, source, frame);
			wanted.set(player(pic.side, source), { frame: srcFrame, programFrame: frame, held });
		}
		return wanted;
	}

	/** Keeps one player on the clock at `t`, or pauses it when nothing on screen wants it. */
	function steer(p: Player, want: VideoWant | null, t: number, now: number) {
		if (offsetMoved(p.want, want)) p.drift = null;
		p.want = want;
		const { video } = p;
		if (!want) return void (video.paused || video.pause());
		const drift = recentDrift(p.drift, p.sampled, now);
		const state = {
			paused: video.paused,
			seeking: video.seeking,
			currentTime: video.currentTime,
			drift
		};
		apply(p, followClock(state, want, t, fps, playing), stats);
	}

	function follow(t: number, frame: number) {
		const wanted = wants(frame);
		const now = performance.now();
		for (const p of players.values()) steer(p, wanted.get(p) ?? null, t, now);
	}

	function paintPicture(pic: Pic) {
		const p = player(pic.side, pic.want!.source);
		if (p.video.readyState < 2) return;
		const look = `${pic.look.dim} ${pic.look.blur} ${pic.look.edge} ${pic.el.style.height}`;
		if (drawnAlready(pic.drawn, p.seq, p.video, look)) return;
		pic.paint(p.video, p.live, pic.look);
		pic.drawn = { seq: p.seq, video: p.video, look };
	}

	const paint = () => [...pics.values()].filter(visible).forEach(paintPicture);

	/**
	 * A video of `source` that shows source frame `frame`: one on screen, else side `g` seeked to
	 * it. A later ask for another frame of `g` ends the wait (its asker draws a newer frame).
	 */
	async function videoAt(source: string, frame: number): Promise<Player> {
		const time = (frame + 0.5) / fps;
		const want = { frame, programFrame: 0, held: true };
		const shows = (p: Player) => proxySettled(videoState(p.video), want, 0, fps, false);
		const shown = ['a', 'b'].map((side) => players.get(`${side}:${source}`));
		const ready = shown.find((p) => p?.want && shows(p) === 'ready');
		if (ready) return ready;
		const p = player('g', source);
		p.asked = frame;
		if (Math.abs(p.video.currentTime - time) * fps > 0.5) p.video.currentTime = time;
		await waits.until(() => {
			const now = shows(p);
			return now === 'failed' ? loadError(p) : now === 'ready' || p.asked !== frame;
		});
		return p;
	}

	function makeMatte() {
		const el = document.createElement('canvas');
		return { el, paint: subjectPainter(el) };
	}

	async function picture(source: string, frame: number, layer: FootageLayer) {
		const cut = pictureCut(source, layer, sources[source]?.packed ?? false);
		const { video, live } = await videoAt(source, frame);
		if (cut === 'plate') {
			const width = plateDraw(live.size, '', { dim: 0, blur: 0 }, video.videoWidth, live.packed);
			return snapshot(video, width.sourceWidth, video.videoHeight, live.size);
		}
		matte ??= makeMatte();
		matte.paint(video, live, { dim: 0, blur: 0 });
		return snapshot(matte.el, live.size[0], live.size[1], live.size);
	}

	return {
		stats,
		live: true,
		create(layer, side) {
			const el = document.createElement('canvas');
			[el.width, el.height] = [2, 2];
			const pic: Pic = {
				el,
				side,
				layer,
				want: null,
				look: { dim: 0, blur: 0 },
				drawn: { seq: -1, video: null, look: '' },
				paint: layer === 'subject' ? subjectPainter(el) : platePainter(el)
			};
			pics.set(el, pic);
			return el;
		},
		show(el, source, _frames, frame, _layer, look) {
			const pic = pics.get(el)!;
			el.style.display = '';
			pic.want = { source, frame };
			// Motion blur is left out of the preview (see `FootagePictures.live`).
			pic.look = look ?? { dim: 0, blur: 0 };
			return null;
		},
		tick(t, frame, isPlaying) {
			playing = isPlaying;
			follow(t, frame);
			paint();
		},
		preroll(side, source, frame) {
			const p = player(side, source);
			if (p.want || p.video.seeking) return;
			const target = (frame + 0.02) / fps;
			if (Math.abs(p.video.currentTime - target) > 0.5 / fps) p.video.currentTime = target;
		},
		align(t) {
			for (const p of players.values()) {
				if (!p.want) continue;
				const time = alignTo(p.video, p.want, t, fps, playing);
				if (time === null) continue;
				p.video.currentTime = time;
				p.video.playbackRate = 1;
				p.drift = null;
			}
		},
		async settled() {
			const active = [...players.values()].filter((p) => p.want);
			await Promise.all(
				active.map((p) =>
					waits.until(() => {
						const now = proxySettled(
							videoState(p.video),
							p.want,
							clockAt(performance.now()),
							fps,
							playing
						);
						return now === 'failed' ? loadError(p) : now === 'ready';
					})
				)
			);
		},
		picture,
		reset(next) {
			pics = new Map();
			map = next;
		},
		destroy() {
			waits.end();
			for (const p of players.values()) {
				p.video.pause();
				p.video.removeAttribute('src');
				p.video.load();
			}
			holder.remove();
		}
	};
}
