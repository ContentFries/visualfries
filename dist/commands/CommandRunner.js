import { CommandType } from './CommandTypes.js';
// import type { HistoryCommand } from './HistoryCommand.js';
import { PlayCommand } from './PlayCommand.js';
import { PauseCommand } from './PauseCommand.js';
import { SeekCommand } from './SeekCommand.js';
import { UpdateComponentCommand } from './UpdateComponentCommand.js';
import { RenderCommand } from './RenderCommand.js';
import { ReplaceSourceOnTimeCommand } from './ReplaceSourceOnTimeCommand.js';
import { RenderFrameCommand } from './RenderFrameCommand.js';
export class CommandRunner {
    playCommand;
    pauseCommand;
    seekCommand;
    replaceSourceOnTimeCommand;
    renderFrameCommand;
    updateComponentCommand;
    renderCommand;
    constructor(cradle) {
        this.playCommand = cradle.playCommand;
        this.pauseCommand = cradle.pauseCommand;
        this.seekCommand = cradle.seekCommand;
        this.replaceSourceOnTimeCommand = cradle.replaceSourceOnTimeCommand;
        this.renderFrameCommand = cradle.renderFrameCommand;
        this.updateComponentCommand = cradle.updateComponentCommand;
        this.renderCommand = cradle.renderCommand;
    }
    async run(commandType, props) {
        let command; //  | HistoryCommand<T>
        switch (commandType) {
            case CommandType.PLAY:
                command = this.playCommand;
                break;
            case CommandType.PAUSE:
                command = this.pauseCommand;
                break;
            case CommandType.SEEK:
                command = this.seekCommand;
                break;
            case CommandType.REPLACE_SOURCE_ON_TIME:
                command = this.replaceSourceOnTimeCommand;
                break;
            case CommandType.RENDER_FRAME:
                command = this.renderFrameCommand;
                break;
            case CommandType.UPDATE_COMPONENT:
                command = this.updateComponentCommand;
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
        return result;
    }
    runSync(commandType, props) {
        let command;
        switch (commandType) {
            case CommandType.RENDER:
                command = this.renderCommand;
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
        return result;
    }
}
