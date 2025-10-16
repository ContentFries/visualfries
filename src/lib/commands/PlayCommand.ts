import type { Command } from './Command.js';

export class PlayCommand implements Command<void> {
	async execute(): Promise<void> {
		// Implementation
		return;
	}
}
