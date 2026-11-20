// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
	liveAudio,
	proxyLine,
	assetNames,
	liveRanges,
	PROXY_GOP,
	proxyArgs,
	proxyCacheKey,
	proxySize,
	relativeUrls,
	type ProxySpec
} from '../../src/lib/motion/live-proxy.js';

const spec: ProxySpec = {
	src: '/p/talk.mp4',
	matte: '/p/talk.matte.mp4',
	sizes: [
		[100, 1],
		[50, 2]
	],
	fps: 25,
	total: 1205,
	size: [960, 540]
};
const box = (x: number) => ({ x, y: 0, width: 1, height: 1, headX: 0, headY: 0 });

describe('proxy sizes', () => {
	it('keeps the aspect at the longest side, even, and never scales up', () => {
		expect(proxySize(1920, 1080)).toEqual([960, 540]);
		expect(proxySize(1080, 1920)).toEqual([540, 960]);
		expect(proxySize(1001, 563, 500)).toEqual([500, 282]);
		expect(proxySize(640, 360)).toEqual([640, 360]);
	});
});

describe('proxy cache key', () => {
	it('changes with the source, its matte, their files and the encode', () => {
		const key = proxyCacheKey(spec);
		expect(key).toMatch(/^[0-9a-f]{12}$/);
		expect(proxyCacheKey({ ...spec })).toBe(key);
		expect(proxyCacheKey({ ...spec, matte: null })).not.toBe(key);
		expect(
			proxyCacheKey({
				...spec,
				sizes: [
					[100, 3],
					[50, 2]
				]
			})
		).not.toBe(key);
		expect(proxyCacheKey({ ...spec, fps: 30 })).not.toBe(key);
		expect(proxyCacheKey({ ...spec, size: [640, 360] })).not.toBe(key);
	});
});

describe('proxy encode', () => {
	it('packs picture and matte side by side with a short GOP', () => {
		const args = proxyArgs(spec, '/o.mp4');
		expect(args.filter((a, i) => args[i - 1] === '-i')).toEqual([
			'/p/talk.mp4',
			'/p/talk.matte.mp4'
		]);
		const graph = args[args.indexOf('-filter_complex') + 1];
		expect(graph).toContain('[0:v]fps=25,scale=960:540');
		expect(graph).toContain(
			'[1:v]fps=25,scale=960:540:flags=bicubic,format=gray,tpad=stop_mode=clone'
		);
		expect(graph).toContain('hstack=inputs=2[v]');
		expect(args[args.indexOf('-frames:v') + 1]).toBe('1205');
		expect(args[args.indexOf('-g') + 1]).toBe(String(PROXY_GOP));
		expect(args).toContain('+faststart');
		expect(args.at(-1)).toBe('/o.mp4');
	});

	it('is the picture alone without a matte', () => {
		const args = proxyArgs({ ...spec, matte: null }, '/o.mp4');
		expect(args.filter((a) => a === '-i')).toHaveLength(1);
		expect(args[args.indexOf('-filter_complex') + 1]).toBe(
			'[0:v]fps=25,scale=960:540:flags=bicubic,setsar=1,format=yuv420p[v]'
		);
	});
});

describe('live ranges', () => {
	it('carries the boxes of each range’s frames', () => {
		const boxes = [box(0), box(1), null, box(3)];
		expect(
			liveRanges(
				[
					{ first: 1, last: 2 },
					{ first: 3, last: 5 }
				],
				boxes
			)
		).toEqual([
			{ first: 1, last: 2, boxes: [box(1), null] },
			{ first: 3, last: 5, boxes: [box(3), null, null] }
		]);
		expect(liveRanges([{ first: 0, last: 9 }], null)).toEqual([{ first: 0, last: 9 }]);
	});
});

describe('asset names', () => {
	it('names each file once, numbered, with a safe file name', () => {
		const names = assetNames([
			'/a/logo one.png',
			'/b/logo one.png',
			'/a/logo one.png',
			'/c/Font+X.woff2'
		]);
		expect([...names.values()]).toEqual([
			'assets/0-logo_one.png',
			'assets/1-logo_one.png',
			'assets/2-Font_X.woff2'
		]);
	});
});

describe('relative URLs', () => {
	const origin = 'http://visualfries.local';
	const served = (abs: string) => `${origin}/@fs${abs}`;
	const names = new Map([
		['/p/logo.png', 'assets/0-logo.png'],
		['/p/logo.png.bak/x.png', 'assets/1-x.png']
	]);

	it('replaces every served URL with the file’s name, longest first', () => {
		const text = `url("${origin}/@fs/p/logo.png") ${origin}/@fs/p/logo.png.bak/x.png`;
		expect(relativeUrls(text, names, served, origin)).toBe(
			'url("assets/0-logo.png") assets/1-x.png'
		);
	});

	it('throws on a served URL the folder does not carry', () => {
		expect(() => relativeUrls(`${origin}/@fs/p/other.png`, names, served, origin)).toThrow(
			/does not carry/
		);
	});
});

describe('report lines', () => {
	it('says where a proxy came from', () => {
		expect(proxyLine('talk', true, 0)).toBe('footage "talk" from cache');
		expect(proxyLine('talk', false, 12345)).toBe('footage "talk" in 12.3 s');
	});

	it('reports the mix and its delivered loudness', () => {
		expect(liveAudio(null, '/p/audio.m4a')).toBeNull();
		expect(liveAudio({ report: {} }, '/p/audio.m4a')).toEqual({
			file: '/p/audio.m4a',
			source: 'visualfries-mix',
			lufs: null
		});
		expect(liveAudio({ report: { delivered: { lufs: -14 } } }, '/p/audio.m4a')?.lufs).toBe(-14);
	});
});
