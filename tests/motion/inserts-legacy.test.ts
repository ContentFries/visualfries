// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as node from '../../src/lib/motion/node.js';
import { prepareLegacy, renderLegacy, toolchain } from './fixtures/inserts/legacy.mjs';

const ROOT = path.resolve(__dirname, '../..');
const GOLDEN = path.join(__dirname, 'fixtures/inserts/legacy.golden.json');
const hasChromium = !!node.findChromium();
const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;

/**
 * Projects without "cuts" or "shots" render exactly as on main: the same bytes in every file and
 * the same manifest. The golden comes from main's build (`legacy-golden.mjs`); bytes only match
 * with the Chromium and ffmpeg it was made with, so other toolchains skip the comparison.
 */
describe.skipIf(!hasChromium || !hasFfmpeg)('legacy inserts are byte-identical to main', () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-legacy-inserts-'));
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('renders the quote demo and the legacy fixture to the same files and manifests', async (ctx) => {
		const golden = JSON.parse(await fs.readFile(GOLDEN, 'utf8'));
		const here = toolchain(await node.chromiumExecutable());
		if (JSON.stringify(here) !== JSON.stringify(golden.toolchain)) ctx.skip();
		await prepareLegacy(path.join(dir, 'fixture'));
		const rendered = await renderLegacy(
			node,
			ROOT,
			path.join(dir, 'fixture'),
			path.join(dir, 'out')
		);
		expect(rendered.manifests).toEqual(golden.manifests);
		expect(rendered.files).toEqual(golden.files);
	}, 300_000);
});
