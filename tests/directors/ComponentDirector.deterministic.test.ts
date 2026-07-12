import { describe, expect, it, vi } from 'vitest';

import { ComponentDirector } from '$lib/directors/ComponentDirector.ts';
import { COMPONENT_CAPABILITIES, COMPONENT_TYPES } from '$lib/agent/capabilities.ts';

const createBuilder = () => {
	const builder = {
		withMedia: vi.fn().mockReturnThis(),
		withMediaSeeking: vi.fn().mockReturnThis(),
		withDeterministicMedia: vi.fn().mockReturnThis(),
		withVideoTexture: vi.fn().mockReturnThis(),
		withTexture: vi.fn().mockReturnThis(),
		withSplitScreen: vi.fn().mockReturnThis(),
		withGif: vi.fn().mockReturnThis(),
		withDisplayObject: vi.fn().mockReturnThis(),
		withImage: vi.fn().mockReturnThis(),
		withCanvasShape: vi.fn().mockReturnThis(),
		withProgressShape: vi.fn().mockReturnThis(),
		withCanvasFill: vi.fn().mockReturnThis(),
		withSubtitles: vi.fn().mockReturnThis(),
		withHtmlText: vi.fn().mockReturnThis(),
		withHtmlToCanvasHook: vi.fn().mockReturnThis(),
		withAnimation: vi.fn().mockReturnThis(),
		withPixiAnimationTarget: vi.fn().mockReturnThis(),
		getComponent: vi.fn().mockReturnValue({ id: 'component' })
	};

	return builder as any;
};

describe('ComponentDirector deterministic media branching', () => {
	it.each(COMPONENT_TYPES)(
		'keeps %s construction synchronized with the capability registry',
		(type) => {
			const builder = createBuilder();
			const director = new ComponentDirector({
				stateManager: { environment: 'browser' },
				deterministicMediaManager: { isEnabled: () => false }
			} as any);
			director.setBuilder(builder);
			director.setComponentData({
				type,
				...(type === 'SHAPE' ? { shape: { type: 'rectangle' } } : {})
			} as any);
			director.constructAuto();

			expect(builder.withAnimation).toHaveBeenCalledTimes(
				COMPONENT_CAPABILITIES[type].animation.attached ? 1 : 0
			);
			expect(builder.withPixiAnimationTarget).toHaveBeenCalledTimes(
				COMPONENT_CAPABILITIES[type].animation.target === 'pixi-container' ? 1 : 0
			);
		}
	);

	it('attaches runtime animation evaluation to IMAGE components', () => {
		const builder = createBuilder();
		const director = new ComponentDirector({
			stateManager: { environment: 'browser' },
			deterministicMediaManager: { isEnabled: () => false }
		} as any);
		director.setBuilder(builder);
		director.setComponentData({ type: 'IMAGE' } as any);

		director.constructAuto();

		expect(builder.withImage).toHaveBeenCalledTimes(1);
		expect(builder.withTexture).toHaveBeenCalledTimes(1);
		expect(builder.withSplitScreen).toHaveBeenCalledTimes(1);
		expect(builder.withAnimation).toHaveBeenCalledTimes(1);
	});

	it('uses deterministic-first VIDEO path in server mode without native video hooks', () => {
		const builder = createBuilder();
		const director = new ComponentDirector({
			stateManager: { environment: 'server' },
			deterministicMediaManager: { isEnabled: () => true }
		} as any);
		director.setBuilder(builder);
		director.setComponentData({ type: 'VIDEO' } as any);

		director.constructAuto();

		expect(builder.withDeterministicMedia).toHaveBeenCalledTimes(1);
		expect(builder.withTexture).toHaveBeenCalledTimes(1);
		expect(builder.withSplitScreen).toHaveBeenCalledTimes(1);
		expect(builder.withMedia).not.toHaveBeenCalled();
		expect(builder.withMediaSeeking).not.toHaveBeenCalled();
		expect(builder.withVideoTexture).not.toHaveBeenCalled();
	});

	it('keeps native VIDEO path when deterministic mode is disabled', () => {
		const builder = createBuilder();
		const director = new ComponentDirector({
			stateManager: { environment: 'server' },
			deterministicMediaManager: { isEnabled: () => false }
		} as any);
		director.setBuilder(builder);
		director.setComponentData({ type: 'VIDEO' } as any);

		director.constructAuto();

		expect(builder.withMedia).toHaveBeenCalledTimes(1);
		expect(builder.withMediaSeeking).toHaveBeenCalledTimes(1);
		expect(builder.withVideoTexture).toHaveBeenCalledTimes(1);
		expect(builder.withSplitScreen).toHaveBeenCalledTimes(1);
		expect(builder.withPixiAnimationTarget).toHaveBeenCalledTimes(1);
		expect(builder.withAnimation).toHaveBeenCalledTimes(1);
	});

	it.each([
		['GIF', {}],
		['SHAPE', { shape: { type: 'rectangle' } }],
		['SHAPE', { shape: { type: 'progress' } }]
	] as const)('attaches the shared Pixi target and AnimationHook for %s', (type, extra) => {
		const builder = createBuilder();
		const director = new ComponentDirector({
			stateManager: { environment: 'browser' },
			deterministicMediaManager: { isEnabled: () => false }
		} as any);
		director.setBuilder(builder);
		director.setComponentData({ type, ...extra } as any);

		director.constructAuto();

		expect(builder.withPixiAnimationTarget).toHaveBeenCalledTimes(1);
		expect(builder.withAnimation).toHaveBeenCalledTimes(1);
	});

	it.each(['COLOR', 'GRADIENT'] as const)(
		'renders and animates %s through the shared Pixi contract',
		(type) => {
			const builder = createBuilder();
			const director = new ComponentDirector({
				stateManager: { environment: 'browser' },
				deterministicMediaManager: { isEnabled: () => false }
			} as any);
			director.setBuilder(builder);
			director.setComponentData({ type } as any);
			director.constructAuto();

			expect(builder.withCanvasFill).toHaveBeenCalledTimes(1);
			expect(builder.withTexture).toHaveBeenCalledTimes(1);
			expect(builder.withDisplayObject).toHaveBeenCalledTimes(1);
			expect(builder.withPixiAnimationTarget).toHaveBeenCalledTimes(1);
			expect(builder.withAnimation).toHaveBeenCalledTimes(1);
		}
	);

	it('uses deterministic-first GIF path without native gif hook when enabled', () => {
		const builder = createBuilder();
		const director = new ComponentDirector({
			stateManager: { environment: 'server' },
			deterministicMediaManager: { isEnabled: () => true }
		} as any);
		director.setBuilder(builder);
		director.setComponentData({ type: 'GIF' } as any);

		director.constructAuto();

		expect(builder.withDeterministicMedia).toHaveBeenCalledTimes(1);
		expect(builder.withTexture).toHaveBeenCalledTimes(1);
		expect(builder.withSplitScreen).not.toHaveBeenCalled();
		expect(builder.withDisplayObject).toHaveBeenCalledTimes(1);
		expect(builder.withPixiAnimationTarget).toHaveBeenCalledTimes(1);
		expect(builder.withAnimation).toHaveBeenCalledTimes(1);
		expect(builder.withGif).not.toHaveBeenCalled();
	});
});
