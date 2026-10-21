import {
	checkKnown,
	checkNumber,
	frameOnHead,
	numberParam,
	roundRect,
	type FormatClass,
	type Rect,
	type ShotModule
} from './layout.js';

/** Width of the window as a share of the frame width, by format class. */
const SHARE: Record<FormatClass, number> = { landscape: 0.3, square: 0.4, portrait: 0.56 };
/** Width over height of the window, by format class. */
const ASPECT: Record<FormatClass, number> = { landscape: 16 / 9, square: 1, portrait: 1 };
/** Space between the window and the frame edge or the panel, of the frame's shorter side. */
const MARGIN = 0.05;
/** In portrait the window stands this far from the top, or above the bottom band. */
const PORTRAIT_TOP = 0.08;
const PORTRAIT_BOTTOM = 0.3;
/** How much closer the camera goes inside the window, so the face reads at its small size. */
const ZOOM = 1.2;
/** Corner radius as a share of the window's shorter side. */
const RADIUS = 0.08;
/** The ring around the window in pixels per 1080 px of the frame's shorter side. */
const RING = 4;

const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;

/**
 * The speaker in a framed window over the style's surface, with a `panel` slot beside it for a
 * clip (a list, tiles, a screenshot). Landscape and square: the window sits in a corner
 * (`corner`, default bottom right) and the panel takes the full height on the other side.
 * Portrait: the window is centred near the top (`corner: "bottom-…"`: above the bottom band
 * where captions and platform buttons sit) and the panel takes the rest below (or above) it.
 * `size` is the window's width as a share of the frame, `zoom` how much closer the camera goes
 * inside it, `ring` the width of its brand-coloured ring in pixels (0: none).
 */
export const windowShot: ShotModule = {
	name: 'window',
	enter: { seconds: 0.7, ease: 'expo.inOut' },
	layout({ cls, size: [W, H], footage, subject, params }) {
		const corner = (CORNERS as readonly unknown[]).includes(params.corner)
			? (params.corner as (typeof CORNERS)[number])
			: cls === 'portrait'
				? 'top-right'
				: 'bottom-right';
		const top = corner.startsWith('top');
		const left = corner.endsWith('left');
		const short = Math.min(W, H);
		const m = Math.round(short * MARGIN);
		const width = Math.round(W * numberParam(params, 'size', SHARE[cls]));
		const height = Math.round(width / ASPECT[cls]);
		let clip: Rect;
		let panel: Rect;
		let closed: Rect;
		if (cls === 'portrait') {
			const y = top ? Math.round(H * PORTRAIT_TOP) : Math.round(H * (1 - PORTRAIT_BOTTOM)) - height;
			clip = { x: Math.round((W - width) / 2), y, width, height };
			// The panel takes the rest of the frame on the other side of the window.
			panel = top
				? { x: 0, y: y + height + m, width: W, height: H - (y + height + m) }
				: { x: 0, y: 0, width: W, height: y - m };
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
			camera: frameOnHead(clip, footage, subject, numberParam(params, 'zoom', ZOOM)),
			clip,
			radius: Math.round(Math.min(width, height) * RADIUS),
			slots: { panel: roundRect(panel) },
			closed: { panel: roundRect(closed) },
			fill: 'surface',
			ring: numberParam(params, 'ring', Math.round((RING * short) / 1080)),
			lift: 1
		};
	},
	events: ({ morphFrames }) => [{ kind: 'shot', frame: Math.floor(morphFrames / 2) }],
	check: (params) => [
		...checkKnown(params, ['corner', 'size', 'zoom', 'ring']),
		...(params.corner === undefined || (CORNERS as readonly unknown[]).includes(params.corner)
			? []
			: [`"corner" must be one of ${CORNERS.join(', ')} (got ${JSON.stringify(params.corner)}).`]),
		...checkNumber(params, 'size', 0.15, 0.7),
		...checkNumber(params, 'zoom', 1, 3),
		...checkNumber(params, 'ring', 0, 40)
	]
};
