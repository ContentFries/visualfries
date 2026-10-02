import type { IComponentContext } from '../../../../index.js';
import type { RadialProgressConfig } from '../../../../index.js';
import { ProgressRenderer } from './ProgressRenderer.js';
export declare class RadialProgressRenderer extends ProgressRenderer {
    private config;
    constructor(context: IComponentContext, width: number, height: number, config: RadialProgressConfig);
    update(progress: number): void;
}
