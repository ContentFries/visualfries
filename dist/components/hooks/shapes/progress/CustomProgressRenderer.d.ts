import type { IComponentContext } from '../../../../index.js';
import type { CustomProgressConfig } from '../../../../index.js';
import { ProgressRenderer } from './ProgressRenderer.js';
export declare class CustomProgressRenderer extends ProgressRenderer {
    private config;
    constructor(context: IComponentContext, width: number, height: number, config: CustomProgressConfig);
    update(progress: number): void;
}
