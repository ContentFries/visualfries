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

/** Share of the frame the camera keeps, by format class (width side by side, height stacked). */
const CAMERA_SHARE: Record<FormatClass, number> = { landscape: 1 / 3, square: 0.4, portrait: 0.45 };

/**
 * The camera narrows into a strip while a `panel` slot opens beside it, both moving together.
 * Landscape and square: camera left, panel right (`side: "right"` swaps them). Portrait: camera
 * on top, panel below (`side: "right"` puts the camera at the bottom). `size` is the camera's
 * share of the frame. The surface fill shows under the panel.
 */
export const strip: ShotModule = {
	name: 'strip',
	enter: { seconds: 0.7, ease: 'expo.inOut' },
	layout({ cls, size: [W, H], footage, subject, params }) {
		const first = params.side !== 'right';
		const share = numberParam(params, 'size', CAMERA_SHARE[cls]);
		let clip: Rect;
		let panel: Rect;
		let closed: Rect;
		if (cls === 'portrait') {
			const cam = Math.round(H * share);
			const rest = H - cam;
			clip = { x: 0, y: first ? 0 : rest, width: W, height: cam };
			panel = { x: 0, y: first ? cam : 0, width: W, height: rest };
			// The panel slides in from the bottom (or top) edge.
			closed = { ...panel, y: first ? H : -rest };
		} else {
			const cam = Math.round(W * share);
			const rest = W - cam;
			clip = { x: first ? 0 : rest, y: 0, width: cam, height: H };
			panel = { x: first ? cam : 0, y: 0, width: rest, height: H };
			closed = { ...panel, x: first ? W : -rest };
		}
		clip = roundRect(clip);
		return {
			camera: frameOnHead(clip, footage, subject),
			clip,
			radius: 0,
			slots: { panel: roundRect(panel) },
			closed: { panel: roundRect(closed) },
			fill: 'surface'
		};
	},
	events: ({ morphFrames }) => [{ kind: 'shot', frame: Math.floor(morphFrames / 2) }],
	check: (params) => [
		...checkKnown(params, ['side', 'size']),
		...(params.side === undefined || params.side === 'left' || params.side === 'right'
			? []
			: [`"side" must be "left" or "right" (got ${JSON.stringify(params.side)}).`]),
		...checkNumber(params, 'size', 0.2, 0.8)
	]
};
