import { describe, expect, it, vi } from 'vitest';

import { EventManager } from '$lib/managers/EventManager.ts';

describe('EventManager listener lifecycle', () => {
	it('removes the same callback identity registered through on()', () => {
		const manager = new EventManager();
		manager.isReady = true;
		const callback = vi.fn();

		manager.on('rerender', callback);
		manager.emit('rerender');
		manager.removeEventListener('rerender', callback as EventListener);
		manager.emit('rerender');

		expect(callback).toHaveBeenCalledTimes(1);
	});
});
