// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MotionProjectShape } from '$lib/motion/project.js';
import { propFiles } from '$lib/motion/program.js';
import { propFileRefs, resolveMotionProject, withFileUrls } from '$lib/motion/resolve.js';
import {
	bundleMotionProject,
	findChromium,
	loadMotionProject,
	motionProgram,
	renderStills
} from '../../src/lib/motion/node.js';
import { renderProgramStills } from '../../src/lib/motion/program-node.js';

const hasChromium = !!findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/** A block that fills the frame with the picture `props.pic` names. */
const BLOCK = `<script>
	import { useClip, useReady } from 'visualfries/motion';
	const clip = useClip();
	const img = new Image();
	img.src = clip.props.pic.src;
	useReady(img.decode());
</script>
<img src={clip.props.pic.src} alt="" style="position:absolute;inset:0;width:100%;height:100%" />
`;

/** RGBA of one pixel of a PNG, decoded by ffmpeg. */
function pixel(png: Buffer, x: number, y: number, width: number): number[] {
	const raw = spawnSync(
		'ffmpeg',
		['-v', 'error', '-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1'],
		{ input: png }
	).stdout;
	const i = (y * width + x) * 4;
	return [...raw.subarray(i, i + 4)];
}

/** The picture's red, give or take the colour conversion of the PNG. */
const red = ([r, g, b]: number[]) => r > 240 && g < 16 && b < 16;

async function project(clip: object, top: object = {}) {
	const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-prop-files-'));
	await fs.mkdir(path.join(dir, 'assets'));
	await fs.writeFile(path.join(dir, 'Pic.svelte'), BLOCK);
	if (hasFfmpeg)
		spawnSync('ffmpeg', [
			...['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=0xff0000:s=16x16'],
			...['-frames:v', '1', path.join(dir, 'assets', 'red.png')]
		]);
	await fs.writeFile(
		path.join(dir, 'p.vf.json'),
		JSON.stringify({
			size: [64, 36],
			fps: 30,
			background: '#000000',
			clips: [{ id: 'pic', block: 'Pic.svelte', from: 0, until: 0.5, ...clip }],
			...top
		})
	);
	return { dir, file: path.join(dir, 'p.vf.json') };
}

