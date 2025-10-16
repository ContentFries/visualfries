import { CommandType } from './CommandTypes.js';
import type { Command } from './Command.js';
// import type { HistoryCommand } from './HistoryCommand.js';

import { PlayCommand } from './PlayCommand.js';
import { PauseCommand } from './PauseCommand.js';
import { SeekCommand } from './SeekCommand.js';
import { UpdateComponentCommand } from './UpdateComponentCommand.js';
import { RenderCommand } from './RenderCommand.js';
import { ReplaceSourceOnTimeCommand } from './ReplaceSourceOnTimeCommand.js';
import { RenderFrameCommand } from './RenderFrameCommand.js';

export class CommandRunner {
	private playCommand: PlayCommand;
	private pauseCommand: PauseCommand;
	private seekCommand: SeekCommand;
	private replaceSourceOnTimeCommand: ReplaceSourceOnTimeCommand;
	private renderFrameCommand: RenderFrameCommand;
	private updateComponentCommand: UpdateComponentCommand;
	private renderCommand: RenderCommand;

	constructor(cradle: {
		playCommand: PlayCommand;
		pauseCommand: PauseCommand;
		seekCommand: SeekCommand;
		replaceSourceOnTimeCommand: ReplaceSourceOnTimeCommand;
		renderFrameCommand: RenderFrameCommand;
		updateComponentCommand: UpdateComponentCommand;
		renderCommand: RenderCommand;
	}) {
		this.playCommand = cradle.playCommand;
		this.pauseCommand = cradle.pauseCommand;
		this.seekCommand = cradle.seekCommand;
		this.replaceSourceOnTimeCommand = cradle.replaceSourceOnTimeCommand;
		this.renderFrameCommand = cradle.renderFrameCommand;
		this.updateComponentCommand = cradle.updateComponentCommand;
		this.renderCommand = cradle.renderCommand;
	}

	async run<T = void>(commandType: CommandType, props?: unknown): Promise<T> {
		let command: Command<T> | undefined; //  | HistoryCommand<T>

		switch (commandType) {
			case CommandType.PLAY:
				command = this.playCommand as unknown as Command<T> | undefined;
				break;
			case CommandType.PAUSE:
				command = this.pauseCommand as unknown as Command<T> | undefined;
				break;
			case CommandType.SEEK:
				command = this.seekCommand as unknown as Command<T> | undefined;
				break;
			case CommandType.REPLACE_SOURCE_ON_TIME:
				command = this.replaceSourceOnTimeCommand as unknown as Command<T> | undefined;
				break;
			case CommandType.RENDER_FRAME:
				command = this.renderFrameCommand as unknown as Command<T> | undefined;
				break;
			case CommandType.UPDATE_COMPONENT:
				command = this.updateComponentCommand as unknown as Command<T> | undefined;
				break;
			// ... add other cases as needed
			case CommandType.RENDER:
				throw new Error(`Render command should be run as runSync`);
			default:
				throw new Error(`Unknown command type: ${commandType}`);
		}

		if (!command) {
			throw Error('Command not set ' + commandType);
		}
		const result = await command.execute(props);

		if ('isHistoryCommand' in command && command.isHistoryCommand) {
			// this.sceneBuilder.addToHistory(command);
		}

		return result as T;
	}

	runSync<T>(commandType: CommandType, props?: unknown): T {
		let command: Command<T> | undefined;

		switch (commandType) {
			case CommandType.RENDER:
				command = this.renderCommand as unknown as Command<T> | undefined;
				break;
			default:
				throw new Error(`Unknown sync command type: ${commandType}`);
		}

		if (!command) {
			throw Error('Command not set ' + commandType);
		}
		const result = command.execute(props);

		if ('isHistoryCommand' in command && command.isHistoryCommand) {
			// this.sceneBuilder.addToHistory(command);
		}

		return result as T;
	}
}
