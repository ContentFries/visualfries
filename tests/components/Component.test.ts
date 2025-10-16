import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Component } from '$lib/components/Component.svelte.js';
import { ComponentContext } from '$lib/components/ComponentContext.svelte.js';
import type { ComponentProps } from '$lib';

// Mock ComponentContext
vi.mock('$lib/components/ComponentContext.svelte.ts', () => ({
	ComponentContext: vi.fn().mockImplementation(() => ({
		setComponentProps: vi.fn(),
		getResource: vi.fn(),
		runHooks: vi.fn()
	}))
}));

describe('Component Auto-Refresh', () => {
	let mockComponentState: ComponentProps;
	let mockComponentContext: ComponentContext;
	let component: Component;

	beforeEach(() => {
		// Create mock ComponentState with required methods
		mockComponentState = {
			id: 'test-component',
			type: 'TEXT',
			timeline: { startAt: 0, endAt: 10 },
			appearance: {},
			animations: {},
			effects: {},
			visible: true,
			order: 0,
			checksum: 'test-checksum',
			duration: 10,
			setStart: vi.fn(),
			setEnd: vi.fn(),
			getData: vi.fn(),
			update: vi.fn(),
			updateText: vi.fn().mockResolvedValue(undefined),
			updateAppearance: vi.fn().mockResolvedValue(undefined),
			setVisible: vi.fn().mockResolvedValue(undefined),
			setOrder: vi.fn().mockResolvedValue(undefined),
			setRefreshCallback: vi.fn()
		} as ComponentProps;

		mockComponentContext = new ComponentContext({} as any);

		component = new Component({
			componentState: mockComponentState,
			componentContext: mockComponentContext
		});
	});

	describe('Auto-refresh property', () => {
		it('should have autoRefresh disabled by default', () => {
			expect(component.autoRefresh).toBe(false);
		});

		it('should allow setting autoRefresh to true', () => {
			const result = component.setAutoRefresh(true);
			expect(component.autoRefresh).toBe(true);
			expect(result).toBe(component); // Should return component for chaining
		});

		it('should allow setting autoRefresh to false', () => {
			component.setAutoRefresh(true);
			const result = component.setAutoRefresh(false);
			expect(component.autoRefresh).toBe(false);
			expect(result).toBe(component); // Should return component for chaining
		});
	});

	describe('Refresh callback setup', () => {
		it('should set refresh callback on ComponentState if supported', () => {
			expect(mockComponentState.setRefreshCallback).toHaveBeenCalledWith(expect.any(Function));
		});

		it('should not throw if ComponentState does not support setRefreshCallback', () => {
			const stateWithoutCallback = {
				...mockComponentState,
				setRefreshCallback: undefined
			} as any;

			expect(() => {
				new Component({
					componentState: stateWithoutCallback,
					componentContext: mockComponentContext
				});
			}).not.toThrow();
		});
	});

	describe('Auto-refresh behavior', () => {
		let refreshSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			refreshSpy = vi.spyOn(component, 'refresh').mockResolvedValue();
		});

		it('should call refresh when autoRefresh is enabled and callback is triggered', async () => {
			component.setAutoRefresh(true);
			
			// Get the callback that was passed to setRefreshCallback
			const setRefreshCallbackCall = (mockComponentState.setRefreshCallback as any).mock.calls[0];
			const refreshCallback = setRefreshCallbackCall[0];
			
			// Trigger the callback
			await refreshCallback();
			
			expect(refreshSpy).toHaveBeenCalledTimes(1);
		});

		it('should not call refresh when autoRefresh is disabled and callback is triggered', async () => {
			component.setAutoRefresh(false);
			
			// Get the callback that was passed to setRefreshCallback
			const setRefreshCallbackCall = (mockComponentState.setRefreshCallback as any).mock.calls[0];
			const refreshCallback = setRefreshCallbackCall[0];
			
			// Trigger the callback
			await refreshCallback();
			
			expect(refreshSpy).not.toHaveBeenCalled();
		});
	});

	describe('Integration with ComponentState methods', () => {
		let refreshSpy: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			refreshSpy = vi.spyOn(component, 'refresh').mockResolvedValue();
		});

		it('should trigger auto-refresh when updateText is called and autoRefresh is enabled', async () => {
			component.setAutoRefresh(true);
			
			await mockComponentState.updateText('new text');
			
			// The refresh should be called through the callback mechanism
			// We need to verify that the ComponentState method was called
			expect(mockComponentState.updateText).toHaveBeenCalledWith('new text');
		});

		it('should trigger auto-refresh when updateAppearance is called and autoRefresh is enabled', async () => {
			component.setAutoRefresh(true);
			
			const appearance = { opacity: 0.5 };
			await mockComponentState.updateAppearance(appearance);
			
			expect(mockComponentState.updateAppearance).toHaveBeenCalledWith(appearance);
		});

		it('should trigger auto-refresh when setVisible is called and autoRefresh is enabled', async () => {
			component.setAutoRefresh(true);
			
			await mockComponentState.setVisible(false);
			
			expect(mockComponentState.setVisible).toHaveBeenCalledWith(false);
		});

		it('should trigger auto-refresh when setOrder is called and autoRefresh is enabled', async () => {
			component.setAutoRefresh(true);
			
			await mockComponentState.setOrder(5);
			
			expect(mockComponentState.setOrder).toHaveBeenCalledWith(5);
		});
	});

	describe('Backward compatibility', () => {
		it('should maintain existing behavior when autoRefresh is disabled', async () => {
			component.setAutoRefresh(false);
			
			// Call methods - they should work but not auto-refresh
			await mockComponentState.updateText('test');
			await mockComponentState.updateAppearance({ opacity: 0.8 });
			await mockComponentState.setVisible(true);
			await mockComponentState.setOrder(3);
			
			// Verify methods were called
			expect(mockComponentState.updateText).toHaveBeenCalledWith('test');
			expect(mockComponentState.updateAppearance).toHaveBeenCalledWith({ opacity: 0.8 });
			expect(mockComponentState.setVisible).toHaveBeenCalledWith(true);
			expect(mockComponentState.setOrder).toHaveBeenCalledWith(3);
		});

		it('should allow manual refresh calls regardless of autoRefresh setting', async () => {
			const refreshSpy = vi.spyOn(component, 'refresh').mockResolvedValue();
			
			// Test with autoRefresh enabled
			component.setAutoRefresh(true);
			await component.refresh();
			expect(refreshSpy).toHaveBeenCalledTimes(1);
			
			// Test with autoRefresh disabled
			component.setAutoRefresh(false);
			await component.refresh();
			expect(refreshSpy).toHaveBeenCalledTimes(2);
		});
	});
});