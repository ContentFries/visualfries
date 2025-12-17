import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentState } from '$lib/builders/_ComponentState.svelte.ts';
import { EventManager } from '$lib/managers/EventManager.js';
import { StateManager } from '$lib/managers/StateManager.svelte.ts';
import type { ComponentData, TextComponent } from '$lib';

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

describe('ComponentState Text Preservation', () => {
	let componentState: ComponentState;
	let mockEventManager: EventManager;
	let mockStateManager: StateManager;
	let mockComponentData: ComponentData;

	beforeEach(() => {
		mockEventManager = new EventManager();
		mockStateManager = new StateManager({} as any);

		mockComponentData = {
			id: 'test-text-component',
			type: 'TEXT',
			text: 'Initial text content',
			timeline: { startAt: 0, endAt: 10 },
			appearance: {
				x: 0,
				y: 0,
				width: 100,
				height: 50,
				opacity: 1,
				text: {
					fontFamily: 'Arial',
					fontSize: { value: 16, unit: 'px' },
					color: '#000000',
					textAlign: 'left'
				}
			},
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

	describe('updateAppearance preserves text content', () => {
		it('should preserve text property when updating appearance properties', async () => {
			// First, update the text
			await componentState.updateText('My custom text');

			// Verify text was set
			let data = componentState.getData();
			expect((data as TextComponent).text).toBe('My custom text');

			// Now update appearance without touching text
			await componentState.updateAppearance({
				opacity: 0.5
			});

			// Text should still be preserved
			data = componentState.getData();
			expect((data as TextComponent).text).toBe('My custom text');
		});

		it('should preserve text when updating nested text appearance properties', async () => {
			// Set custom text
			await componentState.updateText('Custom text here');

			// Verify text was set
			let data = componentState.getData();
			expect((data as TextComponent).text).toBe('Custom text here');

			// Update text appearance (lineHeight, fontSize, etc.)
			await componentState.updateAppearance({
				text: {
					lineHeight: { value: 1.5, unit: 'em' }
				}
			});

			// Text content should still be preserved
			data = componentState.getData();
			expect((data as TextComponent).text).toBe('Custom text here');
			// And the appearance should be updated
			expect(data.appearance.text?.lineHeight).toEqual({ value: 1.5, unit: 'em' });
		});

		it('should preserve text when making multiple consecutive appearance updates', async () => {
			// Set custom text
			await componentState.updateText('Persistent text');

			// Make multiple appearance updates
			await componentState.updateAppearance({ opacity: 0.8 });
			await componentState.updateAppearance({ x: 100 });
			await componentState.updateAppearance({ y: 200 });
			await componentState.updateAppearance({
				text: {
					fontSize: { value: 24, unit: 'px' }
				}
			});

			// Text should still be the same
			const data = componentState.getData();
			expect((data as TextComponent).text).toBe('Persistent text');
		});

		it('should preserve all component properties after appearance update', async () => {
			// Set up initial state with custom values
			await componentState.updateText('Test text');
			await componentState.setOrder(5);
			await componentState.setVisible(true);

			// Update appearance
			await componentState.updateAppearance({ opacity: 0.7 });

			// Verify all properties are preserved
			const data = componentState.getData();
			expect((data as TextComponent).text).toBe('Test text');
			expect(data.order).toBe(5);
			expect(data.visible).toBe(true);
			expect(data.id).toBe('test-text-component');
			expect(data.type).toBe('TEXT');
		});
	});

	describe('getData returns correct text value', () => {
		it('should return updated text value in getData after updateText', async () => {
			await componentState.updateText('New text value');

			const data = componentState.getData();
			expect((data as TextComponent).text).toBe('New text value');
		});

		it('should return correct text after multiple text updates', async () => {
			await componentState.updateText('First update');
			await componentState.updateText('Second update');
			await componentState.updateText('Final update');

			const data = componentState.getData();
			expect((data as TextComponent).text).toBe('Final update');
		});
	});

	describe('onChange callback receives correct text value', () => {
		it('should emit componentchange with correct text after updateText', async () => {
			await componentState.updateText('Changed text');

			expect(mockEventManager.emit).toHaveBeenCalledWith(
				'componentchange',
				expect.objectContaining({
					text: 'Changed text'
				})
			);
		});

		it('should emit componentchange with preserved text after updateAppearance', async () => {
			// First set text
			await componentState.updateText('My text');

			// Clear previous calls
			vi.mocked(mockEventManager.emit).mockClear();

			// Update appearance
			await componentState.updateAppearance({ opacity: 0.5 });

			// Should emit with preserved text
			expect(mockEventManager.emit).toHaveBeenCalledWith(
				'componentchange',
				expect.objectContaining({
					text: 'My text'
				})
			);
		});
	});
});
