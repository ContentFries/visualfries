import type { Point, RegionShape } from './subject-region.js';

/**
 * Drawing subject regions on a 2D canvas in footage pixels, shared by the stage (holes) and
 * `<Subject>` (region layers), so a region taken away and the hole it leaves have the same edge:
 * one is drawn inside the region's path, the other has the same path erased, and their
 * antialiased coverages add up to one along the cut.
 */

/** Decoded pictures by URL, newest last; a few dozen frames at most. */
const pictures = new Map<string, Promise<HTMLImageElement>>();
const KEEP = 24;

/**
 * The picture at `url`, decoded (ready to draw). Shared by every layer on the page, so a frame
 * drawn by the stage and by a block decodes once.
 */
export function loadPicture(url: string): Promise<HTMLImageElement> {
	let p = pictures.get(url);
	if (p) {
		pictures.delete(url);
		pictures.set(url, p);
		return p;
	}
	const img = new Image();
	img.decoding = 'sync';
	img.src = url;
	p = img.decode().then(
		() => img,
		() => {
			pictures.delete(url);
			throw new Error(`Could not load ${url.length > 120 ? url.slice(0, 120) + '…' : url}`);
		}
	);
	pictures.set(url, p);
	while (pictures.size > KEEP) pictures.delete(pictures.keys().next().value!);
	return p;
}

/** A shape's path in the canvas's current transform; false for a mask (no path). */
export function traceRegion(
	ctx: CanvasRenderingContext2D,
	shape: RegionShape,
	size: Point
): boolean {
	ctx.beginPath();
	if (shape.kind === 'all') {
		ctx.rect(-size.x, -size.y, 3 * size.x, 3 * size.y);
		return true;
	}
	if (shape.kind === 'half') {
		const [first, ...rest] = shape.polygon;
		ctx.moveTo(first.x, first.y);
		for (const p of rest) ctx.lineTo(p.x, p.y);
		ctx.closePath();
		return true;
	}
	return false;
}

/** A scratch canvas of `w` × `h`, reused. */
function scratch(slot: { canvas?: HTMLCanvasElement }, w: number, h: number) {
	const c = (slot.canvas ??= document.createElement('canvas'));
	if (c.width !== w || c.height !== h) {
		c.width = w;
		c.height = h;
	}
	const x = c.getContext('2d')!;
	x.setTransform(1, 0, 0, 1, 0, 0);
	x.globalCompositeOperation = 'source-over';
	x.globalAlpha = 1;
	x.clearRect(0, 0, w, h);
	return { canvas: c, ctx: x };
}

const maskSlot: { canvas?: HTMLCanvasElement } = {};

/**
 * Keeps (`in`) or removes (`out`) what is drawn on `ctx` inside the shape, by compositing: the
 * canvas must hold only what the region applies to. `mask` is the decoded picture of a mask shape.
 */
export function applyRegion(
	ctx: CanvasRenderingContext2D,
	shape: RegionShape,
	mode: 'in' | 'out',
	mask: HTMLImageElement | null = null
) {
	const { width, height } = ctx.canvas;
	ctx.save();
	ctx.globalCompositeOperation = mode === 'in' ? 'destination-in' : 'destination-out';
	if (shape.kind === 'mask') {
		if (!mask) throw new Error('A mask region needs its picture loaded.');
		ctx.drawImage(mask, shape.x, shape.y, shape.width, shape.height);
	} else if (shape.kind === 'path') {
		ctx.translate(shape.dx, shape.dy);
		ctx.fill(new Path2D(shape.d));
	} else {
		traceRegion(ctx, shape, { x: width, y: height });
		ctx.fill();
	}
	ctx.restore();
}

/** Draws `picture` (footage-sized) onto `ctx` inside the shape only (`outside`: outside it). */
export function drawRegion(
	ctx: CanvasRenderingContext2D,
	picture: CanvasImageSource,
	shape: RegionShape,
	opts: { outside?: boolean; mask?: HTMLImageElement | null } = {}
) {
	const { width, height } = ctx.canvas;
	const s = scratch(maskSlot, width, height);
	s.ctx.drawImage(picture, 0, 0, width, height);
	applyRegion(s.ctx, shape, opts.outside ? 'out' : 'in', opts.mask ?? null);
	ctx.drawImage(s.canvas, 0, 0);
}

/**
 * The look of the cut edge on the subject that stays: a band of `width` px along the cut, on the
 * subject only. For a line, `opening` (0–1) draws the open top of a cartoon head instead: an
 * ellipse across the subject as wide as it is along the line, `opening` times as tall as it is
 * wide at most, `inside` within and the rim colour around.
 */
export type Rim = {
	/** Colour of the band or ring; default the subject's own colour just inside the cut. */
	color?: string;
	/** Band or ring width in footage px; default 1 % of the footage's short side. */
	width?: number;
	/** Half-planes only: draw an opening of this depth (ellipse height over width). */
	opening?: number;
	/** The opening's inside, dark at its far side; default a deep red-brown. */
	inside?: string;
};

