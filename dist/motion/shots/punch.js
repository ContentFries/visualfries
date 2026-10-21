import { fullLayout } from './full.js';
import { checkKnown, checkNumber, numberParam } from './layout.js';
/** How much closer a punch-in goes, by the style's energy. */
export const PUNCH_SCALE = { calm: 1.25, balanced: 1.45, punchy: 1.6 };
/** Without a style: the approved look. */
export const DEFAULT_PUNCH_SCALE = 1.45;
/**
 * A punch-in: the full frame, `params.scale` times closer, toward the head. In fast and out
 * slower; the hit is the first frame.
 */
export const punch = {
    name: 'punch',
    enter: { seconds: 0.16, ease: 'power4.out' },
    leave: { seconds: 0.45, ease: 'power3.inOut' },
    layout: (input) => fullLayout(input, numberParam(input.params, 'scale', input.energy ? PUNCH_SCALE[input.energy] : DEFAULT_PUNCH_SCALE)),
    events: () => [{ kind: 'punch', frame: 0 }],
    check: (params) => [...checkKnown(params, ['scale']), ...checkNumber(params, 'scale', 1, 4)]
};
