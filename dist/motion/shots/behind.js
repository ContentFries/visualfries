import { fullEvents, fullLayout } from './full.js';
import { checkKnown, checkNumber, facePoint, numberParam, roundRect } from './layout.js';
/** How much darker the room gets (0–1). The approved look: 0.55. */
const DIM = 0.55;
/** Blur of the room in pixels per 1080 px of the frame's shorter side. */
const BLUR = 12;
/** The `word` slot reaches this far above the head and below the face, of the window height. */
const ABOVE_HEAD = 0.12;
const BELOW_FACE = 0.18;
/**
 * The stage for a word behind the speaker's head. The footage stays framed like `full`
 * (`scale` goes closer), the room around the speaker dims and blurs while the speaker, cut out
 * by the matte, stays sharp in front of it, and a `word` slot follows the head: from a little
 * above it to below the face, across the whole frame. The shot sets the stage; the word itself
 * is a clip with `"layer": "behind"` (and `"slot": "word"` to follow the head), drawn between
 * the room and the speaker. `dim` is how much darker the room gets (0–0.9), `blur` its blur in
 * pixels at 1080 px (0–40). Needs footage with a matte.
 */
export const behind = {
    name: 'behind',
    enter: { seconds: 0.3, ease: 'expo.out' },
    needsMatte: true,
    layout(input) {
        const { size, subject, params } = input;
        const base = fullLayout(input, numberParam(params, 'scale', 1));
        const { camera, clip } = base;
        const face = facePoint(subject);
        const faceY = camera.y + face.y * camera.height;
        const headTop = subject
            ? camera.y + subject.headY * camera.height
            : faceY - 0.1 * camera.height;
        const top = Math.max(clip.y, headTop - ABOVE_HEAD * clip.height);
        const bottom = Math.min(clip.y + clip.height, faceY + BELOW_FACE * clip.height);
        const word = roundRect({ x: clip.x, y: top, width: clip.width, height: bottom - top });
        return {
            ...base,
            // The slot does not slide: the word's own clip brings it in and out.
            slots: { word },
            closed: { word },
            room: {
                dim: numberParam(params, 'dim', DIM),
                blur: Math.round(((numberParam(params, 'blur', BLUR) * Math.min(...size)) / 1080) * 100) / 100
            }
        };
    },
    events: fullEvents,
    check: (params) => [
        ...checkKnown(params, ['scale', 'dim', 'blur']),
        ...checkNumber(params, 'scale', 1, 4),
        ...checkNumber(params, 'dim', 0, 0.9),
        ...checkNumber(params, 'blur', 0, 40)
    ]
};
