import type { Command } from './Command.js';
export declare class PlayCommand implements Command<void> {
    execute(): Promise<void>;
}
