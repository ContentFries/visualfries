export type PixiTransformContainer = {
    x: number;
    y: number;
    alpha: number;
    angle: number;
    scale: {
        x: number;
        y: number;
        set?: (value: number) => void;
    };
};
export type PixiAnimationTarget = {
    x: number;
    y: number;
    opacity: number;
    scale: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
};
/**
 * Presents Pixi's transform model as the numeric properties used by native
 * VisualFries animation data. Rotation is expressed in degrees, matching the
 * scene schema; uniform scale maps to both Pixi scale axes.
 */
export declare function createPixiAnimationTarget(container: PixiTransformContainer, onChange?: () => void, origin?: {
    x: number;
    y: number;
}): PixiAnimationTarget;
