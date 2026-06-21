import { describe, expect, it } from 'vitest';
import {
	collectDeterministicMediaRequirements,
	requiresDeterministicRender,
	resolveAgentRenderPlan
} from '$lib/agent';

const baseScene = {
	id: 'render-plan-scene',
	settings: {
		width: 1080,
		height: 1920,
		duration: 3,
		fps: 30,
		backgroundColor: '#000000'
	},
	assets: [],
	layers: []
};

describe('agent render plan', () => {
	it('allows browser final rendering for static scenes', () => {
		const scene = {
			...baseScene,
			layers: [
				{
					id: 'text-layer',
					components: [
						{
							id: 'title',
							type: 'TEXT',
							text: 'Static',
							timeline: { startAt: 0, endAt: 3 },
							appearance: {
								x: 0,
								y: 0,
								width: 1080,
								height: 300,
								text: {
									fontFamily: 'Arial',
									fontSize: 96,
									color: '#ffffff',
									textAlign: 'center'
								}
							}
						}
					]
				}
			]
		};

		const plan = resolveAgentRenderPlan(scene);

		expect(requiresDeterministicRender(scene)).toBe(false);
		expect(plan.engine).toBe('browser-preview');
		expect(plan.blockers).toEqual([]);
	});

	it('requires the local deterministic engine for final VIDEO scenes', () => {
		const scene = {
			...baseScene,
			assets: [{ id: 'avatar', type: 'VIDEO', url: 'https://example.com/avatar.mp4' }],
			layers: [
				{
					id: 'video-layer',
					components: [
						{
							id: 'avatar-video',
							type: 'VIDEO',
							source: { assetId: 'avatar' },
							timeline: { startAt: 0, endAt: 3 },
							appearance: { x: 0, y: 0, width: 1080, height: 1920 },
							muted: true
						}
					]
				}
			]
		};

		const plan = resolveAgentRenderPlan(scene);

		expect(collectDeterministicMediaRequirements(scene)).toEqual([
			expect.objectContaining({
				componentId: 'avatar-video',
				layerId: 'video-layer',
				assetId: 'avatar',
				type: 'VIDEO',
				source: 'https://example.com/avatar.mp4'
			})
		]);
		expect(requiresDeterministicRender(scene)).toBe(true);
		expect(plan.engine).toBe('deterministic-local');
		expect(plan.blockers).toEqual([]);
	});

	it('ignores muted layers and invisible media components when planning deterministic media', () => {
		const scene = {
			...baseScene,
			assets: [
				{ id: 'hidden-asset', type: 'VIDEO', url: 'https://example.com/hidden.mp4' },
				{ id: 'visible-asset', type: 'VIDEO', url: 'https://example.com/visible.mp4' }
			],
			layers: [
				{
					id: 'muted-layer',
					muted: true,
					components: [
						{
							id: 'muted-video',
							type: 'VIDEO',
							source: { assetId: 'hidden-asset' },
							timeline: { startAt: 0, endAt: 3 },
							appearance: { x: 0, y: 0, width: 1080, height: 1920 }
						}
					]
				},
				{
					id: 'visible-layer',
					components: [
						{
							id: 'invisible-video',
							type: 'VIDEO',
							visible: false,
							source: { assetId: 'hidden-asset' },
							timeline: { startAt: 0, endAt: 3 },
							appearance: { x: 0, y: 0, width: 1080, height: 1920 }
						},
						{
							id: 'visible-video',
							type: 'VIDEO',
							source: { assetId: 'visible-asset' },
							timeline: { startAt: 0, endAt: 3 },
							appearance: { x: 0, y: 0, width: 1080, height: 1920 }
						}
					]
				}
			]
		};

		expect(collectDeterministicMediaRequirements(scene).map((item) => item.componentId)).toEqual([
			'visible-video'
		]);
	});

	it('permits browser media only when explicitly requested as preview', () => {
		const scene = {
			...baseScene,
			layers: [
				{
					id: 'gif-layer',
					components: [
						{
							id: 'reaction-gif',
							type: 'GIF',
							source: { url: 'https://example.com/reaction.gif' },
							timeline: { startAt: 0, endAt: 3 },
							appearance: { x: 0, y: 0, width: 1080, height: 1920 }
						}
					]
				}
			]
		};

		const preview = resolveAgentRenderPlan(scene, {
			mode: 'preview',
			engine: 'browser-preview'
		});
		const forcedFinal = resolveAgentRenderPlan(scene, {
			mode: 'final',
			engine: 'browser-preview'
		});

		expect(preview.blockers).toEqual([]);
		expect(preview.warnings[0]).toContain('preview-only');
		expect(forcedFinal.blockers[0]).toContain('preview-only');
	});
});
