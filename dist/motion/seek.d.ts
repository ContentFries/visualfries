/**
 * Seek a paused timeline to `t` by always playing forward from 0. GSAP renders a timeline's
 * children forward when time increases and backward when it decreases, so where tweens overlap
 * on one property the last writer would depend on the previous frame. One path per frame keeps
 * the result independent of seek order.
 */
export declare function seekTimeline(tl: gsap.core.Timeline, t: number): void;
