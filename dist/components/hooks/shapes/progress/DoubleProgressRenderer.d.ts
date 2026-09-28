import type { IComponentContext } from '../../../../index.js';
import type { DoubleProgressConfig } from '../../../../index.js';
import { ProgressRenderer } from './ProgressRenderer.js';
export declare class DoubleProgressRenderer extends ProgressRenderer {
    private config;
    constructor(context: IComponentContext, width: number, height: number, config: DoubleProgressConfig);
    update(progress: number): void;
}
