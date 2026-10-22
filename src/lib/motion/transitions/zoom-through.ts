import { easeOf } from '../ease.js';
import { checkKnown, checkNumber, numberParam } from '../shots/layout.js';
import {
	checkColor,
	checkPoint,
	isColor,
	isSolid,
	originOf,
	pointAt,
	px,
	ramp,
	smooth,
	type Point
} from './common.js';
import type { TransitionModule, TransitionSides } from './contract.js';

/**
 * Zoom-through: the camera rushes into the outgoing picture, toward a point (the eyes by
 * default), and comes out of the incoming one as it settles back to full frame; a zoom blur
 * streaks both while they move fast and a soft flash covers the change halfway.
 *
 * Both sides only ever scale up about a point inside the frame, so they always cover it: no
 * corner of the stage shows.
 *
 * The zoom blur stays within the cost of the push's blur: the picture is blurred along x and
 * along y, and a mask centred on the point mixes them in, sharp at the point and more blurred
 * further out, along x where the streaks run sideways and along y where they run up or down. A
 * solid side is blurred inside its own box (its edges keep their colour: no dark fringe).
 *
 * Params: `at` ("face", "center" or [x, y] in fractions of the frame), `zoom` (scale reached at
 * the change, default 2.4), `blur` (streak length in percent of the distance to the point,
 * default 18; 0: none), `flash` (peak opacity of the flash, default 0.25; 0: none) and `color`
 * (the flash colour, default white).
 */

/** The picture changes halfway. */
const MID = 0.5;
/** Around the change both sides show for a short crossfade, over this much progress each way. */
const FADE = 0.035;
/** The blur is not drawn below this standard deviation in pixels, nor above `SIGMA_MAX`. */
const BLUR_MIN = 0.4;
const SIGMA_MAX = 60;
/** Share of the blur across a streak. */
const ACROSS = 0.25;
/** The mask: a square of `MAP` texels centred on the point. */
const MAP = 64;

const rush = easeOf('power3.in');
const settle = easeOf('expo.out');
const SIDES = ['out', 'in'] as const;
const filterId = (overlay: HTMLElement, side: 'out' | 'in', solid: boolean) =>
	`${overlay.id}-zoom-${side}${solid ? '-solid' : ''}`;

/**
 * The blur mask as a `MAP`² 24-bit BMP spanning the square around the point: red is how much of
 * the sideways blur shows, green how much of the up-and-down one. Together they rise from 0 near
 * the centre to 1 at the square's edge; red takes the share cos² of the angle, green sin².
 */
export function zoomMask(): string {
	const row = MAP * 3;
	const data = 54 + row * MAP;
	const bytes = new Uint8Array(data);
	const view = new DataView(bytes.buffer);
	bytes[0] = 0x42;
	bytes[1] = 0x4d;
	view.setUint32(2, data, true);
	view.setUint32(10, 54, true);
	view.setUint32(14, 40, true);
	view.setInt32(18, MAP, true);
	view.setInt32(22, MAP, true);
	view.setUint16(26, 1, true);
	view.setUint16(28, 24, true);
	view.setUint32(34, row * MAP, true);
	for (let y = 0; y < MAP; y++)
		for (let x = 0; x < MAP; x++) {
			const u = ((x + 0.5) / MAP) * 2 - 1;
			const v = ((y + 0.5) / MAP) * 2 - 1;
			const r2 = u * u + v * v;
			const rise = smooth(ramp(Math.sqrt(r2), 0.08, 0.9));
			// Rows are stored bottom up, pixels as blue, green, red.
			const at = 54 + (MAP - 1 - y) * row + x * 3;
			bytes[at + 1] = Math.round(255 * rise * (r2 ? (v * v) / r2 : 0.5));
			bytes[at + 2] = Math.round(255 * rise * (r2 ? (u * u) / r2 : 0.5));
		}
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return `data:image/bmp;base64,${btoa(binary)}`;
}

let mask: string | null = null;

/**
 * Builds a zoom-blur filter: the picture blurred along x where the mask is red, along y where it
 * is green, sharp where it is black. A solid element keeps an opaque box.
 */
