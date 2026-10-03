/**
 * Seek a paused timeline to `t` the same way every time: jump to the end, rewind to 0, then play
 * forward to `t`. GSAP renders a timeline's children forward when time increases and backward
 * when it decreases, and skips children it considers already in place, so where tweens overlap
 * on one property a plain seek leaves the frame depending on the frame before it. From the end
 * every child has progressed, so the rewind restores every start value in reverse order and the
 * forward pass then writes in timeline order: one path per frame, whatever the request order.
 */
export function seekTimeline(tl, t) {
    tl.progress(1, true);
    tl.progress(0, true);
    tl.seek(t, true);
}
