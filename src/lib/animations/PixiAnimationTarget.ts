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
export function createPixiAnimationTarget(
	container: PixiTransformContainer,
	onChange: () => void = () => undefined
): PixiAnimationTarget {
	return {
		get x() {
			return container.x;
		},
		set x(value: number) {
			container.x = value;
			onChange();
		},
		get y() {
			return container.y;
		},
		set y(value: number) {
			container.y = value;
			onChange();
		},
		get opacity() {
			return container.alpha;
		},
		set opacity(value: number) {
			container.alpha = value;
			onChange();
		},
		get scale() {
			return container.scale.x;
		},
		set scale(value: number) {
			if (container.scale.set) container.scale.set(value);
			else {
				container.scale.x = value;
				container.scale.y = value;
			}
			onChange();
		},
		get scaleX() {
			return container.scale.x;
		},
		set scaleX(value: number) {
			container.scale.x = value;
			onChange();
		},
		get scaleY() {
			return container.scale.y;
		},
		set scaleY(value: number) {
			container.scale.y = value;
			onChange();
		},
		get rotation() {
			return container.angle;
		},
		set rotation(value: number) {
			container.angle = value;
			onChange();
		}
	};
}
