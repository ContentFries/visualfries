import * as PIXI from 'pixi.js-legacy';
import type { IComponentContext } from '../../../..';
/**
 * Base class for progress renderers
 */
export declare abstract class ProgressRenderer {
    #private;
    protected context: IComponentContext;
    protected displayObject: PIXI.Container;
    protected width: number;
    protected height: number;
    protected isGradient: boolean;
    constructor(context: IComponentContext, width: number, height: number);
    protected getSolidColor(): string | 0 | undefined;
    abstract update(progress: number): void;
    getDisplayObject(): PIXI.Container;
}
