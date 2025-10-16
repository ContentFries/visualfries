import type { IComponentContext } from '../../../..';
import type { DoubleProgressConfig } from '../../../..';
import { ProgressRenderer } from './ProgressRenderer.js';
export declare class DoubleProgressRenderer extends ProgressRenderer {
    private config;
    constructor(context: IComponentContext, width: number, height: number, config: DoubleProgressConfig);
    update(progress: number): void;
}
