import type { EventManager } from '$lib/managers/EventManager.js';
import type { RenderManager } from '$lib/managers/RenderManager.js';
import type { StateManager } from '$lib/managers/StateManager.svelte.js';

import type { SyncCommand } from './Command.js';

export class RenderCommand implements SyncCommand<boolean | number> {
	private eventManager: EventManager;
	private state: StateManager;
	private renderManager: RenderManager;
	constructor(cradle: {
		eventManager: EventManager;
		stateManager: StateManager;
		renderManager: RenderManager;
	}) {
		this.eventManager = cradle.eventManager;
		this.state = cradle.stateManager;
		this.renderManager = cradle.renderManager;
	}

	execute(): boolean | number {
		if (this.state.state === 'loading') {
			return false;
		}

		this.eventManager.emit('beforerender');
		this.renderManager.render();
		return this.state.currentTime;
	}
}
