import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BrandShape, MotionProjectShape, StyleShape } from '$lib/motion/project.js';
import {
	NEUTRAL_BRAND,
	brandTokens,
	contrast,
	readableOn,
	resolveBrand,
	solidColor,
	toHex
} from '$lib/motion/brand.js';
import { BUILTIN_STYLES, mergeLayers, resolveStyle, type StyleLoader } from '$lib/motion/style.js';
import { formatClass, formatTokens, mergeZones, resolveFormat } from '$lib/motion/format.js';
import { SAFE_ZONES } from '$lib/motion/safe-zones.js';
import { resolveMotionProject } from '$lib/motion/resolve.js';
import { Clip } from '$lib/motion/runtime.svelte.js';
import { planMotion } from '$lib/motion/primitives.js';
import { hardCodedColors, loadMotionProject } from '../../src/lib/motion/node.js';

const brandFile = {
	name: 'Acme',
	colors: {
		primary: '#0f62fe',
		accent: '#ffb000',
		background: '#0b0d12',
		surface: '#161a22',
		text: '#f5f7fa',
		muted: '#9aa3b2',
		extra: { sunset: 'linear-gradient(135deg, #ff6f00 0%, #ff2d55 100%)' }
	},
	fonts: {
		heading: { family: 'Acme Display', src: 'fonts/Display.ttf' },
		body: { family: 'Acme Text', src: 'fonts/Text.ttf', weight: '100 900' }
	},
	logo: { mark: { light: 'logo/mark-dark-ink.svg', dark: 'logo/mark-white.svg' } },
	radius: 14
};

describe('brand schema', () => {
	it('accepts a full brand and requires every colour role', () => {
		expect(BrandShape.safeParse(brandFile).success).toBe(true);
		const { muted: _muted, ...colors } = brandFile.colors;
		const missing = BrandShape.safeParse({ ...brandFile, colors });
		expect(missing.success).toBe(false);
		expect(missing.error?.issues[0].path).toEqual(['colors', 'muted']);
	});

	it('rejects unknown keys instead of ignoring a typo', () => {
		const typo = BrandShape.safeParse({ ...brandFile, colours: {} });
		expect(typo.success).toBe(false);
		expect(
			BrandShape.safeParse({ ...brandFile, colors: { ...brandFile.colors, primay: '#000' } })
				.success
		).toBe(false);
	});

	it('takes a path or an inline brand in the project', () => {
		const base = {
			size: [1080, 1920],
			fps: 30,
			clips: [{ id: 'a', block: 'b', from: 0, until: 1 }]
		};
		expect(MotionProjectShape.parse({ ...base, brand: 'brand.json' }).brand).toBe('brand.json');
		expect(MotionProjectShape.parse({ ...base, brand: brandFile }).brand).toMatchObject({
			name: 'Acme'
		});
		expect(MotionProjectShape.safeParse({ ...base, safeZone: 'myspace' }).success).toBe(false);
	});
});

