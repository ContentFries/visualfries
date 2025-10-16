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
			expect(data.appearance).toEqual(expect.objectContaining({
				opacity: 0.5,
				x: 100
			}));
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
});