import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Component } from '$lib/components/Component.svelte.ts';
import { ComponentContext } from '$lib/components/ComponentContext.svelte.ts';
import { EventManager } from '$lib/managers/EventManager.js';
import type { ComponentProps, ComponentData } from '$lib';

// Mock ComponentContext
vi.mock('$lib/components/ComponentContext.svelte.ts', () => ({
	ComponentContext: vi.fn().mockImplementation(() => ({
		setComponentProps: vi.fn(),
		getResource: vi.fn(),
		runHooks: vi.fn(),
		eventManager: new EventManager()
	}))
}));

describe('Component Event Filtering', () => {
	let mockComponentState: ComponentProps;
	let mockComponentContext: ComponentContext;
	let component: Component;
	let eventManager: EventManager;

	beforeEach(() => {
		// Create real EventManager for testing
		eventManager = new EventManager();
		eventManager.isReady = true; // Enable event emission

		// Create mock ComponentState with required methods
		mockComponentState = {
			id: 'test-component-123',
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
			getData: vi.fn().mockReturnValue({
				id: 'test-component-123',
				type: 'TEXT',
				timeline: { startAt: 0, endAt: 10 },
				appearance: {},
				animations: {},
				effects: {},
				visible: true,
				order: 0
			}),
			update: vi.fn(),
			updateText: vi.fn().mockResolvedValue(undefined),
			updateAppearance: vi.fn().mockResolvedValue(undefined),
			setVisible: vi.fn().mockResolvedValue(undefined),
			setOrder: vi.fn().mockResolvedValue(undefined),
			setRefreshCallback: vi.fn()
		} as ComponentProps;

		mockComponentContext = new ComponentContext({} as any);
		// Override the eventManager property with our real EventManager
		(mockComponentContext as any).eventManager = eventManager;

		component = new Component({
			componentState: mockComponentState,
			componentContext: mockComponentContext
		});
	});

	describe('onChange method', () => {
		it('should filter componentchange events by component ID', () => {
			const callback = vi.fn();
			const unsubscribe = component.onChange(callback);

			// Emit event for our component
			const componentData: ComponentData = {
				id: 'test-component-123',
				type: 'TEXT',
				timeline: { startAt: 0, endAt: 10 },
				appearance: {},
				animations: {},
				effects: {},
				visible: true,
				order: 0
			};
			eventManager.emit('componentchange', componentData);

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(componentData);

			// Clean up
			unsubscribe();
		});

		it('should not trigger callback for other component events', () => {
			const callback = vi.fn();
			const unsubscribe = component.onChange(callback);

			// Emit event for different component
			const otherComponentData: ComponentData = {
				id: 'other-component-456',
				type: 'IMAGE',
				timeline: { startAt: 0, endAt: 5 },
				appearance: {},
				animations: {},
				effects: {},
				visible: true,
				order: 1
			};
			eventManager.emit('componentchange', otherComponentData);

			expect(callback).not.toHaveBeenCalled();

			// Clean up
			unsubscribe();
		});

		it('should return unsubscribe function that removes event listener', () => {
			const callback = vi.fn();
			const unsubscribe = component.onChange(callback);

			// Verify callback works before unsubscribe
			const componentData: ComponentData = {
				id: 'test-component-123',
				type: 'TEXT',
				timeline: { startAt: 0, endAt: 10 },
				appearance: {},
				animations: {},
				effects: {},
				visible: true,
				order: 0
			};
			eventManager.emit('componentchange', componentData);
			expect(callback).toHaveBeenCalledTimes(1);

			// Unsubscribe
			unsubscribe();

			// Emit same event again - callback should not be called
			eventManager.emit('componentchange', componentData);
			expect(callback).toHaveBeenCalledTimes(1); // Still only called once
		});

		it('should handle multiple subscribers independently', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			
			const unsubscribe1 = component.onChange(callback1);
			const unsubscribe2 = component.onChange(callback2);

			// Emit event
			const componentData: ComponentData = {
				id: 'test-component-123',
				type: 'TEXT',
				timeline: { startAt: 0, endAt: 10 },
				appearance: {},
				animations: {},
				effects: {},
				visible: true,
				order: 0
			};
			eventManager.emit('componentchange', componentData);

			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).toHaveBeenCalledTimes(1);

			// Unsubscribe first callback
			unsubscribe1();

			// Emit event again
			eventManager.emit('componentchange', componentData);

			expect(callback1).toHaveBeenCalledTimes(1); // Still only called once
			expect(callback2).toHaveBeenCalledTimes(2); // Called twice

			// Clean up
			unsubscribe2();
		});
	});

	describe('onTimelineChange method', () => {
		it('should listen to timeupdate events', () => {
			const callback = vi.fn();
			const unsubscribe = component.onTimelineChange(callback);

			// Emit timeupdate event
			const currentTime = 5.5;
			eventManager.emit('timeupdate', currentTime);

			expect(callback).toHaveBeenCalledTimes(1);
			expect(callback).toHaveBeenCalledWith(currentTime);

			// Clean up
			unsubscribe();
		});

		it('should return unsubscribe function that removes timeline event listener', () => {
			const callback = vi.fn();
			const unsubscribe = component.onTimelineChange(callback);

			// Verify callback works before unsubscribe
			eventManager.emit('timeupdate', 3.0);
			expect(callback).toHaveBeenCalledTimes(1);

			// Unsubscribe
			unsubscribe();

			// Emit same event again - callback should not be called
			eventManager.emit('timeupdate', 4.0);
			expect(callback).toHaveBeenCalledTimes(1); // Still only called once
		});

		it('should handle multiple timeline subscribers independently', () => {
			const callback1 = vi.fn();
			const callback2 = vi.fn();
			
			const unsubscribe1 = component.onTimelineChange(callback1);
			const unsubscribe2 = component.onTimelineChange(callback2);

			// Emit event
			eventManager.emit('timeupdate', 2.5);

			expect(callback1).toHaveBeenCalledTimes(1);
			expect(callback2).toHaveBeenCalledTimes(1);

			// Unsubscribe first callback
			unsubscribe1();

			// Emit event again
			eventManager.emit('timeupdate', 3.5);

			expect(callback1).toHaveBeenCalledTimes(1); // Still only called once
			expect(callback2).toHaveBeenCalledTimes(2); // Called twice

			// Clean up
			unsubscribe2();
		});
	});

	describe('Event filtering integration', () => {
		it('should work with mixed event types', () => {
			const changeCallback = vi.fn();
			const timelineCallback = vi.fn();
			
			const unsubscribeChange = component.onChange(changeCallback);
			const unsubscribeTimeline = component.onTimelineChange(timelineCallback);

			// Emit component change event
			const componentData: ComponentData = {
				id: 'test-component-123',
				type: 'TEXT',
				timeline: { startAt: 0, endAt: 10 },
				appearance: {},
				animations: {},
				effects: {},
				visible: true,
				order: 0
			};
			eventManager.emit('componentchange', componentData);

			// Emit timeline event
			eventManager.emit('timeupdate', 1.5);

			expect(changeCallback).toHaveBeenCalledTimes(1);
			expect(changeCallback).toHaveBeenCalledWith(componentData);
			expect(timelineCallback).toHaveBeenCalledTimes(1);
			expect(timelineCallback).toHaveBeenCalledWith(1.5);

			// Clean up
			unsubscribeChange();
			unsubscribeTimeline();
		});

		it('should not interfere with existing EventManager functionality', () => {
			const genericCallback = vi.fn();
			
			// Add generic event listener directly to EventManager
			eventManager.on('componentchange', genericCallback);

			// Add component-scoped listener
			const componentCallback = vi.fn();
			const unsubscribe = component.onChange(componentCallback);

			// Emit event for our component
			const componentData: ComponentData = {
				id: 'test-component-123',
				type: 'TEXT',
				timeline: { startAt: 0, endAt: 10 },
				appearance: {},
				animations: {},
				effects: {},
				visible: true,
				order: 0
			};
			eventManager.emit('componentchange', componentData);

			// Both callbacks should be called
			expect(genericCallback).toHaveBeenCalledTimes(1);
			expect(componentCallback).toHaveBeenCalledTimes(1);

			// Clean up
			unsubscribe();
		});
	});

	describe('Automatic cleanup', () => {
		it('should automatically clean up event listeners when component is destroyed', async () => {
			const callback = vi.fn();
			component.onChange(callback);

			// Verify callback works before destroy
			const componentData: ComponentData = {
				id: 'test-component-123',
				type: 'TEXT',
				timeline: { startAt: 0, endAt: 10 },
				appearance: {},
				animations: {},
				effects: {},
				visible: true,
				order: 0
			};
			eventManager.emit('componentchange', componentData);
			expect(callback).toHaveBeenCalledTimes(1);

			// Destroy component
			await component.destroy();

			// Emit event again - callback should not be called
			eventManager.emit('componentchange', componentData);
			expect(callback).toHaveBeenCalledTimes(1); // Still only called once
		});

		it('should clean up multiple event listeners on destroy', async () => {
			const changeCallback = vi.fn();
			const timelineCallback = vi.fn();
			
			component.onChange(changeCallback);
			component.onTimelineChange(timelineCallback);

			// Verify callbacks work before destroy
			const componentData: ComponentData = {
				id: 'test-component-123',
				type: 'TEXT',
				timeline: { startAt: 0, endAt: 10 },
				appearance: {},
				animations: {},
				effects: {},
				visible: true,
				order: 0
			};
			eventManager.emit('componentchange', componentData);
			eventManager.emit('timeupdate', 2.5);
			
			expect(changeCallback).toHaveBeenCalledTimes(1);
			expect(timelineCallback).toHaveBeenCalledTimes(1);

			// Destroy component
			await component.destroy();

			// Emit events again - callbacks should not be called
			eventManager.emit('componentchange', componentData);
			eventManager.emit('timeupdate', 3.5);
			
			expect(changeCallback).toHaveBeenCalledTimes(1); // Still only called once
			expect(timelineCallback).toHaveBeenCalledTimes(1); // Still only called once
		});
	});

	describe('Error handling', () => {
		it('should handle unsubscribe being called multiple times', () => {
			const callback = vi.fn();
			const unsubscribe = component.onChange(callback);

			// Call unsubscribe multiple times - should not throw
			expect(() => {
				unsubscribe();
				unsubscribe();
				unsubscribe();
			}).not.toThrow();
		});
	});
});