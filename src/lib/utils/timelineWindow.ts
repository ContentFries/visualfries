export const TIMELINE_BOUNDARY_EPSILON = 1e-7;

export function isTimeWithinTimeline(
	currentTime: number,
	startAt: number,
	endAt: number,
	epsilon = TIMELINE_BOUNDARY_EPSILON
): boolean {
	if (endAt - startAt <= epsilon) {
		return currentTime >= startAt - epsilon && currentTime <= endAt + epsilon;
	}

	return currentTime >= startAt - epsilon && currentTime < endAt - epsilon;
}