describe('project files in block props', () => {
	it('finds every { file } in props and swaps each for a URL', () => {
		const props = {
			title: 'Home',
			pic: { src: { file: 'assets/red.png' } },
			items: [{ icon: { file: 'assets/a.svg' } }, { icon: 'x.png' }],
			// Not a file reference: another key next to `file`.
			doc: { file: 'README.md', lines: 3 }
		};
		expect(propFileRefs(props)).toEqual([
			{ at: 'pic.src', file: 'assets/red.png' },
			{ at: 'items[0].icon', file: 'assets/a.svg' }
		]);
		expect(withFileUrls(props, (f) => `/served/${f}`)).toEqual({
			...props,
			pic: { src: '/served/assets/red.png' },
			items: [{ icon: '/served/assets/a.svg' }, { icon: 'x.png' }]
		});
		const plain = { title: 'Home' };
		expect(withFileUrls(plain, () => 'x')).toBe(plain);
	});

	it('reports a file that cannot be served as an error of the clip, with its path', async () => {
		const missing = await project({ props: { pic: { src: { file: 'assets/gone.png' } } } });
		const loaded = await loadMotionProject(missing.file);
		expect(loaded.resolved.diagnostics).toEqual([
			{
				level: 'error',
				clip: 'pic',
				field: 'props.pic.src',
				message: `File not found: ${path.join(missing.dir, 'assets', 'gone.png')} ("assets/gone.png", relative to the project folder).`
			}
		]);
		// `check` reads the program's diagnostics.
		const { program } = await motionProgram(loaded);
		expect(program.diagnostics).toEqual(loaded.resolved.diagnostics);
		await expect(renderStills(loaded, [{ clip: 'pic', at: '0' }])).rejects.toThrow(/gone\.png/);

		const outside = await project({ props: { pic: { src: { file: '../secret.png' } } } });
		const loose = await loadMotionProject(outside.file);
		expect(loose.resolved.diagnostics[0].message).toBe(
			`"../secret.png" is not inside the project folder (${outside.dir}); props can name only files inside it.`
		);
		// The page is never handed the path, even when the clip is bundled anyway.
		await expect(bundleMotionProject(loose, loose.resolved.clips)).rejects.toThrow(
			/Clip "pic": props: "\.\.\/secret\.png" is not inside the project folder/
		);
	});

	it('names URLs, unreadable paths and objects with "file" next to other keys', async () => {
		const p = await project({
			props: {
				web: { file: 'https://example.com/a.png' },
				bad: { file: 'assets/a\u0000.png' },
				doc: { file: 'README.md', lines: 3 }
			}
		});
		const loaded = await loadMotionProject(p.file);
		expect(loaded.resolved.diagnostics.map((d) => [d.level, d.field, d.message])).toEqual([
			['error', 'props.web', expect.stringMatching(/^"https:\/\/example\.com\/a\.png" is a URL/)],
			['error', 'props.bad', expect.stringContaining('Cannot read "assets/a\u0000.png": ')],
			['warning', 'props.doc', expect.stringMatching(/^This object has "file" next to other keys/)]
		]);
	});

	it('hands each page its own copy of the props, however often the project is bundled', async () => {
		const p = await project({ props: { pic: { src: { file: 'assets/plain' } } } });
		await fs.writeFile(path.join(p.dir, 'assets', 'plain'), 'one');
		const loaded = await loadMotionProject(p.file);
		const abs = path.join(p.dir, 'assets', 'plain');
		for (let i = 0; i < 2; i++) {
			const bundle = await bundleMotionProject(loaded, loaded.resolved.clips);
			await fs.rm(bundle.dir, { recursive: true, force: true });
			expect(bundle.files).toContain(abs);
			expect(bundle.props.pic).toEqual({ pic: { src: expect.stringMatching(/\/assets\/plain$/) } });
		}
		// The resolved clips keep the path as written.
		expect(loaded.resolved.clips[0].props).toEqual({ pic: { src: { file: 'assets/plain' } } });
	});

	it('hashes every file props name, with or without an extension', async () => {
		expect(propFiles([{ logo: { file: 'assets/logo' }, title: 'Home' }])).toEqual(['assets/logo']);
		const p = await project({ props: { pic: { src: { file: 'assets/logo' } } } });
		await fs.writeFile(path.join(p.dir, 'assets', 'logo'), 'one');
		const hash = async () =>
			(await motionProgram(await loadMotionProject(p.file))).program.hashes.assets['assets/logo'];
		const before = await hash();
		expect(before).toBeTruthy();
		await fs.writeFile(path.join(p.dir, 'assets', 'logo'), 'two');
		expect(await hash()).not.toBe(before);
	});

	it('resolves exactly as before when the files are not checked (in the browser)', () => {
		const p = MotionProjectShape.parse({
			size: [64, 36],
			fps: 30,
			clips: [
				{ id: 'pic', block: 'Pic.svelte', from: 0, until: 1, props: { pic: { file: 'a.png' } } }
			]
		});
		const r = resolveMotionProject(p, null);
		expect(r.diagnostics).toEqual([]);
		expect(r.clips[0].props).toEqual({ pic: { file: 'a.png' } });
	});

	it.skipIf(!hasChromium || !hasFfmpeg)(
		'serves the file to the page in a still of a clip and of a program',
		async () => {
			const props = { props: { pic: { src: { file: 'assets/red.png' } } } };
			const clip = await project(props);
			const [still] = await renderStills(await loadMotionProject(clip.file), [
				{ clip: 'pic', at: '0' }
			]);
			expect(red(pixel(still.png, 32, 18, 64))).toBe(true);

			const program = await project(props, {
				duration: 1,
				shots: [{ shot: 'full', from: 0, until: 1 }]
			});
			const loaded = await loadMotionProject(program.file);
			const [frame] = await renderProgramStills(loaded, [{ at: '0.1s' }]);
			expect(red(pixel(frame.png, 32, 18, 64))).toBe(true);
			// The resolved program keeps the path as written: no machine-specific URL in it.
			expect(loaded.resolved.clips[0].props).toEqual(props.props);
		},
		60000
	);
});
