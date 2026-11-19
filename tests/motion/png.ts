import { inflateSync } from 'node:zlib';

/**
 * Decodes a screenshot PNG to raw RGBA bytes, row by row, the same bytes `ffmpeg -f rawvideo
 * -pix_fmt rgba` gives, without starting a process per frame. Takes the PNGs Chromium writes:
 * 8-bit RGB or RGBA, not interlaced; anything else throws.
 */
export function rgba(png: Buffer): Buffer {
	const { width, height, channels, data } = readPng(png);
	const stride = width * channels;
	const pixels = Buffer.alloc(stride * height);
	for (let y = 0; y < height; y++) {
		const row = pixels.subarray(y * stride, (y + 1) * stride);
		const prior = y ? pixels.subarray((y - 1) * stride, y * stride) : undefined;
		const at = y * (stride + 1);
		unfilter(data[at], data.subarray(at + 1, at + 1 + stride), row, prior, channels);
	}
	if (channels === 4) return pixels;
	const out = Buffer.alloc(width * height * 4, 0xff);
	for (let i = 0, j = 0; i < pixels.length; i += 3, j += 4) pixels.copy(out, j, i, i + 3);
	return out;
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readPng(png: Buffer) {
	if (!png.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
	let width = 0;
	let height = 0;
	let channels = 0;
	const idat: Buffer[] = [];
	for (let at = 8; at < png.length; ) {
		const length = png.readUInt32BE(at);
		const type = png.toString('latin1', at + 4, at + 8);
		const body = png.subarray(at + 8, at + 8 + length);
		if (type === 'IHDR') ({ width, height, channels } = header(body));
		else if (type === 'IDAT') idat.push(body);
		else if (type === 'IEND') break;
		at += length + 12;
	}
	return { width, height, channels, data: inflateSync(Buffer.concat(idat)) };
}

function header(body: Buffer) {
	const [depth, colour, , , interlace] = body.subarray(8, 13);
	const channels = colour === 6 ? 4 : colour === 2 ? 3 : 0;
	if (depth !== 8 || !channels || interlace)
		throw new Error(
			`unsupported PNG: depth ${depth}, colour type ${colour}, interlace ${interlace}`
		);
	return { width: body.readUInt32BE(0), height: body.readUInt32BE(4), channels };
}

/** Reverses one row's PNG filter into `row`, given the row above (`prior`) if any. */
function unfilter(type: number, src: Buffer, row: Buffer, prior: Buffer | undefined, bpp: number) {
	const predict = PREDICTORS[type];
	if (!predict) throw new Error(`unknown PNG filter ${type}`);
	for (let i = 0; i < src.length; i++) {
		const left = i >= bpp ? row[i - bpp] : 0;
		const up = prior ? prior[i] : 0;
		const upLeft = prior && i >= bpp ? prior[i - bpp] : 0;
		row[i] = (src[i] + predict(left, up, upLeft)) & 0xff;
	}
}

function paeth(a: number, b: number, c: number) {
	const p = a + b - c;
	const pa = Math.abs(p - a);
	const pb = Math.abs(p - b);
	const pc = Math.abs(p - c);
	return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

const PREDICTORS: ((left: number, up: number, upLeft: number) => number)[] = [
	() => 0,
	(left) => left,
	(_, up) => up,
	(left, up) => (left + up) >> 1,
	paeth
];