const rimSlot: { canvas?: HTMLCanvasElement } = {};
/** Matte alpha above which a pixel on the cut belongs to the subject (its soft edge included). */
const SOFT_EDGE = 24;
/** Longest gap along the cut, as a share of the footage width, that still joins two parts. */
const GAP_SHARE = 0.02;
const probeSlot: { canvas?: HTMLCanvasElement } = {};

/**
 * How the subject crosses a line: the run of subject (alpha above half) along it that contains
 * the point nearest `near`, as distances along `dir` from `at`, and the subject's mean colour
 * `inset` px on the side away from the region. Null when the line misses the subject there.
 */
export function crossing(
	subject: CanvasImageSource,
	size: Point,
	shape: Extract<RegionShape, { kind: 'half' }>,
	near: Point,
	inset: number
): { from: number; to: number; color: [number, number, number] } | null {
	const length = Math.ceil(Math.hypot(size.x, size.y));
	const s = scratch(probeSlot, 2 * length, 2);
	const { at, dir } = shape;
	// Row 0 samples the line, row 1 the band `inset` px into the subject that stays.
	const n = { x: -dir.y, y: dir.x };
	const into = shape.side === 'above' ? 1 : -1;
	for (const row of [0, 1]) {
		const o = { x: at.x + row * into * inset * n.x, y: at.y + row * into * inset * n.y };
		// Picture point o + u·dir lands on (length + u, row + 0.5): the row's pixel centres.
		const tx = length - (dir.x * o.x + dir.y * o.y);
		const ty = row + 0.5 - (-dir.y * o.x + dir.x * o.y);
		s.ctx.save();
		s.ctx.beginPath();
		s.ctx.rect(0, row, 2 * length, 1);
		s.ctx.clip();
		s.ctx.setTransform(dir.x, -dir.y, dir.y, dir.x, tx, ty);
		s.ctx.drawImage(subject, 0, 0, size.x, size.y);
		s.ctx.restore();
	}
	const data = s.ctx.getImageData(0, 0, 2 * length, 2).data;
	const u0 = Math.round(dir.x * (near.x - at.x) + dir.y * (near.y - at.y)) + length;
	// The matte's soft edge (hair) counts: the opening must reach as far as the cut shows.
	const solid = (i: number) => i >= 0 && i < 2 * length && data[4 * i + 3] > SOFT_EDGE;
	// Gaps in the matte this short (wisps of hair, a thin dark line) do not end the run.
	const gap = Math.max(4, Math.round(GAP_SHARE * size.x));
	const reach = (from: number, step: number) => {
		let end = from;
		for (let i = from + step, miss = 0; i >= 0 && i < 2 * length && miss <= gap; i += step) {
			if (solid(i)) {
				end = i;
				miss = 0;
			} else miss++;
		}
		return end;
	};
	let start = Math.max(0, Math.min(2 * length - 1, u0));
	if (!solid(start)) {
		// The nearest subject pixel along the line, within a quarter of the picture.
		let found = -1;
		for (let d = 1; d < size.x / 4 && found < 0; d++)
			if (solid(start - d)) found = start - d;
			else if (solid(start + d)) found = start + d;
		if (found < 0) return null;
		start = found;
	}
	let a = start;
	let b = start;
	a = reach(a, -1);
	b = reach(b, 1);
	let r = 0,
		g = 0,
		bl = 0,
		k = 0;
	for (let i = a; i <= b; i++) {
		const j = 4 * (2 * length + i);
		if (data[j + 3] < 200) continue;
		// Colours come premultiplied out of the canvas only for partial alpha; skip those.
		r += data[j];
		g += data[j + 1];
		bl += data[j + 2];
		k++;
	}
	const color: [number, number, number] = k ? [r / k, g / k, bl / k] : [128, 96, 80];
	return { from: a - length, to: b + 1 - length, color: color.map(Math.round) as typeof color };
}

/**
 * Draws the rim of `shape` on `ctx` (footage pixels) over the subject that stays: `subject` is
 * the subject picture of the same frame. `near` picks which part of the subject a line crosses
 * (the head) for an opening.
 */
