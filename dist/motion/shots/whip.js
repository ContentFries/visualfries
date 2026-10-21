import { fullLayout } from './full.js';
import { checkKnown, checkNumber, frameRect, numberParam } from './layout.js';
import { screenDirection } from '../transitions/index.js';
/** Peak motion blur (standard deviation, px) over a 1920 px move. */
const BLUR = 48;
const DIRECTIONS = ['forward', 'back', 'left', 'right', 'up', 'down'];
/**
 * A whip pan away from the speaker: the camera flies off the frame with motion blur while a
 * `card` slot the size of the frame flies in from the other side, and the morph out of the shot
 * whips back the other way. Both moves make a `whip` event halfway, where the blur peaks.
 * `direction` is where the camera goes: `left`, `right`, `up`, `down`, or `forward`/`back`
 * (left/right in landscape and square, up/down in portrait; default `forward`). `blur` is the
 * peak blur in pixels of a 1920 px move (default 48; 0: none). Without a clip in the slot the
 * style's surface shows.
 */
export const whip = {
    name: 'whip',
    enter: { seconds: 0.42, ease: 'power3.inOut' },
    leave: { seconds: 0.42, ease: 'power3.inOut' },
    leaveEvent: 'whip',
    layout(input) {
        const [W, H] = input.size;
        const frame = frameRect(input.size);
        const d = screenDirection(typeof input.params.direction === 'string' ? input.params.direction : null, input.cls);
        const dx = d === 'left' ? -W : d === 'right' ? W : 0;
        const dy = d === 'up' ? -H : d === 'down' ? H : 0;
        const shift = (r, k) => ({
            ...r,
            x: r.x + k * dx,
            y: r.y + k * dy
        });
        // The footage framed as in `full`, one frame away along the whip.
        const full = fullLayout(input);
        return {
            camera: shift(full.camera, 1),
            clip: shift(full.clip, 1),
            radius: 0,
            slots: { card: frame },
            closed: { card: shift(frame, -1) },
            fill: 'surface'
        };
    },
    blur({ size: [W, H], cls, params }) {
        const d = screenDirection(typeof params.direction === 'string' ? params.direction : null, cls);
        const across = d === 'left' || d === 'right';
        const peak = (numberParam(params, 'blur', BLUR) * (across ? W : H)) / 1920;
        return across ? { x: peak, y: 0 } : { x: 0, y: peak };
    },
    events: ({ prev, morphFrames }) => prev === null ? [] : [{ kind: 'whip', frame: Math.floor(morphFrames / 2) }],
    check: (params) => [
        ...checkKnown(params, ['direction', 'blur']),
        ...(params.direction === undefined || DIRECTIONS.includes(params.direction)
            ? []
            : [
                `"direction" must be one of ${DIRECTIONS.join(', ')} (got ${JSON.stringify(params.direction)}).`
            ]),
        ...checkNumber(params, 'blur', 0, 400)
    ]
};
