import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';

import { compileProductionPlan } from '../../src/lib/agent/productionPlan.js';

const exec = promisify(execFile);
const cleanup: string[] = [];

afterEach(async () => {
	await Promise.all(cleanup.splice(0).map((item) => fs.rm(item, { recursive: true, force: true })));
});

const basePlan = {
	version: 1 as const,
	id: 'production-test',
	settings: { width: 1080, height: 1920, duration: 4, fps: 30, backgroundColor: '#000000' },
	beats: [
		{
			id: 'hook',
			start: 0,
			end: 4,
			media: [],
			overlays: [{ text: 'NOT DEAD.', start: 1, end: 2, style: 'verdict-slam' as const }]
		}
	],
	audio: [{ id: 'voice', url: './voice.wav', startAt: 0, endAt: 4, volume: 1 }],
	transitions: [{ time: 2, style: 'focus-pull' as const }],
	qa: { framesAt: [0, 1.5, 3.9], maxLeadingSilence: 0.1, requiredText: ['NOT DEAD.'] }
};

describe('production plan compiler', () => {
	it('compiles named beats, exact audio, rich overlays, transitions, and QA frames', async () => {
		const result = await compileProductionPlan({
			plan: basePlan,
			planPath: '/tmp/package/plan.json'
		});
		expect(result.scene.audioTracks[0]).toMatchObject({ id: 'voice', startAt: 0, endAt: 4 });
		expect(result.scene.layers.map((layer) => layer.id)).toEqual([
			'beat-hook-overlay-hook-overlay-1',
			'production-transitions'
		]);
		expect(result.scene.layers[0].components[0]).toMatchObject({ type: 'IMAGE' });
		expect(result.generatedAssets[0]).toContain('.svg');
		expect(result.scene.layers[1].components[0].name).toContain('focus-pull');
		expect(result.qaFrameIndices).toEqual([0, 45, 117]);
	});

	it('turns one trimmed video cue with freezeAt into deterministic motion plus a held still', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'visualfries-production-'));
		cleanup.push(root);
		const video = path.join(root, 'source.mp4');
		await exec(process.env.FFMPEG_PATH || 'ffmpeg', [
			'-y',
			'-f',
			'lavfi',
			'-i',
			'color=c=red:s=180x320:d=1:r=30',
			'-c:v',
			'libx264',
			'-pix_fmt',
			'yuv420p',
			video
		]);
		const result = await compileProductionPlan({
			plan: {
				...basePlan,
				beats: [
					{
						id: 'hook',
						start: 0,
						end: 1,
						media: [{ id: 'funeral', url: video, type: 'VIDEO', start: 0, end: 1, freezeAt: 0.4 }],
						overlays: basePlan.beats[0].overlays.map((overlay) => ({ ...overlay, end: 1.8 }))
					}
				]
			},
			planPath: path.join(root, 'plan.json'),
			generatedAssetsDir: path.join(root, 'generated')
		});
		const media = result.scene.layers.find((layer) => layer.id === 'beat-hook-media');
		expect(media?.components.map((component) => component.type)).toEqual(['VIDEO', 'IMAGE']);
		expect(media?.components[0].timeline).toEqual({ startAt: 0, endAt: 0.4 });
		expect(media?.components[1].timeline).toEqual({ startAt: 0.4, endAt: 1 });
		expect(result.generatedAssets).toHaveLength(2);
		const freezeAsset = result.generatedAssets.find((item) => item.endsWith('.jpg'));
		expect(freezeAsset).toBeDefined();
		expect((await fs.stat(freezeAsset!)).size).toBeGreaterThan(0);
	});

	it('fails when a declared acceptance text is absent', async () => {
		const root = await fs.mkdtemp(path.join(os.tmpdir(), 'visualfries-production-invalid-'));
		cleanup.push(root);
		await expect(
			compileProductionPlan({
				plan: { ...basePlan, qa: { ...basePlan.qa, requiredText: ['MISSING'] } },
				planPath: path.join(root, 'plan.json')
			})
		).rejects.toThrow('required text');
	});
});
