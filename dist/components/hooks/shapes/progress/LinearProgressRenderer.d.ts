import type { IComponentContext } from '../../../..';
import type { LinearProgressConfig } from '../../../..';
import { ProgressRenderer } from './ProgressRenderer.js';
export declare class LinearProgressRenderer extends ProgressRenderer {
    private config;
    constructor(context: IComponentContext, width: number, height: number, config: LinearProgressConfig);
    update(progress: number): void;
}