describe('brand tokens', () => {
	const resolved = resolveBrand(BrandShape.parse(brandFile), (f) => `https://x.local/${f}`);

	it('gives every role, extra colour, font, radius and logo a custom property', () => {
		const tokens = brandTokens(resolved);
		expect(tokens).toMatchObject({
			'--brand-primary': '#0f62fe',
			'--brand-accent': '#ffb000',
			'--brand-background': '#0b0d12',
			'--brand-surface': '#161a22',
			'--brand-text': '#f5f7fa',
			'--brand-muted': '#9aa3b2',
			'--brand-extra-sunset': 'linear-gradient(135deg, #ff6f00 0%, #ff2d55 100%)',
			'--brand-font-heading': '"Acme Display", sans-serif',
			'--brand-font-body': '"Acme Text", sans-serif',
			'--brand-font-mono': NEUTRAL_BRAND.fonts.mono,
			'--brand-radius': '14px',
			'--brand-logo-mark-dark': 'url("https://x.local/logo/mark-white.svg")'
		});
		expect(tokens['--brand-logo-full-light']).toBeUndefined();
		expect(resolved.neutral).toBe(false);
		expect(resolved.logo.full).toEqual({ light: null, dark: null });
	});

	it('derives readable text on primary and accent unless the brand sets it', () => {
		// White-ish text on blue, near-black background colour on amber.
		expect(resolved.colors.onPrimary).toBe('#f5f7fa');
		expect(resolved.colors.onAccent).toBe('#0b0d12');
		const set = resolveBrand(
			BrandShape.parse({ ...brandFile, colors: { ...brandFile.colors, onAccent: '#222' } }),
			(f) => f
		);
		expect(set.colors.onAccent).toBe('#222');
		// Neither candidate reads on mid grey: falls back to black or white.
		expect(readableOn('#777777', ['#888888', '#666666'])).toBe('#000000');
	});

	it('the neutral brand carries the built-in look', () => {
		expect(NEUTRAL_BRAND.neutral).toBe(true);
		expect(NEUTRAL_BRAND.colors.accent).toBe('#fbc42d');
		expect(NEUTRAL_BRAND.colors.text).toBe('#ffffff');
		expect(NEUTRAL_BRAND.fonts.body).toBe('Inter, system-ui, sans-serif');
		expect(brandTokens(NEUTRAL_BRAND)['--brand-on-accent']).toBe('#111111');
	});

	it('reads gradients and colour forms', () => {
		expect(solidColor('linear-gradient(90deg, rgb(1, 2, 3), #fff)')).toBe('rgb(1, 2, 3)');
		expect(toHex('linear-gradient(90deg, #abc, #fff)')).toBe('#aabbcc');
		expect(toHex('rgba(255, 0, 16, 0.5)')).toBe('#ff0010');
		expect(toHex('hsl(10 50% 50%)')).toBe('hsl(10 50% 50%)');
		expect(contrast('#000', '#fff')).toBeCloseTo(21);
	});
});

describe('style layering', () => {
	const files: Record<string, unknown> = {
		'/s/mine.json': { name: 'mine', extends: 'kinetic', captions: { preset: 'pill', size: 80 } },
		'/s/calm.json': { extends: './mine.json', energy: 'calm', transitions: ['cut'] },
		'/s/loop-a.json': { extends: './loop-b.json' },
		'/s/loop-b.json': { extends: './loop-a.json' }
	};
	const load: StyleLoader = (ref, from) => {
		const id = path.posix.resolve(from ? path.posix.dirname(from) : '/s', ref);
		if (!(id in files)) throw new Error(`no file ${id}`);
		return { id, data: files[id] };
	};

	it('reserves the built-in names with their energy', () => {
		expect(
			Object.fromEntries(Object.entries(BUILTIN_STYLES).map(([k, v]) => [k, v.energy]))
		).toEqual({
			solid: 'balanced',
			glass: 'balanced',
			clean: 'calm',
			editorial: 'calm',
			kinetic: 'punchy',
			depth: 'balanced',
			brutal: 'punchy'
		});
		expect(resolveStyle('editorial', load)).toMatchObject({
			energy: 'calm',
			layers: ['editorial']
		});
	});

	it('layers built-in, extends chain and project; later wins, objects merge, arrays replace', () => {
		const style = resolveStyle(
			{
				extends: 'calm.json',
				captions: { size: 64 },
				transitions: ['wipe', 'push']
			},
			load
		);
		expect(style.layers).toEqual(['kinetic', '/s/mine.json', '/s/calm.json', '(project)']);
		expect(style.energy).toBe('calm');
		expect(style.name).toBe('mine');
		expect(style.captions).toEqual({ preset: 'pill', size: 64 });
		expect(style.transitions).toEqual(['wipe', 'push']);
		expect('extends' in style).toBe(false);
		expect(mergeLayers({ a: [1, 2], b: { c: 1 } }, { a: [3], b: { d: 2 } })).toEqual({
			a: [3],
			b: { c: 1, d: 2 }
		});
	});

	it('defaults energy to balanced and refuses cycles and bad files', () => {
		expect(resolveStyle({ shots: ['full'] }, load).energy).toBe('balanced');
		expect(() => resolveStyle('loop-a.json', load)).toThrow(/extends itself/);
		files['/s/bad.json'] = { energy: 'wild' };
		expect(() => resolveStyle('bad.json', load)).toThrow(/energy/);
		expect(StyleShape.safeParse({ energy: 'calm', sound: [] }).success).toBe(false);
	});
});

