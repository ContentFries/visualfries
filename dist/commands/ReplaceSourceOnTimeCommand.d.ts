import type { Command } from './Command.js';
export declare class ReplaceSourceOnTimeCommand implements Command<void> {
    execute(args: unknown): Promise<void>;
}
