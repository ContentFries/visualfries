import type { Command } from './Command.js';
import { z } from 'zod';
import { TimelineManager } from '$lib/managers/TimelineManager.svelte.js';
import { StateManager } from '$lib/managers/StateManager.svelte.js';
import { RenderManager } from '$lib/managers/RenderManager.js';

const seekSchema = z.object({
	time: z.number()
});

export class SeekCommand implements Command {
	private timeline: TimelineManager;
	private state: StateManager;
	private renderManager: RenderManager;

	constructor(cradle: {
		timelineManager: TimelineManager;
		stateManager: StateManager;
		renderManager: RenderManager;
	}) {
		this.timeline = cradle.timelineManager;
		this.state = cradle.stateManager;
		this.renderManager = cradle.renderManager;
	}

	async execute(args: unknown): Promise<void> {
		const check = seekSchema.safeParse(args);
		if (!check.success) {
			return;
		}

		const time = Math.max(0, Math.min(check.data.time, this.state.duration));
		this.timeline.seek(time);

		// Ensure a deterministic render on server after seek to advance media frames
		if (this.state.environment === 'server') {
			// Try multiple render passes until loading state clears or attempts exhausted
			const maxAttempts = 10;
			for (let i = 0; i < maxAttempts; i += 1) {
				await this.renderManager.render();
				if (this.state.state !== 'loading') break;
				await new Promise((resolve) => setTimeout(resolve, 30));
			}
			if (this.state.state === 'loading') {
				console.warn('SeekCommand: Max render attempts exhausted while still loading');
			}
		}
	}
}
