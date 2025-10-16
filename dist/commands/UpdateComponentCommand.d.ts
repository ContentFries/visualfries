import type { Command } from './Command.js';
export declare class UpdateComponentCommand implements Command<boolean> {
    execute(props: unknown): Promise<boolean>;
}