describe('format class and safe insets', () => {
	it('classifies sizes; 4:5 and 3:4 are portrait', () => {
		expect(formatClass(1920, 1080)).toBe('landscape');
		expect(formatClass(1440, 1080)).toBe('landscape');
		expect(formatClass(1080, 1080)).toBe('square');
		expect(formatClass(1080, 1350)).toBe('portrait');
		expect(formatClass(1080, 1440)).toBe('portrait');
		expect(formatClass(1080, 1920)).toBe('portrait');
	});

	it('merges the platform zones into the research figures', () => {
		const vertical = mergeZones(Object.values(SAFE_ZONES['9:16'].platforms));
		expect(vertical).toMatchObject({ top: 288, right: 192, bottom: 672, left: 120 });
		expect(vertical.notch).toEqual({ y: 840, right: 300 });
		expect(mergeZones(Object.values(SAFE_ZONES['1:1'].platforms))).toMatchObject({
			top: 106,
			right: 236,
			bottom: 501,
			left: 101
		});
		expect(mergeZones(Object.values(SAFE_ZONES['16:9'].platforms))).toMatchObject({
			top: 184,
			right: 424,
			bottom: 386,
			left: 200
		});
	});

	it('gives the all-platform insets at the reference sizes', () => {
		expect(resolveFormat([1080, 1920]).safe).toEqual({
			top: 288,
			right: 300,
			bottom: 672,
			left: 120,
			notchY: 840,
			rightUpper: 192
		});
		expect(resolveFormat([1080, 1350])).toMatchObject({
			class: 'portrait',
			aspect: '4:5',
			safe: { top: 68, right: 65, bottom: 68, left: 65, notchY: 1282, rightUpper: 65 }
		});
		expect(resolveFormat([1920, 1080]).safe).toMatchObject({ top: 184, left: 38 });
	});

	it('keeps the landscape zone to landscape players', () => {
		// TikTok's 16:9 figure is a landscape video inside its vertical feed: only on request.
		expect(SAFE_ZONES['16:9'].allFrom).toEqual(['youtube']);
		expect(resolveFormat([1920, 1080]).safe).toEqual({
			top: 184,
			right: 162,
			bottom: 386,
			left: 38,
			notchY: 694,
			rightUpper: 162
		});
		expect(resolveFormat([1920, 1080], 'tiktok').safe).toMatchObject({ right: 424, left: 200 });
		expect(resolveFormat([1280, 720]).safe).toMatchObject({ top: 123, right: 108 });
		expect(SAFE_ZONES['16:9'].notMeasured).toEqual(
			expect.arrayContaining(['LinkedIn feed video', 'X timeline video', 'Facebook feed video'])
		);
	});

	it('scales from the reference size and picks the nearest ratio of the class', () => {
		const big = resolveFormat([1440, 2560]).safe;
		expect(big).toMatchObject({ top: 384, bottom: 896, left: 160, right: 400, notchY: 1120 });
		expect(resolveFormat([720, 1280]).safe.top).toBe(192);
		expect(resolveFormat([1080, 1440]).aspect).toBe('4:5');
		expect(resolveFormat([1440, 1080]).aspect).toBe('16:9');
	});

	it('uses one platform when asked, and says when it has no figure', () => {
		expect(resolveFormat([1080, 1920], 'youtube').safe).toEqual({
			top: 288,
			right: 192,
			bottom: 672,
			left: 48,
			notchY: 1248,
			rightUpper: 192
		});
		expect(resolveFormat([1080, 1920], 'tiktok').safe).toMatchObject({
			right: 300,
			rightUpper: 120
		});
		const meta = resolveFormat([1080, 1080], 'meta');
		expect(meta.fallback).toMatch(/meta publishes no safe zone for 1:1/);
		expect(meta.safe).toMatchObject({ top: 106, left: 101 });
	});

	it('exposes insets as CSS custom properties', () => {
		expect(formatTokens(resolveFormat([1080, 1920]))).toEqual({
			'--safe-top': '288px',
			'--safe-right': '300px',
			'--safe-bottom': '672px',
			'--safe-left': '120px',
			'--safe-right-upper': '192px',
			'--safe-notch-y': '840px'
		});
	});
});

