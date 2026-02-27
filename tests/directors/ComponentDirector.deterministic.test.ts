import { describe, expect, it, vi } from 'vitest';

import { ComponentDirector } from '$lib/directors/ComponentDirector.ts';

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
		getComponent: vi.fn().mockReturnValue({ id: 'component' })
	};

	return builder as any;
};

describe('ComponentDirector deterministic media branching', () => {
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
	});

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
		expect(builder.withSplitScreen).toHaveBeenCalledTimes(1);
		expect(builder.withDisplayObject).toHaveBeenCalledTimes(1);
		expect(builder.withGif).not.toHaveBeenCalled();
	});
});
