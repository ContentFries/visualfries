/**
 * Presents Pixi's transform model as the numeric properties used by native
 * VisualFries animation data. Rotation is expressed in degrees, matching the
 * scene schema; uniform scale maps to both Pixi scale axes.
 */
export function createPixiAnimationTarget(container, onChange = () => undefined) {
    return {
        get x() {
            return container.x;
        },
        set x(value) {
            container.x = value;
            onChange();
        },
        get y() {
            return container.y;
        },
        set y(value) {
            container.y = value;
            onChange();
        },
        get opacity() {
            return container.alpha;
        },
        set opacity(value) {
            container.alpha = value;
            onChange();
        },
        get scale() {
            return container.scale.x;
        },
        set scale(value) {
            if (container.scale.set)
                container.scale.set(value);
            else {
                container.scale.x = value;
                container.scale.y = value;
            }
            onChange();
        },
        get scaleX() {
            return container.scale.x;
        },
        set scaleX(value) {
            container.scale.x = value;
            onChange();
        },
        get scaleY() {
            return container.scale.y;
        },
        set scaleY(value) {
            container.scale.y = value;
            onChange();
        },
        get rotation() {
            return container.angle;
        },
        set rotation(value) {
            container.angle = value;
            onChange();
        }
    };
}
