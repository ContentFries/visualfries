import { describe, expect, it } from 'vitest';
import {
	addAgentBrollSequence,
	addAgentTextOverlays,
	addAgentTransitions,
	applyAgentCueFile,
	createAgentCuePreset,
	createCaptionScene,
	getAgentCatalog,
	inspectScene,
	mergeAgentCueFiles,
	normalizeTranscript,
	parseSubtitleText,
	validateAgentCueFile
} from '$lib/agent';
import { SceneShape } from '$lib';

describe('agent caption scene helpers', () => {
	it('normalizes word-level transcript input into subtitle segments', () => {
		const subtitles = normalizeTranscript({
			words: [
				{ text: 'Hello', start: 0, end: 0.3 },
				{ text: 'world', start: 0.31, end: 0.8 }
			]
		});

		expect(subtitles).toHaveLength(1);
		expect(subtitles[0].text).toBe('Hello world');
		expect(subtitles[0].words?.[0]).toEqual(['Hello', 0, 0.3]);
	});

	it('falls back to word-level transcript input when segment arrays are empty', () => {
		const subtitles = normalizeTranscript({
			segments: [],
			words: [
				{ text: 'Fallback', start: 0, end: 0.4 },
				{ text: 'works', start: 0.4, end: 0.8 }
			]
		});

		expect(subtitles).toHaveLength(1);
		expect(subtitles[0].text).toBe('Fallback works');
	});

	it('parses SRT and VTT transcript text for caption scenes', () => {
		const srt = parseSubtitleText(
			`1
00:00:00,000 --> 00:00:01,200
The hook

2
00:00:01,200 --> 00:00:02,800
The mechanism`,
			'srt'
		);
		const vtt = parseSubtitleText(
			`WEBVTT

00:00:00.000 --> 00:00:01.200 align:center
The hook`,
			'vtt'
		);

		expect(normalizeTranscript(srt)[0]).toMatchObject({
			text: 'The hook',
			start_at: 0,
			end_at: 1.2
		});
		expect(normalizeTranscript(vtt)[0]).toMatchObject({
			text: 'The hook',
			start_at: 0,
			end_at: 1.2
		});
	});

	it('creates a valid VisualFries scene for captioning without ContentFries UI', () => {
		const scene = createCaptionScene({
			id: 'test-caption-scene',
			video: {
				url: 'https://example.com/input.mp4',
				assetId: 'video-1'
			},
			transcript: {
				segments: [
					{
						id: 's1',
						text: 'This is the hook',
						start: 0,
						end: 1.2,
						words: [
							{ text: 'This', start: 0, end: 0.2 },
							{ text: 'is', start: 0.2, end: 0.35 },
							{ text: 'the', start: 0.35, end: 0.5 },
							{ text: 'hook', start: 0.5, end: 1.2 }
						]
					}
				]
			},
			preset: 'hidden-engine-center'
		});

		expect(() => SceneShape.parse(scene)).not.toThrow();
		expect(scene.assets[0].id).toBe('video-1');
		expect(scene.settings.duration).toBe(1.2);
		expect(scene.settings.subtitles?.data?.['video-1']?.en?.[0].text).toBe('This is the hook');
		expect(
			scene.layers.flatMap((layer) => layer.components).map((component) => component.type)
		).toEqual(['VIDEO', 'SUBTITLES']);
	});

	it('inspects generated scenes for agent-readable issues', () => {
		const scene = createCaptionScene({
			video: { url: 'https://example.com/input.mp4' },
			transcript: [{ text: 'Caption test', start: 0, end: 1 }]
		});

		const report = inspectScene(scene);
		expect(report.valid).toBe(true);
		expect(report.issues).toEqual([]);
		expect(report.summary.components).toBe(2);
	});

	it('warns when a subtitles component requests a missing language payload', () => {
		const scene = createCaptionScene({
			video: { url: 'https://example.com/input.mp4', assetId: 'video-1' },
			transcript: [{ text: 'Caption test', start: 0, end: 1 }],
			language: 'en'
		});
		const subtitlesComponent = scene.layers
			.flatMap((layer) => layer.components)
			.find((component) => component.type === 'SUBTITLES');
		if (subtitlesComponent?.type === 'SUBTITLES')
			subtitlesComponent.source = { assetId: 'video-1', languageCode: 'de' };

		const report = inspectScene(scene);

		expect(report.valid).toBe(true);
		expect(report.issues).toEqual([
			expect.objectContaining({
				level: 'warning',
				type: 'subtitle-language-data-missing',
				componentId: subtitlesComponent?.id
			})
		]);
	});

	it('adds validated short-form overlay cues to an agent scene', () => {
		const scene = createCaptionScene({
			video: { url: 'https://example.com/input.mp4' },
			transcript: [{ text: 'Overlay test', start: 0, end: 1 }]
		});

		const withOverlays = addAgentTextOverlays({
			scene,
			overlays: [
				{ text: 'LOVE THIS 😍', start: 0, end: 0.5, style: 'pop-label' },
				{ text: 'NECK 🤯', start: 0.5, end: 1, style: 'shock-word' },
				{ text: '1M PROFIT', start: 1, end: 1.6, style: 'metric-badge' },
				{ text: 'YOUR MOVE', start: 1.6, end: 2, style: 'cta-card' }
			]
		});

		expect(() => SceneShape.parse(withOverlays)).not.toThrow();
		expect(withOverlays.layers.at(-1)?.id).toBe('layer-agent-overlays');
		expect(withOverlays.layers.at(-1)?.components).toHaveLength(4);
		expect(withOverlays.layers.at(-1)?.components[1].animations?.list?.[0]?.animation).toBeTruthy();
	});

	it('adds validated b-roll media cues below captions and overlays', () => {
		const scene = createCaptionScene({
			video: { url: 'https://example.com/input.mp4' },
			transcript: [{ text: 'B-roll test', start: 0, end: 2 }]
		});

		const withBroll = addAgentBrollSequence({
			scene,
			cues: [
				{ url: 'https://example.com/clinic.mp4', start: 0, end: 1, type: 'VIDEO' },
				{
					url: 'https://example.com/chart.png',
					start: 1,
					end: 2,
					type: 'IMAGE',
					motion: 'slow-zoom-in'
				}
			]
		});

		expect(() => SceneShape.parse(withBroll)).not.toThrow();
		expect(withBroll.layers.at(-1)?.id).toBe('layer-agent-broll');
		expect(withBroll.layers.at(-1)?.order).toBe(5);
		expect(withBroll.layers.at(-1)?.components.map((component) => component.type)).toEqual([
			'VIDEO',
			'IMAGE'
		]);
		expect(withBroll.assets.map((asset) => asset.id)).toContain('agent-broll-1-asset');
		expect(withBroll.layers.at(-1)?.components[1].animations?.list?.length).toBeGreaterThanOrEqual(
			2
		);
	});

	it('adds validated transition cues as full-frame shape overlays', () => {
		const scene = createCaptionScene({
			video: { url: 'https://example.com/input.mp4' },
			transcript: [{ text: 'Transition test', start: 0, end: 2 }]
		});

		const withTransitions = addAgentTransitions({
			scene,
			transitions: [
				{ time: 0.7, style: 'dip-to-black' },
				{ time: 1.4, style: 'swipe-left', color: '#04483D' }
			]
		});

		const transitionLayer = withTransitions.layers.at(-1);
		expect(() => SceneShape.parse(withTransitions)).not.toThrow();
		expect(transitionLayer?.id).toBe('layer-agent-transitions');
		expect(transitionLayer?.order).toBe(95);
		expect(transitionLayer?.components.map((component) => component.type)).toEqual([
			'SHAPE',
			'SHAPE'
		]);
		expect(transitionLayer?.components[0].animations?.list?.[0]?.animation).toBeTruthy();
	});

	it('applies cue files through the reusable agent API', () => {
		const scene = createCaptionScene({
			video: { url: 'https://example.com/input.mp4' },
			transcript: [{ text: 'Cue file test', start: 0, end: 3 }]
		});

		const result = applyAgentCueFile({
			scene,
			cues: {
				broll: [{ url: './assets/clinic.mp4', start: 0, end: 1, type: 'VIDEO' }],
				overlays: [{ text: 'HOOK', start: 0.2, end: 0.9, style: 'shock-word' }],
				transitions: [{ time: 1, style: 'dip-to-black' }]
			},
			cueFilePath: '/tmp/package/cues.json'
		});

		expect(() => SceneShape.parse(result.scene)).not.toThrow();
		expect(result.applied).toEqual({ broll: 1, overlays: 1, transitions: 1 });
		expect(result.scene.layers.map((layer) => layer.id)).toContain('layer-agent-broll');
		expect(result.scene.assets.at(-1)?.url).toContain('/tmp/package/assets/clinic.mp4');
	});

	it('creates starter cue presets for short-form agent videos', () => {
		const cues = createAgentCuePreset({ preset: 'hidden-engine-dynamic', duration: 45 });

		expect(cues.overlays?.length).toBeGreaterThan(0);
		expect(cues.transitions?.length).toBeGreaterThan(0);
		expect(Math.max(...(cues.overlays ?? []).map((cue) => cue.end))).toBeLessThanOrEqual(45);
	});

	it('merges preset cues with project cue files for compose workflows', () => {
		const merged = mergeAgentCueFiles(
			{
				overlays: [{ text: 'HOOK', start: 0, end: 1, style: 'hook-punch' }],
				transitions: [{ time: 1, style: 'dip-to-black' }]
			},
			{
				broll: [{ url: './proof.mp4', start: 1, end: 2, type: 'VIDEO' }],
				overlays: [{ text: 'PROOF', start: 1, end: 2, style: 'proof-pill' }]
			}
		);

		expect(merged.broll).toHaveLength(1);
		expect(merged.overlays).toHaveLength(2);
		expect(merged.transitions).toHaveLength(1);
	});

	it('exposes an agent catalog for discoverability', () => {
		const catalog = getAgentCatalog();

		expect(catalog.captionPresets).toContain('hidden-engine-center');
		expect(catalog.cuePresets).toContain('hidden-engine-dynamic');
		expect(catalog.overlayStyles).toContain('hook-punch');
		expect(catalog.brollMotions).toContain('slow-zoom-in');
		expect(catalog.transitionStyles).toContain('dip-to-black');
		expect(catalog.cliCommands).toContain('compose');
	});

	it('validates cue files before agents apply them', () => {
		const valid = validateAgentCueFile({
			duration: 3,
			cues: {
				overlays: [{ text: 'HOOK', start: 0, end: 1, style: 'hook-punch' }],
				broll: [{ url: './proof.mp4', start: 1, end: 2, type: 'VIDEO', motion: 'slow-zoom-in' }],
				transitions: [{ time: 2, style: 'dip-to-black' }]
			}
		});
		const invalid = validateAgentCueFile({
			duration: 1,
			cues: {
				overlays: [{ text: 'BAD', start: 1, end: 0, style: 'not-real' }]
			}
		});

		expect(valid.valid).toBe(true);
		expect(valid.issues).toEqual([]);
		expect(invalid.valid).toBe(false);
		expect(invalid.issues.map((issue) => issue.path)).toContain('overlays[0].style');
	});

	it('rejects invalid transition timing before applying cue files', () => {
		const invalid = validateAgentCueFile({
			duration: 3,
			cues: {
				transitions: [
					{ time: -0.1, style: 'dip-to-black' },
					{ time: 1, duration: 0, style: 'swipe-left' }
				]
			}
		});

		expect(invalid.valid).toBe(false);
		expect(invalid.issues.map((issue) => issue.path)).toEqual([
			'transitions[0].time',
			'transitions[1].duration'
		]);
	});
});
