import type { IComponentContext } from '../../../..';
import type { RadialProgressConfig } from '../../../..';
import { ProgressRenderer } from './ProgressRenderer.js';
export declare class RadialProgressRenderer extends ProgressRenderer {
    private config;
    constructor(context: IComponentContext, width: number, height: number, config: RadialProgressConfig);
    update(progress: number): void;
}
