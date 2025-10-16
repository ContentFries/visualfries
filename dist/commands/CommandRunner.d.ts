import { CommandType } from './CommandTypes.js';
import { PlayCommand } from './PlayCommand.js';
import { PauseCommand } from './PauseCommand.js';
import { SeekCommand } from './SeekCommand.js';
import { UpdateComponentCommand } from './UpdateComponentCommand.js';
import { RenderCommand } from './RenderCommand.js';
import { ReplaceSourceOnTimeCommand } from './ReplaceSourceOnTimeCommand.js';
import { RenderFrameCommand } from './RenderFrameCommand.js';
export declare class CommandRunner {
    private playCommand;
    private pauseCommand;
    private seekCommand;
    private replaceSourceOnTimeCommand;
    private renderFrameCommand;
    private updateComponentCommand;
    private renderCommand;
    constructor(cradle: {
        playCommand: PlayCommand;
        pauseCommand: PauseCommand;
        seekCommand: SeekCommand;
        replaceSourceOnTimeCommand: ReplaceSourceOnTimeCommand;
        renderFrameCommand: RenderFrameCommand;
        updateComponentCommand: UpdateComponentCommand;
        renderCommand: RenderCommand;
    });
    run<T = void>(commandType: CommandType, props?: unknown): Promise<T>;
    runSync<T>(commandType: CommandType, props?: unknown): T;
}
