import { type ShotModule } from './layout.js';
/**
 * A whip pan away from the speaker: the camera flies off the frame with motion blur while a
 * `card` slot the size of the frame flies in from the other side, and the morph out of the shot
 * whips back the other way. Both moves make a `whip` event halfway, where the blur peaks.
 * `direction` is where the camera goes: `left`, `right`, `up`, `down`, or `forward`/`back`
 * (left/right in landscape and square, up/down in portrait; default `forward`). `blur` is the
 * peak blur in pixels of a 1920 px move (default 48; 0: none). Without a clip in the slot the
 * style's surface shows.
 */
export declare const whip: ShotModule;
