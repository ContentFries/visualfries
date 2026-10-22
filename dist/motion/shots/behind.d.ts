import { type ShotModule } from './layout.js';
/**
 * The stage for a word behind the speaker's head. The footage stays framed like `full`
 * (`scale` goes closer), the room around the speaker dims and blurs while the speaker, cut out
 * by the matte, stays sharp in front of it, and a `word` slot follows the head: from a little
 * above it to below the face, across the whole frame. The shot sets the stage; the word itself
 * is a clip with `"layer": "behind"` (and `"slot": "word"` to follow the head), drawn between
 * the room and the speaker. `dim` is how much darker the room gets (0–0.9), `blur` its blur in
 * pixels at 1080 px (0–40). Needs footage with a matte.
 */
export declare const behind: ShotModule;
