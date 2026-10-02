import type { IComponentContext } from '../../../../index.js';
import type { LinearProgressConfig } from '../../../../index.js';
import { ProgressRenderer } from './ProgressRenderer.js';
export declare class LinearProgressRenderer extends ProgressRenderer {
    private config;
    constructor(context: IComponentContext, width: number, height: number, config: LinearProgressConfig);
    update(progress: number): void;
}
