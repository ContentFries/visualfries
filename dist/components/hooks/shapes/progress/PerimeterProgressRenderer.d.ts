import type { IComponentContext } from '../../../..';
import type { PerimeterProgressConfig } from '../../../..';
import { ProgressRenderer } from './ProgressRenderer.js';
export declare class PerimeterProgressRenderer extends ProgressRenderer {
    private config;
    constructor(context: IComponentContext, width: number, height: number, config: PerimeterProgressConfig);
    update(progress: number): void;
    private getRectanglesForStartCorner;
}
