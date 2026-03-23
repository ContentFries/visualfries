import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Component } from '$lib/components/Component.svelte.js';
import { ComponentContext } from '$lib/components/ComponentContext.svelte.js';
import type { ComponentProps } from '$lib';

// Mock ComponentContext
vi.mock('$lib/components/ComponentContext.svelte.js', () => ({
	ComponentContext: vi.fn().mockImplementation(() => ({
		setComponentProps: vi.fn(),
		getResource: vi.fn(),
		runHooks: vi.fn()
	}))
}));

describe('Component Method Chaining', () => {
	let mockComponentState: ComponentProps;
	let mockComponentContext: ComponentContext;
	let component: Component;

	beforeEach(() => {
		// Create mock ComponentState with required methods
		mockComponentState = {
			id: 'test-component',
			type: 'TEXT',
			timeline: { startAt: 0, endAt: 10 },
			appearance: { x: 0, y: 0, width: 100, height: 100 },
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
			updateText: vi.fn(),
			updateAppearance: vi.fn(),
			setVisible: vi.fn(),
			setOrder: vi.fn(),
			setRefreshCallback: vi.fn()
		} as any;

		mockComponentContext = new ComponentContext({} as any);

		component = new Component({
			componentState: mockComponentState,
			componentContext: mockComponentContext
		});
	});

	describe('Basic method availability', () => {
		it('should have updateAppearance method', () => {
			expect(typeof component.updateAppearance).toBe('function');
		});

		it('should have updateText method', () => {
			expect(typeof component.updateText).toBe('function');
		});

		it('should have setText method', () => {
			expect(typeof component.setText).toBe('function');
		});

		it('should have setVisible method', () => {
			expect(typeof component.setVisible).toBe('function');
		});

		it('should have setOrder method', () => {
			expect(typeof component.setOrder).toBe('function');
		});
	});

	describe('updateAppearance method chaining', () => {
		it('should return Component instance for chaining', () => {
			const result = component.updateAppearance({ opacity: 0.5 });
			expect(result).toBe(component);
			expect(mockComponentState.updateAppearance).toHaveBeenCalledWith({ opacity: 0.5 });
		});

		it('should allow chaining multiple appearance updates', () => {
			const result = component
				.updateAppearance({ opacity: 0.5 })
				.updateAppearance({ x: 100 });

			expect(result).toBe(component);
			expect(mockComponentState.updateAppearance).toHaveBeenCalledTimes(2);
			expect(mockComponentState.updateAppearance).toHaveBeenNthCalledWith(1, { opacity: 0.5 });
			expect(mockComponentState.updateAppearance).toHaveBeenNthCalledWith(2, { x: 100 });
		});
	});

	describe('updateText method chaining', () => {
		it('should return Component instance for chaining', () => {
			const result = component.updateText('new text');
			expect(result).toBe(component);
			expect(mockComponentState.updateText).toHaveBeenCalledWith('new text');
		});

		it('should allow chaining with other methods', () => {
			const result = component
				.updateText('hello')
				.setVisible(false);

			expect(result).toBe(component);
			expect(mockComponentState.updateText).toHaveBeenCalledWith('hello');
			expect(mockComponentState.setVisible).toHaveBeenCalledWith(false);
		});
	});

	describe('setText method chaining', () => {
		it('should return Component instance for chaining', () => {
			const result = component.setText('test text');
			expect(result).toBe(component);
			expect(mockComponentState.updateText).toHaveBeenCalledWith('test text');
		});

		it('should be an alias for updateText', () => {
			component.setText('alias test');
			expect(mockComponentState.updateText).toHaveBeenCalledWith('alias test');
		});
	});

	describe('setVisible method chaining', () => {
		it('should return Component instance for chaining', () => {
			const result = component.setVisible(false);
			expect(result).toBe(component);
			expect(mockComponentState.setVisible).toHaveBeenCalledWith(false);
		});

		it('should allow chaining with other methods', () => {
			const result = component
				.setVisible(true)
				.setOrder(5);

			expect(result).toBe(component);
			expect(mockComponentState.setVisible).toHaveBeenCalledWith(true);
			expect(mockComponentState.setOrder).toHaveBeenCalledWith(5);
		});
	});

	describe('setOrder method chaining', () => {
		it('should return Component instance for chaining', () => {
			const result = component.setOrder(3);
			expect(result).toBe(component);
			expect(mockComponentState.setOrder).toHaveBeenCalledWith(3);
		});

		it('should allow chaining with appearance updates', () => {
			const result = component
				.setOrder(2)
				.updateAppearance({ opacity: 0.8 });

			expect(result).toBe(component);
			expect(mockComponentState.setOrder).toHaveBeenCalledWith(2);
			expect(mockComponentState.updateAppearance).toHaveBeenCalledWith({ opacity: 0.8 });
		});
	});

	describe('Complex method chaining', () => {
		it('should allow chaining multiple different methods', () => {
			const result = component
				.setText('chained text')
				.setVisible(true)
				.setOrder(1)
				.updateAppearance({ opacity: 0.9 });

			expect(result).toBe(component);
			expect(mockComponentState.updateText).toHaveBeenCalledWith('chained text');
			expect(mockComponentState.setVisible).toHaveBeenCalledWith(true);
			expect(mockComponentState.setOrder).toHaveBeenCalledWith(1);
			expect(mockComponentState.updateAppearance).toHaveBeenCalledWith({ opacity: 0.9 });
		});

		it('should maintain method call order in chains', () => {
			const callOrder: string[] = [];

			// Mock methods to track call order
			mockComponentState.updateText = vi.fn().mockImplementation(() => {
				callOrder.push('updateText');
			});
			mockComponentState.setVisible = vi.fn().mockImplementation(() => {
				callOrder.push('setVisible');
			});
			mockComponentState.updateAppearance = vi.fn().mockImplementation(() => {
				callOrder.push('updateAppearance');
			});

			component
				.updateText('first')
				.setVisible(false)
				.updateAppearance({ x: 50 });

			expect(callOrder).toEqual(['updateText', 'setVisible', 'updateAppearance']);
		});
	});

	describe('Method chaining with auto-refresh', () => {
		it('should work with auto-refresh enabled', () => {
			component.setAutoRefresh(true);

			const result = component
				.setText('auto-refresh text')
				.setVisible(true);

			expect(result).toBe(component);
			expect(mockComponentState.updateText).toHaveBeenCalledWith('auto-refresh text');
			expect(mockComponentState.setVisible).toHaveBeenCalledWith(true);
		});

		it('should work with auto-refresh disabled', () => {
			component.setAutoRefresh(false);

			const result = component
				.updateAppearance({ opacity: 0.3 })
				.setOrder(4);

			expect(result).toBe(component);
			expect(mockComponentState.updateAppearance).toHaveBeenCalledWith({ opacity: 0.3 });
			expect(mockComponentState.setOrder).toHaveBeenCalledWith(4);
		});
	});

	describe('Error handling in method chains', () => {
		it('should propagate errors from chained methods', () => {
			// Mock a method to throw an error
			mockComponentState.updateText = vi.fn().mockImplementation(() => {
				throw new Error('Update failed');
			});

			expect(() => component.setText('error test')).toThrow('Update failed');
		});

		it('should stop chain execution on error', () => {
			// Mock first method to throw error
			mockComponentState.updateText = vi.fn().mockImplementation(() => {
				throw new Error('First method failed');
			});

			try {
				component
					.setText('will fail')
					.setVisible(true);
			} catch (error: any) {
				expect(error.message).toBe('First method failed');
			}

			// Second method should not be called due to error in first
			expect(mockComponentState.setVisible).not.toHaveBeenCalled();
		});
	});

	describe('Fluent API integration', () => {
		it('should support fluent chaining syntax', () => {
			// Test that we can chain methods in a fluent manner
			const result = component
				.setText('Hello World')
				.updateAppearance({ x: 10, y: 20 })
				.setVisible(true)
				.setOrder(5);

			expect(result).toBe(component);

			// Verify all methods were called with correct parameters
			expect(mockComponentState.updateText).toHaveBeenCalledWith('Hello World');
			expect(mockComponentState.updateAppearance).toHaveBeenCalledWith({ x: 10, y: 20 });
			expect(mockComponentState.setVisible).toHaveBeenCalledWith(true);
			expect(mockComponentState.setOrder).toHaveBeenCalledWith(5);
		});
	});
});
