// @vitest-environment node
import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { MotionProjectShape } from '$lib/motion/project.js';
import { bundleMotionProject, loadMotionProject } from '../../src/lib/motion/node.js';

// The project's CSS list was called `styles` before `style` (the video style) existed; it is now
// `css`, and `styles` stays accepted with the same behaviour.
describe('css and its old name styles', () => {
	async function project(extra: object, files: Record<string, string> = {}) {
		const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-css-'));
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

	it('reads an old project with "styles" exactly like "css"', async () => {
		const files = {
			'B.svelte': '<div class="t">x</div>',
			'theme/film.css': '.t { color: red; background: url(grain.png); }',
			'theme/grain.png': 'png'
		};
		const bundled = async (extra: object) => {
			const { file } = await project(extra, files);
			const loaded = await loadMotionProject(file);
			const bundle = await bundleMotionProject(loaded, loaded.resolved.clips);
			const html = await fs.readFile(bundle.html, 'utf8');
			await fs.rm(bundle.dir, { recursive: true, force: true });
			const dir = path.dirname(file);
			return {
				project: loaded.project,
				resolved: loaded.resolved,
				css: html.match(/window\.__vfCss=("(?:[^"\\]|\\.)*")/)?.[1].replaceAll(dir, '<dir>'),
				files: bundle.files.map((f) => path.relative(dir, f))
			};
		};
		const old = await bundled({ styles: ['theme/film.css'] });
		const now = await bundled({ css: ['theme/film.css'] });
		expect(old.project).toEqual(now.project);
		expect(old.project).not.toHaveProperty('styles');
		expect(old.resolved).toEqual(now.resolved);
		expect(now.css).toContain('color: red');
		expect(old.css).toBe(now.css);
		expect(old.files).toEqual(now.files);
		expect(now.files).toContain(path.join('theme', 'grain.png'));

		const both = MotionProjectShape.safeParse({
			size: [1080, 1920],
			fps: 30,
			css: ['a.css'],
			styles: ['b.css'],
			clips: [{ id: 'a', block: 'B.svelte', from: 0, until: 1 }]
		});
		expect(both.success).toBe(false);
		expect(both.error?.issues[0]).toMatchObject({ path: ['styles'] });
		expect(both.error?.issues[0].message).toMatch(/old name of "css"/);
	});
});
