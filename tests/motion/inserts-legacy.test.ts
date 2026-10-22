// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as node from '../../src/lib/motion/node.js';
import { pathToFileURL } from 'node:url';
import {
	legacyStageData,
	prepareLegacy,
	renderLegacy,
	toolchain
} from './fixtures/inserts/legacy.mjs';

const ROOT = path.resolve(__dirname, '../..');
const GOLDEN = path.join(__dirname, 'fixtures/inserts/legacy.golden.json');
const STAGE = path.join(__dirname, 'fixtures/inserts/legacy-stage.snapshot.json');
/** A checkout of main's build (dist and static/demo/quote) to render against, as CI sets it. */
const MAIN = process.env.VF_MAIN_ROOT;
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

/**
 * Everything the per-clip render decides before a browser draws: the clip data each page loads,
 * the diagnostics, and the ffmpeg arguments for sound (and, new, holdout), for every repository
 * project without "cuts" or "shots", as main's build gives them. Runs everywhere.
 */
describe('legacy clips load and encode as on main', () => {
	it('gives the same clip data, diagnostics and encode arguments for every project', async () => {
		const snapshot = JSON.parse(await fs.readFile(STAGE, 'utf8'));
		const now = await legacyStageData(node, ROOT, Object.keys(snapshot), node.encodeInputs);
		expect(Object.keys(snapshot).length).toBeGreaterThan(20);
		// Compared as JSON text: same keys in the same order, same numbers to the last digit.
		for (const file of Object.keys(snapshot))
			expect(JSON.stringify(now[file]), file).toBe(JSON.stringify(snapshot[file]));
	});
});

/**
 * With main's build beside this one (CI), the legacy renders of both are compared directly on
 * the same Chromium and ffmpeg, whatever toolchain the stored golden came from.
 */
describe.skipIf(!MAIN)("legacy inserts against main's build", () => {
	let dir: string;
	beforeAll(async () => {
		dir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-legacy-main-'));
	});
	afterAll(async () => {
		await fs.rm(dir, { recursive: true, force: true });
	});

	it('renders the same bytes and manifests as main', async () => {
		// Asked for by CI: missing tools fail the comparison instead of skipping it.
		expect(hasChromium && hasFfmpeg, 'Chromium and ffmpeg').toBe(true);
		const main = await import(pathToFileURL(path.join(MAIN!, 'dist/motion/node.js')).href);
		await prepareLegacy(path.join(dir, 'fixture'));
		const want = await renderLegacy(main, MAIN, path.join(dir, 'fixture'), path.join(dir, 'main'));
		const got = await renderLegacy(node, ROOT, path.join(dir, 'fixture'), path.join(dir, 'here'));
		expect(got.manifests).toEqual(want.manifests);
		expect(got.files).toEqual(want.files);
	}, 300_000);
});
