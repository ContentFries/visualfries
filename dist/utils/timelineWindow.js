export const TIMELINE_BOUNDARY_EPSILON = 1e-7;
export function isTimeWithinTimeline(currentTime, startAt, endAt, epsilon = TIMELINE_BOUNDARY_EPSILON) {
    if (endAt - startAt <= epsilon) {
        return currentTime >= startAt - epsilon && currentTime <= endAt + epsilon;
    }
    return currentTime >= startAt - epsilon && currentTime < endAt - epsilon;
}
