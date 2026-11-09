// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { rgba } from './png.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

function ffmpeg(args: string[], input?: Buffer): Buffer {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		input,
		maxBuffer: 1 << 28
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

/** A busy, noisy test picture, odd-sized so rows do not line up with anything, as a PNG. */
const picture = (pixFmt: string, pred: string, filter = 'noise=alls=60:allf=u') =>
	ffmpeg([
		...['-f', 'lavfi', '-i', 'testsrc2=s=97x31:d=1', '-frames:v', '1'],
		...[
			'-vf',
			filter,
			'-pix_fmt',
			pixFmt,
			'-pred',
			pred,
			'-f',
			'image2pipe',
			'-c:v',
			'png',
			'pipe:1'
		]
	]);
const viaFfmpeg = (png: Buffer) =>
	ffmpeg(['-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], png);

describe.skipIf(!hasFfmpeg)('rgba', () => {
	it.each(['none', 'sub', 'up', 'avg', 'paeth', 'mixed'])(
		'gives ffmpeg’s bytes for RGB and RGBA pictures with the %s filter',
		(pred) => {
			for (const png of [
				picture('rgb24', pred),
				picture(
					'rgba',
					pred,
					'noise=alls=60:allf=u,format=rgba,geq=r=r(X\\,Y):g=g(X\\,Y):b=b(X\\,Y):a=mod(X*7+Y*13\\,256)'
				)
			])
				expect(rgba(png).equals(viaFfmpeg(png))).toBe(true);
		}
	);

	it('refuses what it cannot decode', () => {
		expect(() => rgba(Buffer.from('not a png'))).toThrow('not a PNG');
		expect(() => rgba(picture('gray', 'none'))).toThrow('unsupported PNG');
		expect(() => rgba(picture('rgb48be', 'none'))).toThrow('unsupported PNG');
	});
});