function zoomFilter(ns: string, id: string, solid: boolean): SVGFilterElement {
	const el = (name: string, attrs: Record<string, string>) => {
		const node = document.createElementNS(ns, name);
		for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
		return node;
	};
	const filter = el('filter', {
		id,
		x: '0',
		y: '0',
		width: '100%',
		height: '100%',
		'color-interpolation-filters': 'sRGB'
	}) as SVGFilterElement;
	mask ??= zoomMask();
	const add = (name: string, attrs: Record<string, string>) => filter.appendChild(el(name, attrs));
	add('feImage', { href: mask, preserveAspectRatio: 'none', result: 'mask', 'data-mask': '' });
	// The mask's channels as alpha: red, green, and what is left for the sharp picture.
	const alpha = (row: string, result: string) =>
		add('feColorMatrix', {
			in: 'mask',
			type: 'matrix',
			values: `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${row}`,
			result
		});
	alpha('1 0 0 0 0', 'wx');
	alpha('0 1 0 0 0', 'wy');
	alpha('-1 -1 0 0 1', 'w0');
	add('feGaussianBlur', {
		in: 'SourceGraphic',
		stdDeviation: '0 0',
		result: 'bx',
		'data-axis': 'x'
	});
	add('feGaussianBlur', {
		in: 'SourceGraphic',
		stdDeviation: '0 0',
		result: 'by',
		'data-axis': 'y'
	});
	add('feComposite', { in: 'bx', in2: 'wx', operator: 'in', result: 'px' });
	add('feComposite', { in: 'by', in2: 'wy', operator: 'in', result: 'py' });
	add('feComposite', { in: 'SourceGraphic', in2: 'w0', operator: 'in', result: 'p0' });
	add('feComposite', {
		in: 'px',
		in2: 'py',
		operator: 'arithmetic',
		k2: '1',
		k3: '1',
		result: 'pxy'
	});
	add('feComposite', { in: 'pxy', in2: 'p0', operator: 'arithmetic', k2: '1', k3: '1' });
	if (solid) {
		// Colours come out averaged over the box alone (alpha is divided out); only the alpha
		// the edge lost is put back.
		const opaque = el('feComponentTransfer', {});
		// Any alpha at all becomes opaque: at a corner it is the product of two blurred edges, far
		// below a half.
		opaque.appendChild(el('feFuncA', { type: 'linear', slope: '255', intercept: '0' }));
		filter.appendChild(opaque);
	}
	return filter;
}

/** Points the filters of `side` at `center` (element pixels), blurring by `sigma` pixels. */
function aim(overlay: HTMLElement, side: 'out' | 'in', center: Point, sigma: number, half: number) {
	for (const solid of [false, true]) {
		const filter = overlay.querySelector(`#${filterId(overlay, side, solid)}`);
		if (!filter) continue;
		const image = filter.querySelector('[data-mask]')!;
		image.setAttribute('x', String(px(center.x - half)));
		image.setAttribute('y', String(px(center.y - half)));
		image.setAttribute('width', String(2 * half));
		image.setAttribute('height', String(2 * half));
		// Mostly along the streak, a little across it: sharp edges (text) smear, never comb.
		const along = sigma.toFixed(1);
		const across = (sigma * ACROSS).toFixed(1);
		for (const blur of filter.querySelectorAll('[data-axis]'))
			blur.setAttribute(
				'stdDeviation',
				blur.getAttribute('data-axis') === 'x' ? `${along} ${across}` : `${across} ${along}`
			);
	}
}

