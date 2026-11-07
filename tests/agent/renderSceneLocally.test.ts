import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderSceneLocally, type AgentRenderPlan, type LocalRenderOptions } from '$lib/agent';

// These cases all finish before any browser or dev server starts, so they run fast and
// pin the option handling and the early exits of renderSceneLocally.
const scene = {
	id: 'render-locally-test',
	settings: {
		width: 64,
		height: 48,
		duration: 10,
		fps: 10,
		backgroundColor: '#000000',
		trimZones: [{ start: 0, end: 10 }]
	},
	assets: [],
	layers: []
};

const planFor = (engine: AgentRenderPlan['engine']): AgentRenderPlan => ({
	mode: 'final',
	engine,
	requiresDeterministicMedia: engine === 'deterministic-local',
	canUseBrowserPreview: engine === 'browser-preview',
	warnings: [],
	blockers: [],
	media: []
});

let workDir: string;

beforeEach(async () => {
	workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vf-render-test-'));
});

afterEach(async () => {
	await fs.rm(workDir, { recursive: true, force: true });
});

const baseOptions = (overrides: Partial<LocalRenderOptions> = {}): LocalRenderOptions => ({
	scene,
	output: path.join(workDir, 'out'),
	fps: 10,
	frameIndices: [0, 1, 2],
	tmpDir: workDir,
	...overrides
});

const leftoverRenderDirs = async () =>
	(await fs.readdir(workDir)).filter((name) => name.startsWith('visualfries-render-'));

describe('renderSceneLocally before the browser starts', () => {
	it('rejects an unknown image format', async () => {
		await expect(renderSceneLocally(baseOptions({ imageFormat: 'gif' as never }))).rejects.toThrow(
			'imageFormat must be png, jpg, or jpeg.'
		);
	});

	it('rejects an invalid image quality', async () => {
		await expect(renderSceneLocally(baseOptions({ imageQuality: -1 }))).rejects.toThrow('>= 0');
	});

	it('rejects a scene that fails validation', async () => {
		await expect(renderSceneLocally(baseOptions({ scene: { id: 1 } }))).rejects.toThrow();
	});

	it('fails when trim zones remove every requested frame of a video render', async () => {
		await expect(renderSceneLocally(baseOptions())).rejects.toThrow(
			'All requested frames are removed by trimZones; no frames to encode.'
		);
		expect(await leftoverRenderDirs()).toEqual([]);
	});

	it('returns an empty result when frames-only trim removes everything', async () => {
		const output = path.join(workDir, 'frames-out');
		const result = await renderSceneLocally(baseOptions({ framesOnly: true, output }));
		expect(result).toEqual({
			ok: true,
			scene: { id: 'render-locally-test', width: 64, height: 48, duration: 10, fps: 10 },
			frames: {
				count: 0,
				dir: path.resolve(output),
				items: [],
				transport: 'range-binding',
				skippedDuplicates: 0
			},
			output: path.resolve(output),
			encoded: false,
			encoding: { mode: 'none' },
			audio: { mode: 'none', selectedSources: 0, skippedSources: 0, plannedSources: 0 },
			mediaDiagnosticsPath: null,
			mediaDiagnostics: []
		});
		expect((await fs.stat(output)).isDirectory()).toBe(true);
		expect(await leftoverRenderDirs()).toEqual([]);
	});

	it('describes the skipped render in media diagnostics when requested', async () => {
		const result = await renderSceneLocally(
			baseOptions({
				framesOnly: true,
				mediaDiagnostics: true,
				serverRendererMode: 'webgl',
				renderPlan: planFor('browser-preview')
			})
		);
		expect(result.mediaDiagnosticsPath).toBeNull();
		expect(result.mediaDiagnostics).toEqual([
			{
				kind: 'visualfries-local-render',
				engine: 'browser-preview',
				frameCount: 0,
				requestedFrameCount: 3,
				trimAwareRanges: [],
				serverRendererMode: 'webgl',
				transport: 'range-binding'
			}
		]);
	});

	it('keeps render temp files only when keepFrames is set', async () => {
		await renderSceneLocally(baseOptions({ framesOnly: true, keepFrames: true }));
		expect(await leftoverRenderDirs()).toHaveLength(1);
	});

	it('needs at least one frame for a deterministic media render', async () => {
		await expect(
			renderSceneLocally(
				baseOptions({ frameIndices: [], renderPlan: planFor('deterministic-local') })
			)
		).rejects.toThrow('Local deterministic media render requires at least one frame.');
		expect(await leftoverRenderDirs()).toEqual([]);
	});
});
