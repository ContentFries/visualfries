// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
	bundleMotionProject,
	loadMotionProject,
	motionProgram
} from '../../src/lib/motion/node.js';

const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/**
 * A block that imports `pkg` and the addon `pkg/addons/thing.js` (which its `exports` maps to
 * `extra/`, and which imports `pkg` itself, as three's addons do).
 */
const USES = `<script>
	import { NAME } from 'pkg';
	import { THING } from 'pkg/addons/thing.js';
</script>
<b>{NAME} {THING}</b>`;

const dirs: string[] = [];
afterEach(() => {
	for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** Writes `files` (path → text) under a new temp folder and returns it. */
function tree(files: Record<string, string>): string {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-packages-'));
	dirs.push(root);
	for (const [name, text] of Object.entries(files)) {
		fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
		fs.writeFileSync(path.join(root, name), text);
	}
	return root;
}

/** A tiny package `pkg` (version `version`) under `at` (a node_modules folder). */
function fakePackage(at: string, version = '1.0.0'): Record<string, string> {
	return {
		[`${at}/pkg/package.json`]: JSON.stringify({
			name: 'pkg',
			version,
			type: 'module',
			exports: { '.': './index.js', './addons/*': './extra/*' }
		}),
		[`${at}/pkg/index.js`]: `export const NAME = 'pkg-main-${version}';\n`,
		[`${at}/pkg/extra/thing.js`]: `import { NAME } from 'pkg';\nexport const THING = NAME + '-thing';\n`
	};
}

const project = (block = 'blocks/Uses.svelte') =>
	JSON.stringify({
		size: [64, 64],
		fps: 30,
		clips: [{ id: 'uses', block, from: 0, until: 1 }]
	});

async function bundle(file: string): Promise<string> {
	const loaded = await loadMotionProject(file);
	const out = await bundleMotionProject(loaded, loaded.resolved.clips);
	dirs.push(out.dir);
	return fs.readFileSync(path.join(out.dir, 'bundle.js'), 'utf8');
}

describe('packages a block imports', () => {
	it("are found in the project's node_modules, with subpaths the package exports", async () => {
		const root = tree({
			'p.vf.json': project(),
			'blocks/Uses.svelte': USES,
			...fakePackage('node_modules')
		});
		const js = await bundle(path.join(root, 'p.vf.json'));
		expect(js).toContain('pkg-main-1.0.0');
		expect(js).toContain('-thing');
	});

	it('are found in node_modules of a folder above the project', async () => {
		const root = tree({
			'videos/teaser/p.vf.json': project(),
			'videos/teaser/blocks/Uses.svelte': USES,
			...fakePackage('node_modules')
		});
		expect(await bundle(path.join(root, 'videos/teaser/p.vf.json'))).toContain('pkg-main-1.0.0');
	});

	it('name the block and say how to install a package that is missing', async () => {
		const root = tree({ 'p.vf.json': project(), 'blocks/Uses.svelte': USES });
		const error = await bundle(path.join(root, 'p.vf.json')).catch((e: Error) => e);
		expect(error).toBeInstanceOf(Error);
		const message = (error as Error).message;
		expect(message).toMatch(/blocks\/Uses\.svelte imports "pkg", which is not installed/);
		expect(message).toMatch(/npm install pkg/);
		// The addon import names the same package, once.
		expect(message.match(/npm install pkg/g)).toHaveLength(1);
	});

	it('keep the bundler error for a subpath an installed package does not export', async () => {
		const root = tree({
			'p.vf.json': project(),
			'blocks/Uses.svelte': `<script>import { X } from 'pkg/hidden.js';</script><b>{X}</b>`,
			...fakePackage('node_modules')
		});
		const error = await bundle(path.join(root, 'p.vf.json')).catch((e: Error) => e);
		expect((error as Error).message).toMatch(/pkg\/hidden\.js/);
		expect((error as Error).message).not.toMatch(/not installed/);
	});

	it("never replace VisualFries's own svelte and gsap with the project's copies", async () => {
		// Copies that would break the stage: a second Svelte runtime, a second GSAP.
		const fake = (name: string) => ({
			[`node_modules/${name}/package.json`]: JSON.stringify({
				name,
				version: '0.0.0',
				type: 'module',
				exports: { '.': './any.js', './*': './any.js' }
			}),
			[`node_modules/${name}/any.js`]: `globalThis.FAKE_${name.toUpperCase()} = 1;\nexport const gsap = {};\nexport const onMount = () => {};\n`
		});
		const root = tree({
			'p.vf.json': project('blocks/Own.svelte'),
			'blocks/Own.svelte': `<script>
	import { onMount } from 'svelte';
	import { gsap } from 'gsap';
	let x = $state(0);
	onMount(() => gsap.set({}, {}));
</script>
<b>{x}</b>`,
			...fake('svelte'),
			...fake('gsap')
		});
		const js = await bundle(path.join(root, 'p.vf.json'));
		expect(js).not.toContain('FAKE_SVELTE');
		expect(js).not.toContain('FAKE_GSAP');
	});
});

describe.skipIf(!hasFfmpeg)('hashes of the packages a block imports', () => {
	it('change with the package files, so a new version renders again', async () => {
		const root = tree({
			'p.vf.json': JSON.stringify({
				size: [32, 32],
				fps: 30,
				footage: { v: { src: 'v.mp4' } },
				cuts: [{ source: 'v', in: 0, out: 1 }],
				clips: [{ id: 'uses', block: 'blocks/Uses.svelte', from: 0.2, until: 0.8 }]
			}),
			'blocks/Uses.svelte': USES,
			...fakePackage('node_modules')
		});
		spawnSync('ffmpeg', [
			...['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=black:s=32x32:r=30:d=1'],
			...['-pix_fmt', 'yuv420p', path.join(root, 'v.mp4')]
		]);
		const hashes = async () => {
			const { program } = await motionProgram(
				await loadMotionProject(path.join(root, 'p.vf.json'))
			);
			return {
				segment: program.segments[0].hash,
				block: program.hashes.assets['blocks/Uses.svelte']
			};
		};
		const before = await hashes();
		expect(await hashes()).toEqual(before);
		// A version bump: the package's files change.
		for (const [name, text] of Object.entries(fakePackage('node_modules', '1.1.0')))
			fs.writeFileSync(path.join(root, name), text);
		const bumped = await hashes();
		expect(bumped.block).not.toBe(before.block);
		expect(bumped.segment).not.toBe(before.segment);
		// An addon file alone counts too.
		fs.appendFileSync(path.join(root, 'node_modules/pkg/extra/thing.js'), '// patched\n');
		const addon = await hashes();
		expect(addon.block).not.toBe(bumped.block);
		expect(addon.segment).not.toBe(bumped.segment);
	});
});
