export interface Command<T = void> {
	execute(args?: unknown): Promise<T>;
}

export interface SyncCommand<T = void> {
	execute(args?: unknown): T;
}
