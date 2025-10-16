import * as PIXI from 'pixi.js-legacy';
import type { ColorType } from '..';
interface PixiColorResult {
    type: 'solid' | 'gradient';
    color?: number;
    texture?: PIXI.Texture;
    width?: number;
    height?: number;
}
interface BgShape {
    enabled: boolean;
    color: ColorType;
    target?: string;
    radius?: number;
}
type BackgroundShape = BgShape | ColorType | null | undefined;
export declare class PixiColorTransformer {
    #private;
    static transform(background: BackgroundShape, width: number, height: number): PixiColorResult;
    static isGradient(background: BackgroundShape): boolean;
}
export {};
