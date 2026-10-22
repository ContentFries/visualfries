import {
	checkHeadroom,
	checkKnown,
	checkNumber,
	frameOnHead,
	headFraming,
	numberParam,
	roundRect,
	type FormatClass,
	type Rect,
	type ShotModule
} from './layout.js';

/** Width of a window of the default `ASPECT` as a share of the frame width, by format class. */
const SHARE: Record<FormatClass, number> = { landscape: 0.3, square: 0.4, portrait: 0.44 };
/** Width over height of the window, by format class. */
const ASPECT: Record<FormatClass, number> = { landscape: 16 / 9, square: 1, portrait: 1 };
/** The widest and the tallest window `aspect` takes, as width over height. */
const ASPECT_RANGE = [0.5, 2.5];
/** Space between the window and the frame edge or the panel, of the frame's shorter side. */
const MARGIN = 0.05;
/**
 * In portrait, window and panel stay inside the format's safe insets (platform buttons, the
 * caption band); without them, inside these shares of the frame height (the all-platform zone).
 */
const PORTRAIT_TOP = 0.15;
const PORTRAIT_BOTTOM = 0.35;
/** How much closer the camera goes inside the window, so the face reads at its small size. */
const ZOOM = 1.2;
/** Corner radius as a share of the window's shorter side. */
const RADIUS = 0.08;
/** The ring around the window in pixels at 1080 px of the frame's shorter side. */
const RING = 4;

const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

/**
 * Width over height from an `aspect` param: `"4:5"`, `"16:9"`, or a number; null for anything
 * else (the check reports it).
 */
export function aspectParam(v: unknown): number | null {
	if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null;
	if (typeof v !== 'string') return null;
	const m = /^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/.exec(v);
	if (!m || !Number(m[1]) || !Number(m[2])) return null;
	return Number(m[1]) / Number(m[2]);
}

/**
 * The speaker in a framed window over the style's surface, with a `panel` slot beside it for a
 * clip (a list, tiles, a screenshot). Landscape and square: the window sits in a corner
 * (`corner`, default bottom right) and the panel takes the full height on the other side.
 * Portrait: the window is centred at the top of the safe area and the panel takes the rest of
 * it below (`corner: "bottom-…"`: the window at the bottom of the safe area, just above the
 * caption band, and the panel above it); nothing goes under the platform's buttons or the
 * caption band. Landscape and square keep their own margins: their players overlay no lasting
 * UI on the corners. `size` is the window's width as a share of the frame, `zoom` how much
 * closer the camera goes inside it, `ring` the width of its brand-coloured ring in pixels at
 * 1080 px of the frame's shorter side (0: none), so it scales with the frame like `blur`.
 * `aspect` is the window's width over height (`"4:5"`, `"1:1"`, `"16:9"` or a number; default
 * 16:9 in landscape, 1:1 in square and portrait); without `size` a window of another aspect
 * keeps the default window's area, so `"4:5"` gives a close selfie's head more height without a
 * bigger window. `headroom` keeps the whole head in the window (see `frameOnHead`).
 */
export const windowShot: ShotModule = {
	name: 'window',
	enter: { seconds: 0.7, ease: 'expo.inOut' },
	layout(input) {
		const {
			cls,
			size: [W, H],
			footage,
			subject,
			params,
			safe
		} = input;
		const corner = (CORNERS as readonly unknown[]).includes(params.corner)
			? (params.corner as (typeof CORNERS)[number])
			: cls === 'portrait'
				? 'top-right'
				: 'bottom-right';
		const top = corner.startsWith('top');
		const left = corner.endsWith('left');
		const short = Math.min(W, H);
		const m = Math.round(short * MARGIN);
		const aspect = aspectParam(params.aspect) ?? ASPECT[cls];
		// Without `size` a window of another aspect keeps the default window's area.
		const share = numberParam(params, 'size', SHARE[cls] * Math.sqrt(aspect / ASPECT[cls]));
		const width = Math.round(W * share);
		const height = Math.round(width / aspect);
		let clip: Rect;
		let panel: Rect;
		let closed: Rect;
		if (cls === 'portrait') {
			const high = Math.round(safe?.top ?? H * PORTRAIT_TOP);
			const low = H - Math.round(safe?.bottom ?? H * PORTRAIT_BOTTOM);
			const y = top ? high : low - height;
			clip = { x: Math.round((W - width) / 2), y, width, height };
			// The panel takes the rest of the safe area on the other side of the window.
			panel = top
				? { x: 0, y: y + height + m, width: W, height: low - (y + height + m) }
				: { x: 0, y: high, width: W, height: y - m - high };
			closed = { ...panel, y: top ? H : -panel.height };
		} else {
			const x = left ? m : W - m - width;
			clip = { x, y: top ? m : H - m - height, width, height };
			const rest = W - width - 2 * m;
			panel = { x: left ? W - rest : 0, y: 0, width: rest, height: H };
			// It slides in from the frame edge it sits against.
			closed = { ...panel, x: left ? W : -rest };
		}
		clip = roundRect(clip);
		return {
			camera: frameOnHead(
				clip,
				footage,
				subject,
				numberParam(params, 'zoom', ZOOM),
				headFraming(input)
			),
			clip,
			radius: Math.round(Math.min(width, height) * RADIUS),
			slots: { panel: roundRect(panel) },
			closed: { panel: roundRect(closed) },
			fill: 'surface',
			ring: Math.round(((numberParam(params, 'ring', RING) * short) / 1080) * 100) / 100,
			lift: 1
		};
	},
	// Nothing moves on the program's first frame.
	events: ({ prev, morphFrames }) =>
		prev === null ? [] : [{ kind: 'shot', frame: Math.floor(morphFrames / 2) }],
	check: (params) => [
		...checkKnown(params, ['corner', 'size', 'aspect', 'zoom', 'ring', 'headroom']),
		...(params.corner === undefined || (CORNERS as readonly unknown[]).includes(params.corner)
			? []
			: [`"corner" must be one of ${CORNERS.join(', ')} (got ${JSON.stringify(params.corner)}).`]),
		...checkNumber(params, 'size', 0.15, 0.7),
		...checkNumber(params, 'zoom', 1, 3),
		...checkNumber(params, 'ring', 0, 40),
		...checkAspect(params.aspect),
		...checkHeadroom(params)
	]
};

function checkAspect(v: unknown): string[] {
	if (v === undefined) return [];
	const a = aspectParam(v);
	return a !== null && a >= ASPECT_RANGE[0] && a <= ASPECT_RANGE[1]
		? []
		: [
				`"aspect" must be width:height like "4:5", "1:1" or "16:9", or a number (width over height), from ${ASPECT_RANGE[0]} to ${ASPECT_RANGE[1]} (got ${JSON.stringify(v)}).`
			];
}
