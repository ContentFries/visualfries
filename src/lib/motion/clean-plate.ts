/**
 * The clean plate: the footage with the subject removed, so that a part of the subject that
 * moves away (a region layer, a hole) leaves plausible background instead of black. Pure: frames
 * in, frames out, no I/O; `node.ts` decodes the footage and its matte, runs this per frame and
 * caches the result next to the extracted frames.
 *
 * `fill` (the default) inpaints every frame from its own background: the subject and its soft
 * edge are grown by `grow` px (the matte's fringe and a phone's sharpening halo go with them)
 * and the hole is filled by push-pull: the known pixels are averaged down a pyramid and the
 * coarse levels pulled back up into the hole, smoothly (bilinear) and from all sides. Sky, walls
 * and out-of-focus trees come out as a soft continuation of what surrounds the subject; detail
 * (a sharp branch, a window frame) does not continue into the hole. Outside the grown hole the
 * plate is the footage itself, pixel for pixel, so the plate can be drawn over the footage
 * anywhere without a seam.
 *
 * `image` takes the background from a picture the project supplies (a still of the empty
 * scene, from a tripod): the hole shows the picture, the rest stays the footage.
 */

export type CleanMethod = 'fill' | 'image';

export type CleanOptions = {
	/** Matte values (0–255) at or above this count as subject, its soft edge included. */
	threshold?: number;
	/** Pixels the hole grows by past the matte's soft edge. */
	grow?: number;
	/**
	 * `image` method: the background picture, RGB at the frame's size. Without it the hole is
	 * filled (`fill`).
	 */
	image?: Uint8Array | null;
};

/** Defaults of `cleanPlate`, also part of the cache key. */
export const CLEAN_DEFAULTS = { threshold: 6, growShare: 0.011 } as const;

/**
 * Version of the plate algorithm, part of the cache key of every cleaned range: raise it when
 * the pixels it makes change.
 */
export const CLEAN_VERSION = 1;

/** Pixels the hole grows by for a frame `width` × `height` (about 12 px at 1080 × 1920). */
export const defaultGrow = (width: number, height: number) =>
	Math.max(2, Math.round(CLEAN_DEFAULTS.growShare * Math.min(width, height)));

/**
 * The hole: matte at or above `threshold`, grown by `grow` px (a square, done as a max filter
 * along rows then columns, so it costs the same for any `grow`). 1 = hole.
 */
export function holeMask(
	matte: Uint8Array,
	width: number,
	height: number,
	threshold: number,
	grow: number
): Uint8Array {
	const n = width * height;
	const hole = new Uint8Array(n);
	for (let i = 0; i < n; i++) hole[i] = matte[i] >= threshold ? 1 : 0;
	if (grow <= 0) return hole;
	const rows = new Uint8Array(n);
	// Along each row: distance to the nearest hole pixel within `grow`, by two sweeps.
	for (let y = 0; y < height; y++) {
		const o = y * width;
		let last = -Infinity;
		for (let x = 0; x < width; x++) {
			if (hole[o + x]) last = x;
			if (x - last <= grow) rows[o + x] = 1;
		}
		last = Infinity;
		for (let x = width - 1; x >= 0; x--) {
			if (hole[o + x]) last = x;
			if (last - x <= grow) rows[o + x] = 1;
		}
	}
	const out = new Uint8Array(n);
	for (let x = 0; x < width; x++) {
		let last = -Infinity;
		for (let y = 0; y < height; y++) {
			if (rows[y * width + x]) last = y;
			if (y - last <= grow) out[y * width + x] = 1;
		}
		last = Infinity;
		for (let y = height - 1; y >= 0; y--) {
			if (rows[y * width + x]) last = y;
			if (last - y <= grow) out[y * width + x] = 1;
		}
	}
	return out;
}

type Level = { w: number; h: number; c: Float32Array; a: Float32Array };

/**
 * Push-pull fill of an RGB picture where `known` is 0. Works on `rgb` downscaled by 2 (the fill
 * is smooth, so half resolution loses nothing and costs a quarter), returns the filled colour
 * at half resolution (`hw` × `hh`, 3 floats a pixel).
 */
