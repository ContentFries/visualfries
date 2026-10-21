import { checkKnown, frameOnHead, frameRect, roundRect } from './layout.js';
/**
 * The footage fills the frame. When its aspect differs from the format's, it is cropped around
 * the subject's head (smoothed). Portrait footage in a landscape frame is never cropped to a
 * sliver: it stands in a full-height window over the style's surface.
 */
export function fullLayout(input, zoom = 1) {
    const frame = frameRect(input.size);
    const footage = input.footage;
    if (footage && input.cls === 'landscape' && footage[1] > footage[0]) {
        const width = (footage[0] / footage[1]) * frame.height;
        const clip = roundRect({ x: (frame.width - width) / 2, y: 0, width, height: frame.height });
        return {
            camera: frameOnHead(clip, footage, input.subject, zoom),
            clip,
            radius: 0,
            slots: {},
            closed: {},
            fill: 'surface'
        };
    }
    return {
        camera: frameOnHead(frame, footage, input.subject, zoom),
        clip: frame,
        radius: 0,
        slots: {},
        closed: {},
        fill: null
    };
}
/** Shots framed like `full`: moving between them is no shot change. */
const FULL_FRAMED = ['full', 'punch', 'behind'];
/**
 * Events of a shot framed like `full`: the camera moving back from a strip (or another framed
 * shot) is a shot change; settling out of a punch-in or a room dimmed behind a word is not.
 */
export const fullEvents = ({ prev, morphFrames }) => prev && !FULL_FRAMED.includes(prev) ? [{ kind: 'shot', frame: Math.floor(morphFrames / 2) }] : [];
export const full = {
    name: 'full',
    enter: { seconds: 0.7, ease: 'expo.inOut' },
    layout: (input) => fullLayout(input),
    events: fullEvents,
    check: (params) => checkKnown(params, [])
};
