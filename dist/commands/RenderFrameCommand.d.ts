import type { Command } from './Command.js';
import { StateManager } from '../managers/StateManager.svelte.js';
import { DomManager } from '../managers/DomManager.js';
import { AppManager } from '../managers/AppManager.svelte.js';
import { DeterministicMediaManager } from '../managers/DeterministicMediaManager.js';
export declare class RenderFrameCommand implements Command<string | ArrayBuffer | Blob | null> {
    private sceneState;
    private domManager;
    private appManager;
    private lastRenderedFrame;
    private lastRenderArgs;
    private deterministicMediaManager?;
    private lastDeterministicFingerprint;
    constructor(cradle: {
        stateManager: StateManager;
        domManager: DomManager;
        appManager: AppManager;
        deterministicMediaManager?: DeterministicMediaManager;
    });
    private resolveBlobMimeType;
    execute(args: unknown): Promise<string | ArrayBuffer | Blob | null>;
}