function pushPull(
	rgb: Uint8Array,
	known: Uint8Array,
	width: number,
	height: number
): { c: Float32Array; w: number; h: number } {
	// Level 0: half resolution, colour weighted by how much of each 2 × 2 block is known.
	const w0 = Math.ceil(width / 2);
	const h0 = Math.ceil(height / 2);
	const base: Level = {
		w: w0,
		h: h0,
		c: new Float32Array(w0 * h0 * 3),
		a: new Float32Array(w0 * h0)
	};
	for (let y = 0; y < h0; y++)
		for (let x = 0; x < w0; x++) {
			let r = 0,
				g = 0,
				b = 0,
				k = 0;
			for (let dy = 0; dy < 2; dy++) {
				const yy = 2 * y + dy;
				if (yy >= height) continue;
				for (let dx = 0; dx < 2; dx++) {
					const xx = 2 * x + dx;
					if (xx >= width) continue;
					const i = yy * width + xx;
					if (!known[i]) continue;
					r += rgb[3 * i];
					g += rgb[3 * i + 1];
					b += rgb[3 * i + 2];
					k++;
				}
			}
			const j = y * w0 + x;
			if (k) {
				base.c[3 * j] = r / k;
				base.c[3 * j + 1] = g / k;
				base.c[3 * j + 2] = b / k;
			}
			base.a[j] = k / 4;
		}
	// Push: each coarser level averages its 2 × 2 children by weight; its own weight is their
	// sum, capped at 1, so a block with any known pixel is trusted and the fill stays local.
	const levels: Level[] = [base];
	while (levels[levels.length - 1].w > 1 || levels[levels.length - 1].h > 1) {
		const f = levels[levels.length - 1];
		const w = Math.ceil(f.w / 2);
		const h = Math.ceil(f.h / 2);
		const c = new Float32Array(w * h * 3);
		const a = new Float32Array(w * h);
		for (let y = 0; y < h; y++)
			for (let x = 0; x < w; x++) {
				let r = 0,
					g = 0,
					b = 0,
					k = 0;
				for (let dy = 0; dy < 2; dy++) {
					const yy = 2 * y + dy;
					if (yy >= f.h) continue;
					for (let dx = 0; dx < 2; dx++) {
						const xx = 2 * x + dx;
						if (xx >= f.w) continue;
						const i = yy * f.w + xx;
						const wt = f.a[i];
						if (!wt) continue;
						r += f.c[3 * i] * wt;
						g += f.c[3 * i + 1] * wt;
						b += f.c[3 * i + 2] * wt;
						k += wt;
					}
				}
				const j = y * w + x;
				if (k) {
					c[3 * j] = r / k;
					c[3 * j + 1] = g / k;
					c[3 * j + 2] = b / k;
				}
				a[j] = Math.min(1, k);
			}
		levels.push({ w, h, c, a });
	}
	// Pull: from the coarsest level down, each level keeps what it knows and takes the rest
	// from the level above, sampled bilinearly (pixel centres aligned), so the fill has no blocks.
	for (let l = levels.length - 2; l >= 0; l--) {
		const f = levels[l];
		const u = levels[l + 1];
		for (let y = 0; y < f.h; y++) {
			const sy = Math.min(u.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
			const y0 = Math.floor(sy);
			const y1 = Math.min(u.h - 1, y0 + 1);
			const fy = sy - y0;
			for (let x = 0; x < f.w; x++) {
				const j = y * f.w + x;
				const wt = f.a[j];
				if (wt >= 1) continue;
				const sx = Math.min(u.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
				const x0 = Math.floor(sx);
				const x1 = Math.min(u.w - 1, x0 + 1);
				const fx = sx - x0;
				const i00 = y0 * u.w + x0,
					i01 = y0 * u.w + x1,
					i10 = y1 * u.w + x0,
					i11 = y1 * u.w + x1;
				for (let ch = 0; ch < 3; ch++) {
					const top = u.c[3 * i00 + ch] * (1 - fx) + u.c[3 * i01 + ch] * fx;
					const bottom = u.c[3 * i10 + ch] * (1 - fx) + u.c[3 * i11 + ch] * fx;
					const up = top * (1 - fy) + bottom * fy;
					f.c[3 * j + ch] = f.c[3 * j + ch] * wt + up * (1 - wt);
				}
				f.a[j] = 1;
			}
		}
	}
	return { c: base.c, w: base.w, h: base.h };
}

/**
 * The clean plate of one frame: `rgb` (RGB, `width` × `height`) where the matte is background,
 * and the background (filled, or the supplied picture) where the subject was, grown by `grow`.
 * Deterministic: the same frame and matte always give the same bytes.
 */
export function cleanPlate(
	rgb: Uint8Array,
	matte: Uint8Array,
	width: number,
	height: number,
	opts: CleanOptions = {}
): Uint8Array {
	const threshold = opts.threshold ?? CLEAN_DEFAULTS.threshold;
	const grow = opts.grow ?? defaultGrow(width, height);
	const hole = holeMask(matte, width, height, threshold, grow);
	const out = new Uint8Array(rgb);
	if (opts.image) {
		for (let i = 0; i < width * height; i++)
			if (hole[i]) {
				out[3 * i] = opts.image[3 * i];
				out[3 * i + 1] = opts.image[3 * i + 1];
				out[3 * i + 2] = opts.image[3 * i + 2];
			}
		return out;
	}
	const known = new Uint8Array(width * height);
	let holes = 0;
	for (let i = 0; i < known.length; i++) {
		known[i] = 1 - hole[i];
		holes += hole[i];
	}
	// Nothing to fill, or nothing to fill from.
	if (!holes || holes === known.length) return out;
	const half = pushPull(rgb, known, width, height);
	// The hole at full resolution, from the half-resolution fill sampled bilinearly (pixel
	// centres aligned); the column weights are the same on every row.
	const hw = half.w;
	const cx0 = new Int32Array(width);
	const cx1 = new Int32Array(width);
	const cfx = new Float32Array(width);
	for (let x = 0; x < width; x++) {
		const sx = Math.min(hw - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
		cx0[x] = Math.floor(sx);
		cx1[x] = Math.min(hw - 1, cx0[x] + 1);
		cfx[x] = sx - cx0[x];
	}
	const c = half.c;
	for (let y = 0; y < height; y++) {
		const sy = Math.min(half.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
		const r0 = Math.floor(sy) * hw;
		const r1 = Math.min(half.h - 1, Math.floor(sy) + 1) * hw;
		const fy = sy - Math.floor(sy);
		for (let x = 0; x < width; x++) {
			const i = y * width + x;
			if (!hole[i]) continue;
			const fx = cfx[x];
			const a = 3 * (r0 + cx0[x]),
				b = 3 * (r0 + cx1[x]),
				d = 3 * (r1 + cx0[x]),
				e = 3 * (r1 + cx1[x]);
			for (let ch = 0; ch < 3; ch++) {
				const top = c[a + ch] + (c[b + ch] - c[a + ch]) * fx;
				const bottom = c[d + ch] + (c[e + ch] - c[d + ch]) * fx;
				out[3 * i + ch] = Math.round(top + (bottom - top) * fy);
			}
		}
	}
	return out;
}
