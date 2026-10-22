// The legacy inserts golden: what main renders for projects without "cuts" or "shots". Shared by
// tests/motion/inserts-legacy.test.ts (this branch's sources) and legacy-golden.mjs (any build).
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function ffmpeg(args) {
	const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
	if (r.status !== 0) throw new Error(String(r.stderr));
	return r.stdout;
}

/** Copies the fixture into `dir` and makes its footage (a test pattern with a tone). */
export async function prepareLegacy(dir) {
	await fs.cp(path.join(HERE, 'legacy'), dir, { recursive: true });
	ffmpeg([
		'-f',
		'lavfi',
		'-i',
		'testsrc2=s=320x180:r=25:d=3',
		'-f',
		'lavfi',
		'-i',
		'sine=frequency=440:sample_rate=48000:duration=3',
		'-c:v',
		'libx264',
		'-preset',
		'ultrafast',
		'-pix_fmt',
		'yuv420p',
		'-c:a',
		'aac',
		'-b:a',
		'96k',
		'-shortest',
		path.join(dir, 'talk.mp4')
	]);
}

/** Versions the golden depends on: bytes only match with the same Chromium and ffmpeg. */
export function toolchain(chromium) {
	const ff = spawnSync('ffmpeg', ['-version']);
	const ch = chromium ? spawnSync(chromium, ['--version']) : null;
	return {
		ffmpeg: String(ff.stdout).split('\n')[0].trim(),
		chromium: ch && ch.status === 0 ? String(ch.stdout).trim() : null
	};
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** The manifest without what changes from run to run: render seconds and absolute paths. */
function normalize(manifest) {
	return {
		...manifest,
		clips: manifest.clips.map(({ seconds: _seconds, file, ...rest }) => ({
			...rest,
			file: path.basename(file)
		}))
	};
}

/**
 * Renders the quote demo of the repository at `root` and the legacy fixture (prepared in
 * `fixture`) with `node` (that repository's module exporting loadMotionProject and
 * renderMotionClips) into `out`; returns the sha256 of every file and the normalized manifests.
 */
export async function renderLegacy(node, root, fixture, out) {
	const result = { files: {}, manifests: {} };
	for (const [name, file] of [
		['quote', path.join(root, 'static/demo/quote/quote.vf.json')],
		['legacy', path.join(fixture, 'legacy.vf.json')]
	]) {
		const dir = path.join(out, name);
		const loaded = await node.loadMotionProject(file);
		await node.renderMotionClips(loaded, { output: dir, jobs: 2 });
		for (const f of (await fs.readdir(dir)).sort())
			if (f !== 'manifest.json')
				result.files[`${name}/${f}`] = sha256(await fs.readFile(path.join(dir, f)));
		result.manifests[name] = normalize(
			JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'))
		);
	}
	return result;
}

/** Every project file under `root` without "cuts" or "shots", repository-relative and sorted. */
export async function legacyProjects(root) {
	const skip = new Set(['node_modules', 'dist', '.git', '.svelte-kit', '.visualfries']);
	const walk = async (dir) =>
		(await fs.readdir(dir, { withFileTypes: true })).flatMap((e) =>
			skip.has(e.name) ? [] : [[dir, e]]
		);
	const found = [];
	const queue = [root];
	while (queue.length) {
		for (const [dir, e] of await walk(queue.pop())) {
			const abs = path.join(dir, e.name);
			if (e.isDirectory()) queue.push(abs);
			else if (e.name.endsWith('.vf.json')) {
				const json = JSON.parse(await fs.readFile(abs, 'utf8'));
				if (!json.cuts && !json.shots) found.push(path.relative(root, abs));
			}
		}
	}
	return found.sort();
}

/**
 * What the per-clip render hands on for every clip of every legacy project: the clip data the
 * page loads (footage frames aside, which the render attaches later), the project diagnostics,
 * and the ffmpeg arguments `encode(loaded, clip)` adds to the encode (sound, holdout). Paths
 * under `root` read `<root>`.
 */
export async function legacyStageData(node, root, files, encode) {
	const out = {};
	const strip = (value) => JSON.parse(JSON.stringify(value).split(root).join('<root>'));
	for (const rel of files) {
		try {
			const loaded = await node.loadMotionProject(path.join(root, rel));
			const args = {};
			for (const clip of loaded.resolved.clips) {
				try {
					args[clip.id] = encode(loaded, clip);
				} catch (error) {
					args[clip.id] = { error: error.message };
				}
			}
			out[rel] = strip({
				diagnostics: loaded.resolved.diagnostics,
				clips: loaded.resolved.clips,
				encode: args
			});
		} catch (error) {
			out[rel] = strip({ error: error.message });
		}
	}
	return out;
}
