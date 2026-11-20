// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
	LIVE_MANIFEST_VERSION,
	liveFootageFrames,
	resolveLiveManifest,
	type LiveManifest
} from '../../src/lib/motion/live-manifest.js';
import type { StageSegment } from '../../src/lib/motion/segments.js';

const box = { x: 0.4, y: 0.2, width: 0.2, height: 0.6, headX: 0.5, headY: 0.3 };
const footage = {
	talk: {
		url: 'media/talk.mp4',
		packed: true,
		size: [960, 540] as [number, number],
		total: 300,
		width: 1920,
		height: 1080
	},
	mont: {
		url: 'media/mont.mp4',
		packed: false,
		size: [960, 540] as [number, number],
		total: 100,
		width: 1920,
		height: 1080
	}
};

const manifest = (over: Partial<LiveManifest> = {}): LiveManifest => ({
	version: LIVE_MANIFEST_VERSION,
	fps: 25,
	frames: 100,
	duration: 4,
	size: [1920, 1080],
	bundle: 'player.js',
	styles: 'player.css',
	segment: {
		id: 'all',
		brand: { logo: 'url("assets/0-logo.png")' },
		clips: [
			{
				id: 'c',
				props: {
					image: 'assets/0-logo.png',
					caption: 'see assets/0-logo.png',
					other: 'xassets/0-logo.png'
				}
			}
		]
	} as unknown as StageSegment,
	footage,
	boxes: {},
	fonts: [{ family: 'Inter', url: 'assets/1-Inter.woff2', weight: 400 }],
	css: '.a{background:url(assets/0-logo.png)}',
	audio: 'audio.m4a',
	files: ['assets/0-logo.png', 'assets/1-Inter.woff2'],
	...over
});

describe('resolveLiveManifest', () => {
	const base = 'https://renders.example/previews/x/manifest.json';
	const dir = 'https://renders.example/previews/x/';

	it('makes every file it names a URL against the manifest', () => {
		const m = resolveLiveManifest(manifest(), base);
		expect(m.bundle).toBe(`${dir}player.js`);
		expect(m.styles).toBe(`${dir}player.css`);
		expect(m.audio).toBe(`${dir}audio.m4a`);
		expect(m.footage.talk.url).toBe(`${dir}media/talk.mp4`);
		expect(m.fonts[0].url).toBe(`${dir}assets/1-Inter.woff2`);
		expect(m.css).toBe(`.a{background:url(${dir}assets/0-logo.png)}`);
		const seg = m.segment as unknown as {
			brand: { logo: string };
			clips: { props: Record<string, string> }[];
		};
		expect(seg.brand.logo).toBe(`url("${dir}assets/0-logo.png")`);
		expect(seg.clips[0].props).toEqual({
			image: `${dir}assets/0-logo.png`,
			caption: `see ${dir}assets/0-logo.png`,
			other: 'xassets/0-logo.png'
		});
	});

	it('keeps no styles and no sound as null', () => {
		const m = resolveLiveManifest(manifest({ styles: null, audio: null }), base);
		expect(m.styles).toBeNull();
		expect(m.audio).toBeNull();
	});

	it('refuses another version', () => {
		expect(() => resolveLiveManifest(manifest({ version: 2 as 1 }), base)).toThrow(/version 2/);
	});
});

describe('liveFootageFrames', () => {
	it('gives the stage the ranges and boxes of extraction, with no files', () => {
		const frames = liveFootageFrames(footage, {
			talk: [
				{ first: 10, last: 11, boxes: [box, null] },
				{ first: 50, last: 50, boxes: [box] }
			]
		});
		expect(frames.talk).toEqual({
			url: '',
			first: 10,
			last: 11,
			ranges: [
				{ url: '', first: 10, last: 11, boxes: [box, null] },
				{ url: '', first: 50, last: 50, boxes: [box] }
			],
			total: 300,
			width: 1920,
			height: 1080,
			startFrame: 0,
			subject: true,
			boxes: [box, null]
		});
		expect(frames.mont).toMatchObject({
			first: 0,
			last: -1,
			ranges: [],
			subject: false,
			boxes: undefined
		});
	});
});
