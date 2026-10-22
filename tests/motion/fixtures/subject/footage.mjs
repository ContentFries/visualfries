// Synthetic selfie footage for the subject layer tests: a sky that darkens upward over a green
// field, and a speaker (a light head on a darker body) swaying left and right, with its matte.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export const SW = 360;
export const SH = 640;
/** Head centre x at frame N: sways 24 px either way over two seconds. */
export const headX = (n) => 180 + 24 * Math.sin((2 * Math.PI * n) / 60);
const HX = '(180+24*sin(2*PI*N/60))';
/** Inside the head (an ellipse, top at y = 150) or the body (from y = 330 down). */
const SUBJECT = `lt(pow((X-${HX})/70,2)+pow((Y-240)/90,2),1)+gt(Y,330)*lt(abs(X-${HX}),120)`;

export function ffmpeg(args, input) {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], {
		input,
		maxBuffer: 1 << 28
	});
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

/**
 * `talk.mp4` and `talk.matte.mp4` (3 s, 30 fps) in `dir`. `bt709` tags the video as BT.709, as
 * phones do, so a decoder that follows the tag turns it into other RGB than one that does not.
 */
export function writeFootage(dir, seconds = 3, bt709 = false) {
	// Sky: blue, lighter toward the horizon at y = 420; field below. Head light skin, body dark.
	const r = `if(gt(${SUBJECT},0),if(lt(Y,330),225,60),if(lt(Y,420),70+Y/6,60))`;
	const g = `if(gt(${SUBJECT},0),if(lt(Y,330),180,60),if(lt(Y,420),120+Y/5,150))`;
	const b = `if(gt(${SUBJECT},0),if(lt(Y,330),150,70),if(lt(Y,420),235,60))`;
	ffmpeg([
		'-f',
		'lavfi',
		'-i',
		`color=black:s=${SW}x${SH}:r=30:d=${seconds}`,
		'-vf',
		`format=gbrp,geq=r='${r}':g='${g}':b='${b}',format=yuv420p`,
		'-g',
		'30',
		'-crf',
		'12',
		...(bt709
			? [
					'-colorspace',
					'bt709',
					'-color_primaries',
					'bt709',
					'-color_trc',
					'bt709',
					'-color_range',
					'tv'
				]
			: []),
		path.join(dir, 'talk.mp4')
	]);
	ffmpeg([
		'-f',
		'lavfi',
		'-i',
		`color=black:s=${SW}x${SH}:r=30:d=${seconds}`,
		'-vf',
		`geq=lum='if(gt(${SUBJECT},0),255,0)':cb=128:cr=128`,
		'-g',
		'30',
		'-crf',
		'12',
		'-pix_fmt',
		'yuv420p',
		path.join(dir, 'talk.matte.mp4')
	]);
}

/** RGB of a PNG at (x, y). */
export function pixels(png, width) {
	const raw = ffmpeg(['-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'], png);
	return (x, y) => [...raw.subarray((y * width + x) * 4, (y * width + x) * 4 + 3)];
}

export function toolchain(chromium) {
	const ff = spawnSync('ffmpeg', ['-version']);
	const ch = chromium ? spawnSync(chromium, ['--version']) : null;
	return {
		ffmpeg: String(ff.stdout).split('\n')[0].trim(),
		chromium: ch && ch.status === 0 ? String(ch.stdout).trim() : null
	};
}