export const zoomThrough: TransitionModule = {
	name: 'zoom-through',
	defaultDuration: 0.6,
	ease: 'none',
	directional: false,
	events: [{ kind: 'transition', at: MID }],
	shows: () => ({ out: MID + FADE, in: MID - FADE }),
	check: (params) => [
		...checkKnown(params, ['at', 'zoom', 'blur', 'flash', 'color']),
		...checkPoint(params),
		...checkNumber(params, 'zoom', 1.1, 8),
		...checkNumber(params, 'blur', 0, 40),
		...checkNumber(params, 'flash', 0, 1),
		...checkColor(params)
	],
	setup(overlay, { params }) {
		const ns = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(ns, 'svg');
		svg.setAttribute('width', '0');
		svg.setAttribute('height', '0');
		svg.style.position = 'absolute';
		if (numberParam(params, 'blur', 18) > 0)
			for (const side of SIDES)
				for (const solid of [false, true])
					svg.appendChild(zoomFilter(ns, filterId(overlay, side, solid), solid));
		overlay.appendChild(svg);
		const flash = document.createElement('div');
		flash.dataset.flash = '';
		flash.style.cssText = 'position:absolute;inset:0;opacity:0;background:none;color:#ffffff';
		// Set as a property: a colour that is not one is dropped, never read as more CSS.
		if (isColor(params.color)) flash.style.color = params.color;
		overlay.appendChild(flash);
	},
	apply(frame) {
		const { eased, params, out, in: incoming, overlay, kind, size } = frame;
		const zoom = numberParam(params, 'zoom', 2.4);
		const streak = numberParam(params, 'blur', 18) / 100;
		const u = Math.min(1, eased / MID);
		const v = Math.max(0, (eased - MID) / (1 - MID));
		const sides: Record<'out' | 'in', { els: HTMLElement[]; scale: number; k: number }> = {
			// Into the outgoing picture, faster and faster.
			out: { els: out, scale: 1 + (zoom - 1) * rush(u), k: streak * u * u },
			// Out of the incoming one: it starts as close as the outgoing one ended and settles.
			in: {
				els: incoming,
				scale: 1 + (zoom - 1) * (1 - settle(v)),
				k: streak * (1 - v) * (1 - v)
			}
		};
		const showIn = smooth(ramp(eased, MID - FADE, MID + FADE));
		const outGone = eased >= MID + FADE;
		for (const side of SIDES) {
			const { els, scale, k } = sides[side];
			// A clip transition leaves the layers below the clip where they are.
			const still = side === 'out' && kind === 'clip';
			const at = pointAt(params, frame, side);
			// The mask reaches the frame edge farthest from the point; a streak k of the distance
			// there is about 2.5 standard deviations of blur. The filter draws before the scale,
			// so both are divided by it to come out at that size on screen.
			const half = Math.max(at.x, size[0] - at.x, at.y, size[1] - at.y, 1);
			const sigma = Math.min(SIGMA_MAX, (k * half) / 2.5) / scale;
			const blurred = !still && streak > 0 && sigma > BLUR_MIN;
			if (blurred) aim(overlay, side, at, sigma, Math.ceil(half / scale));
			for (const el of els) {
				if (still) continue;
				const o = originOf(el);
				el.style.transformOrigin = `${px(at.x - o.x)}px ${px(at.y - o.y)}px`;
				el.style.transform = `scale(${scale.toFixed(4)})`;
				// The filters are aimed in stage pixels: a box elsewhere (a slot) only scales.
				el.style.filter =
					blurred && !o.x && !o.y ? `url(#${filterId(overlay, side, isSolid(el))})` : '';
				if (side === 'in') el.style.opacity = showIn >= 1 ? '' : showIn.toFixed(4);
				else el.style.visibility = outGone ? 'hidden' : '';
			}
		}
		const flash = overlay.querySelector<HTMLElement>('[data-flash]')!;
		const peak = numberParam(params, 'flash', 0.25);
		const glow = Math.max(0, 1 - Math.abs(eased - MID) / (2.2 * FADE));
		// Centred on the outgoing point, moving across to the incoming one while it glows: never
		// a jump at its peak.
		const from = pointAt(params, frame, 'out');
		const to = pointAt(params, frame, 'in');
		const shift = smooth(ramp(eased, MID - 2.2 * FADE, MID + 2.2 * FADE));
		const at = { x: from.x + (to.x - from.x) * shift, y: from.y + (to.y - from.y) * shift };
		flash.style.background = `radial-gradient(circle at ${px(at.x)}px ${px(at.y)}px, currentColor 0%, transparent 75%)`;
		flash.style.opacity = (peak * glow * glow).toFixed(4);
	},
	release({ out, in: incoming }: TransitionSides) {
		for (const el of [...out, ...incoming]) {
			el.style.transform = '';
			el.style.transformOrigin = '';
			el.style.filter = '';
			el.style.opacity = '';
			el.style.visibility = '';
		}
	}
};
