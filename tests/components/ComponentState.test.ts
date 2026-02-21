import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentState } from '$lib/builders/_ComponentState.svelte.ts';
import { EventManager } from '$lib/managers/EventManager.js';
import { StateManager } from '$lib/managers/StateManager.svelte.ts';
import type { ComponentData } from '$lib';

// Mock dependencies
vi.mock('$lib/managers/EventManager.js', () => ({
	EventManager: vi.fn().mockImplementation(() => ({
		emit: vi.fn()
	}))
}));

vi.mock('$lib/managers/StateManager.svelte.ts', () => ({
	StateManager: vi.fn().mockImplementation(() => ({
		transformTime: vi.fn((time) => time)
	}))
}));

describe('ComponentState Auto-Refresh', () => {
	let componentState: ComponentState;
	let mockEventManager: EventManager;
	let mockStateManager: StateManager;
	let mockComponentData: ComponentData;
	let refreshCallback: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockEventManager = new EventManager();
		mockStateManager = new StateManager({} as any);
		refreshCallback = vi.fn().mockResolvedValue(undefined);

		mockComponentData = {
			id: 'test-component',
			type: 'TEXT',
			text: 'Initial text',
			timeline: { startAt: 0, endAt: 10 },
			appearance: { opacity: 1 },
			animations: {},
			effects: {},
			visible: true,
			order: 0,
			checksum: 'initial-checksum'
		} as ComponentData;

		componentState = new ComponentState({
			componentData: mockComponentData,
			eventManager: mockEventManager,
			stateManager: mockStateManager
		});
	});

	describe('Refresh callback setup', () => {
		it('should allow setting a refresh callback', () => {
			expect(() => {
				componentState.setRefreshCallback(refreshCallback);
			}).not.toThrow();
		});

		it('should store the refresh callback', () => {
			componentState.setRefreshCallback(refreshCallback);
			// We can't directly test the private property, but we can test its usage
			expect(refreshCallback).not.toHaveBeenCalled();
		});
	});

	describe('Auto-refresh on updateText', () => {
		it('should call refresh callback when updateText is called and callback is set', async () => {
			componentState.setRefreshCallback(refreshCallback);

			await componentState.updateText('New text');

			expect(refreshCallback).toHaveBeenCalledTimes(1);
			expect(mockEventManager.emit).toHaveBeenCalledWith('componentchange', expect.any(Object));
		});

		it('should not call refresh callback when updateText is called but callback is not set', async () => {
			await componentState.updateText('New text');

			expect(refreshCallback).not.toHaveBeenCalled();
			expect(mockEventManager.emit).toHaveBeenCalledWith('componentchange', expect.any(Object));
		});

		it('should not call updateText for non-TEXT components', async () => {
			const imageData = { ...mockComponentData, type: 'IMAGE' as const };
			const imageState = new ComponentState({
				componentData: imageData,
				eventManager: mockEventManager,
				stateManager: mockStateManager
			});
			imageState.setRefreshCallback(refreshCallback);

			await imageState.updateText('New text');

			expect(refreshCallback).not.toHaveBeenCalled();
			expect(mockEventManager.emit).not.toHaveBeenCalled();
		});
	});

	describe('Auto-refresh on updateAppearance', () => {
		it('should call refresh callback when updateAppearance is called and callback is set', async () => {
			componentState.setRefreshCallback(refreshCallback);

			await componentState.updateAppearance({ opacity: 0.5 });

			expect(refreshCallback).toHaveBeenCalledTimes(1);
			expect(mockEventManager.emit).toHaveBeenCalledWith('componentchange', expect.any(Object));
		});

		it('should not call refresh callback when updateAppearance is called but callback is not set', async () => {
			await componentState.updateAppearance({ opacity: 0.5 });

			expect(refreshCallback).not.toHaveBeenCalled();
			expect(mockEventManager.emit).toHaveBeenCalledWith('componentchange', expect.any(Object));
		});

		it('should merge appearance data correctly', async () => {
			componentState.setRefreshCallback(refreshCallback);

			await componentState.updateAppearance({ opacity: 0.5, x: 100 });

			const data = componentState.getData();
			expect(data.appearance).toEqual(
				expect.objectContaining({
					opacity: 0.5,
					x: 100
				})
			);
		});
	});

	describe('Auto-refresh on setVisible', () => {
		it('should call refresh callback when setVisible changes visibility and callback is set', async () => {
			componentState.setRefreshCallback(refreshCallback);

			await componentState.setVisible(false);

			expect(refreshCallback).toHaveBeenCalledTimes(1);
			expect(mockEventManager.emit).toHaveBeenCalledWith('componentchange', expect.any(Object));
		});

		it('should not call refresh callback when setVisible does not change visibility', async () => {
			componentState.setRefreshCallback(refreshCallback);

			// Set to same value (true is default)
			await componentState.setVisible(true);

			expect(refreshCallback).not.toHaveBeenCalled();
			expect(mockEventManager.emit).not.toHaveBeenCalled();
		});

		it('should not call refresh callback when setVisible is called but callback is not set', async () => {
			await componentState.setVisible(false);

			expect(refreshCallback).not.toHaveBeenCalled();
			expect(mockEventManager.emit).toHaveBeenCalledWith('componentchange', expect.any(Object));
		});
	});

	describe('Auto-refresh on setOrder', () => {
		it('should call refresh callback when setOrder changes order and callback is set', async () => {
			componentState.setRefreshCallback(refreshCallback);

			await componentState.setOrder(5);

			expect(refreshCallback).toHaveBeenCalledTimes(1);
			expect(mockEventManager.emit).toHaveBeenCalledWith('componentchange', expect.any(Object));
		});

		it('should not call refresh callback when setOrder does not change order', async () => {
			componentState.setRefreshCallback(refreshCallback);

			// Set to same value (0 is default)
			await componentState.setOrder(0);

			expect(refreshCallback).not.toHaveBeenCalled();
			expect(mockEventManager.emit).not.toHaveBeenCalled();
		});

		it('should not call refresh callback when setOrder is called but callback is not set', async () => {
			await componentState.setOrder(5);

			expect(refreshCallback).not.toHaveBeenCalled();
			expect(mockEventManager.emit).toHaveBeenCalledWith('componentchange', expect.any(Object));
		});
	});

	describe('Backward compatibility', () => {
		it('should work without refresh callback set', async () => {
			// Should not throw and should still emit events
			await componentState.updateText('New text');
			await componentState.updateAppearance({ opacity: 0.7 });
			await componentState.setVisible(false);
			await componentState.setOrder(3);

			expect(mockEventManager.emit).toHaveBeenCalledTimes(4); // All methods should emit events
		});

		it('should handle refresh callback errors gracefully', async () => {
			const errorCallback = vi.fn().mockRejectedValue(new Error('Refresh failed'));
			componentState.setRefreshCallback(errorCallback);

			// Should not throw even if refresh callback fails
			await expect(componentState.updateAppearance({ opacity: 0.5 })).resolves.toBeUndefined();

			expect(errorCallback).toHaveBeenCalledTimes(1);
			expect(mockEventManager.emit).toHaveBeenCalledWith('componentchange', expect.any(Object));
		});
	});

	describe('Video Source Timing adjustments', () => {
		it('should correctly slice source.startAt and source.endAt upon double split operations via setStart and setEnd', () => {
			// Simulating original video clip state
			const videoData: ComponentData = {
				id: 'video-test',
				type: 'VIDEO',
				timeline: { startAt: 0, endAt: 42.866 },
				source: {
					url: 'video.mp4',
					assetId: '123',
					startAt: 171.867,
					endAt: 214.733
				},
				appearance: {},
				animations: {},
				effects: {},
				visible: true,
				order: 1,
				checksum: 'abc'
			} as ComponentData;

			const originalState = new ComponentState({
				componentData: videoData,
				eventManager: mockEventManager,
				stateManager: mockStateManager
			});

			// Simulating first split @ 14.067
			// The original piece (A) receives setEnd(14.067)
			originalState.setEnd(14.067);

			// A clone is made (B), inheriting A's unmodified bounds at point of split
			const cloneData1 = JSON.parse(JSON.stringify(videoData));
			cloneData1.timeline.endAt = 42.866; // Before A's setEnd applied
			const right1State = new ComponentState({
				componentData: cloneData1,
				eventManager: mockEventManager,
				stateManager: mockStateManager
			});
			right1State.setStart(14.067);

			// Assert pieces A & B timeline and source bounds
			const dataA1 = originalState.getData();
			expect(dataA1.timeline.startAt).toBe(0);
			expect(dataA1.timeline.endAt).toBeCloseTo(14.067);
			expect((dataA1 as any).source.startAt).toBeCloseTo(171.867);
			expect((dataA1 as any).source.endAt).toBeCloseTo(185.934);

			const dataB1 = right1State.getData();
			expect(dataB1.timeline.startAt).toBeCloseTo(14.067);
			expect(dataB1.timeline.endAt).toBeCloseTo(42.866);
			expect((dataB1 as any).source.startAt).toBeCloseTo(185.934);
			expect((dataB1 as any).source.endAt).toBeCloseTo(214.733);

			// Simulating second split @ 6.633 on piece A
			originalState.setEnd(6.633);

			// The clone (C) inherits A's unmodified bounds at point of split
			const cloneData2 = JSON.parse(JSON.stringify(dataA1));
			const right2State = new ComponentState({
				componentData: cloneData2,
				eventManager: mockEventManager,
				stateManager: mockStateManager
			});
			right2State.setStart(6.633);

			// Assert pieces A, C, and B bounds
			const dataA2 = originalState.getData();
			expect(dataA2.timeline.startAt).toBe(0);
			expect(dataA2.timeline.endAt).toBeCloseTo(6.633);
			expect((dataA2 as any).source.startAt).toBeCloseTo(171.867);
			expect((dataA2 as any).source.endAt).toBeCloseTo(178.5);

			const dataC = right2State.getData();
			expect(dataC.timeline.startAt).toBeCloseTo(6.633);
			expect(dataC.timeline.endAt).toBeCloseTo(14.067);
			expect((dataC as any).source.startAt).toBeCloseTo(178.5);
			expect((dataC as any).source.endAt).toBeCloseTo(185.934);
		});
	});
});