describe('clip.brand, clip.style, clip.format', () => {
	const base = {
		size: [1080, 1350],
		fps: 30,
		clips: [{ id: 'c', block: 'b.svelte', from: 0, until: 1 }]
	};

	it('are neutral without brand and style', () => {
		const r = resolveMotionProject(MotionProjectShape.parse(base), null);
		const clip = new Clip(r.clips[0]);
		expect(clip.brand).toBe(NEUTRAL_BRAND);
		expect(clip.style).toMatchObject({ neutral: true, energy: 'balanced' });
		expect(clip.format).toMatchObject({ class: 'portrait', zone: 'all' });
		expect(r.diagnostics).toEqual([]);
	});

	it('warn once per project when the chosen platform has no zone for the ratio', () => {
		const clips = ['a', 'b', 'c'].map((id) => ({ ...base.clips[0], id }));
		const r = resolveMotionProject(
			MotionProjectShape.parse({ ...base, clips, safeZone: 'tiktok' }),
			null
		);
		expect(r.clips).toHaveLength(3);
		expect(r.diagnostics).toEqual([
			{ level: 'warning', field: 'safeZone', message: expect.stringContaining('tiktok') }
		]);
	});
});

describe('loading brand and style files', () => {
	async function project(extra: object, files: Record<string, string> = {}) {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-brand-'));
		for (const [name, content] of Object.entries(files)) {
			await fs.mkdir(path.dirname(path.join(dir, name)), { recursive: true });
			await fs.writeFile(path.join(dir, name), content);
		}
		await fs.writeFile(
			path.join(dir, 'p.vf.json'),
			JSON.stringify({
				size: [1080, 1920],
				fps: 30,
				clips: [{ id: 'a', block: 'B.svelte', from: 0, until: 1 }],
				...extra
			})
		);
		return { dir, file: path.join(dir, 'p.vf.json') };
	}
	const assets = {
		'brand/fonts/Display.ttf': 'display',
		'brand/fonts/Text.ttf': 'text',
		'brand/logo/mark-dark-ink.svg': '<svg/>',
		'brand/logo/mark-white.svg': '<svg/>'
	};

	it('resolves files relative to the brand file and hashes values and file contents', async () => {
		const a = await project(
			{ brand: 'brand/brand.json', style: { extends: 'kinetic', energy: 'calm' } },
			{ ...assets, 'brand/brand.json': JSON.stringify(brandFile) }
		);
		const loaded = await loadMotionProject(a.file);
		expect(loaded.brand.fonts.map((f) => f.src)).toEqual([
			path.join(a.dir, 'brand/fonts/Display.ttf'),
			path.join(a.dir, 'brand/fonts/Text.ttf')
		]);
		expect(loaded.brand.hash).toMatch(/^[0-9a-f]{12}$/);
		expect(loaded.resolved.clips[0].brand.logo.mark.dark).toContain('/brand/logo/mark-white.svg');
		expect(loaded.style.resolved).toMatchObject({
			energy: 'calm',
			layers: ['kinetic', '(project)']
		});
		expect(loaded.style.hash).toMatch(/^[0-9a-f]{12}$/);

		// Same brand elsewhere: same hash. A changed font file: another hash.
		const b = await project(
			{ brand: 'brand/brand.json', style: { extends: 'kinetic', energy: 'calm' } },
			{ ...assets, 'brand/brand.json': JSON.stringify(brandFile) }
		);
		const again = await loadMotionProject(b.file);
		expect(again.brand.hash).toBe(loaded.brand.hash);
		expect(again.style.hash).toBe(loaded.style.hash);
		await fs.writeFile(path.join(b.dir, 'brand/fonts/Text.ttf'), 'text v2');
		expect((await loadMotionProject(b.file)).brand.hash).not.toBe(loaded.brand.hash);
	});

	it('gives use:motion the energy of the project style', async () => {
		const kinetic = await loadMotionProject((await project({ style: 'kinetic' })).file);
		const clip = new Clip(kinetic.resolved.clips[0]);
		expect(clip.style.energy).toBe('punchy');
		expect(clip.energy).toBe('punchy');
		expect(planMotion(clip, { enter: 'pop' }, 1).energy).toBe('punchy');
		const plain = await loadMotionProject((await project({})).file);
		expect(new Clip(plain.resolved.clips[0]).energy).toBe('balanced');
	});

	it('has no hashes without brand and style', async () => {
		const { file } = await project({});
		const loaded = await loadMotionProject(file);
		expect(loaded.brand).toMatchObject({ hash: null, fonts: [], assets: [] });
		expect(loaded.style.hash).toBeNull();
	});

	it('names what is wrong in a brand or style', async () => {
		const missing = await project({ brand: 'nope.json' });
		await expect(loadMotionProject(missing.file)).rejects.toThrow(/Brand file not found/);
		const bad = await project(
			{ brand: 'brand.json' },
			{ 'brand.json': JSON.stringify({ ...brandFile, radius: -1 }) }
		);
		await expect(loadMotionProject(bad.file)).rejects.toThrow(/radius/);
		const camel = await project(
			{ brand: 'brand.json' },
			{
				'brand.json': JSON.stringify({
					...brandFile,
					colors: { ...brandFile.colors, extra: { woodDark: '#3b2a1a' } }
				})
			}
		);
		await expect(loadMotionProject(camel.file)).rejects.toThrow(
			'colors.extra.woodDark: extra colour names are lowercase letters, digits and dashes ("wood-dark"), as in --brand-extra-wood-dark.'
		);
		const noFont = await project({ brand: brandFile });
		await expect(loadMotionProject(noFont.file)).rejects.toThrow(/file not found: .*Display\.ttf/);
		const style = await project({ style: 'punchy' });
		await expect(loadMotionProject(style.file)).rejects.toThrow(
			/not a built-in style \(solid, glass, clean, editorial, kinetic, depth, brutal\)/
		);
	});
});

describe('hard-coded colours in custom blocks', () => {
	it('lists brand-looking literals and skips black, white and token fallbacks', () => {
		const source = `
<div style="color:#fbc42d; background: var(--brand-surface, #12141b)"></div>
<p>&#8212; {#each items as item}{/each}</p>
<style>
	.a { color: rgba(244, 63, 94, 0.7); box-shadow: 0 0 4px rgba(0,0,0,.5); border-color: #fff; }
	.b { color: var(--brand-text, rgb(1, 2, 3)); fill: #FBC42D; }
	/* #123456 in a comment */
</style>`;
		expect(hardCodedColors(source)).toEqual(['#fbc42d', 'rgba(244, 63, 94, 0.7)']);
	});
});