export function drawRim(
	ctx: CanvasRenderingContext2D,
	subject: CanvasImageSource,
	shape: RegionShape,
	rim: Rim,
	near: Point | null,
	mask: HTMLImageElement | null = null
) {
	const { width: w, height: h } = ctx.canvas;
	const lineWidth = rim.width ?? Math.max(2, Math.round(0.01 * Math.min(w, h)));
	if (shape.kind === 'half' && rim.opening && rim.opening > 0 && near) {
		const across = crossing(subject, { x: w, y: h }, shape, near, Math.max(6, lineWidth * 3));
		if (!across) return;
		const mid = (across.from + across.to) / 2;
		const c = { x: shape.at.x + shape.dir.x * mid, y: shape.at.y + shape.dir.y * mid };
		const rx = (across.to - across.from) / 2;
		const ry = rx * Math.min(1, rim.opening);
		ctx.save();
		ctx.translate(c.x, c.y);
		ctx.rotate(Math.atan2(shape.dir.y, shape.dir.x));
		ctx.beginPath();
		ctx.ellipse(0, 0, Math.max(1, rx - lineWidth / 2), Math.max(1, ry), 0, 0, Math.PI * 2);
		const inside = rim.inside ?? '#3a0d10';
		const fill = ctx.createRadialGradient(0, ry * 0.3, 1, 0, 0, Math.max(2, rx));
		fill.addColorStop(0, '#120405');
		fill.addColorStop(0.7, inside);
		fill.addColorStop(1, '#7a2a2a');
		ctx.fillStyle = fill;
		ctx.fill();
		ctx.lineWidth = lineWidth;
		ctx.strokeStyle = rim.color ?? `rgb(${across.color.join(',')})`;
		ctx.stroke();
		// A thin light lip on the far inside edge, so the opening reads as a rim with depth.
		ctx.beginPath();
		ctx.ellipse(0, ry * 0.12, rx * 0.9, ry * 0.78, 0, Math.PI * 1.05, Math.PI * 1.95);
		ctx.lineWidth = Math.max(1.5, lineWidth * 0.35);
		ctx.strokeStyle = 'rgba(255, 170, 160, 0.85)';
		ctx.stroke();
		ctx.restore();
		return;
	}
	// A band along the cut: the region's outline stroked twice as wide, kept on the subject and
	// outside the region, so only the half on the subject that stays shows.
	const s = scratch(rimSlot, w, h);
	s.ctx.lineWidth = 2 * lineWidth;
	s.ctx.lineJoin = 'round';
	s.ctx.strokeStyle = rim.color ?? 'rgba(40, 10, 12, 0.85)';
	if (shape.kind === 'half') {
		const far = 4 * (w + h);
		s.ctx.beginPath();
		s.ctx.moveTo(shape.at.x - shape.dir.x * far, shape.at.y - shape.dir.y * far);
		s.ctx.lineTo(shape.at.x + shape.dir.x * far, shape.at.y + shape.dir.y * far);
		s.ctx.stroke();
	} else if (shape.kind === 'path') {
		s.ctx.translate(shape.dx, shape.dy);
		s.ctx.stroke(new Path2D(shape.d));
		s.ctx.setTransform(1, 0, 0, 1, 0, 0);
	} else if (shape.kind === 'mask' && mask) {
		// The mask's edge: the mask grown by the band width, less the mask.
		s.ctx.fillStyle = s.ctx.strokeStyle;
		s.ctx.fillRect(0, 0, w, h);
		s.ctx.globalCompositeOperation = 'destination-in';
		s.ctx.filter = `blur(${lineWidth / 2}px)`;
		s.ctx.drawImage(mask, shape.x, shape.y, shape.width, shape.height);
		s.ctx.filter = 'none';
	} else return;
	s.ctx.globalCompositeOperation = 'destination-in';
	s.ctx.drawImage(subject, 0, 0, w, h);
	applyRegion(s.ctx, shape, 'out', mask);
	ctx.drawImage(s.canvas, 0, 0);
}

/**
 * How much of the subject lies inside the shape, as a share of the subject (0–1), measured on
 * a small copy (`check` warns when a region stays empty). 0 without a subject.
 */
export function regionShare(
	subject: CanvasImageSource,
	size: Point,
	shape: RegionShape,
	mask: HTMLImageElement | null = null
): number {
	const k = 64 / Math.max(size.x, size.y);
	const w = Math.max(1, Math.round(size.x * k));
	const h = Math.max(1, Math.round(size.y * k));
	const s = scratch(probeSlot, w, h);
	s.ctx.drawImage(subject, 0, 0, w, h);
	const all = alphaSum(s.ctx, w, h);
	if (!all) return 0;
	s.ctx.save();
	s.ctx.scale(k, k);
	// Scaled, so the region is drawn in footage pixels like everywhere else.
	s.ctx.globalCompositeOperation = 'destination-in';
	if (shape.kind === 'mask') {
		if (mask) s.ctx.drawImage(mask, shape.x, shape.y, shape.width, shape.height);
	} else if (shape.kind === 'path') {
		s.ctx.translate(shape.dx, shape.dy);
		s.ctx.fill(new Path2D(shape.d));
	} else {
		traceRegion(s.ctx, shape, size);
		s.ctx.fill();
	}
	s.ctx.restore();
	return alphaSum(s.ctx, w, h) / all;
}

function alphaSum(ctx: CanvasRenderingContext2D, w: number, h: number): number {
	const data = ctx.getImageData(0, 0, w, h).data;
	let sum = 0;
	for (let i = 3; i < data.length; i += 4) sum += data[i];
	return sum;
}
