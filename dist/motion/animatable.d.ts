import type { BlockAnimatable, BlockEvents } from './cutlist.js';
/**
 * Reads the events a block declares for anchors (`{ "event": "land", "clip": "kick" }` in sfx,
 * shots and music keys) from its module script, without running it:
 *
 *   <script module>
 *     export const events = { land: 'tail+0.98', bonk: 'end-0.2' };
 *   </script>
 *
 * Each value is a moment of the clip (the grammar of `clip.at`) or clip seconds. The block reads
 * the same moments (`clip.at(events.land)`), so the program and the block agree by construction.
 */
export declare function readEvents(source: string, file: string): Promise<BlockEvents>;
/** `readEvents` of a block file; a missing file declares nothing (bundling reports it). */
export declare function readBlockEvents(file: string): Promise<BlockEvents>;
/**
 * Reads the block's `animatable` export from its source: `{ props: {} }` when it has none, an
 * error when the source does not parse or the declaration is not a literal object of kinds.
 */
export declare function readAnimatable(source: string, file: string): Promise<BlockAnimatable>;
/** `readAnimatable` of a block file; a missing file declares nothing (bundling reports it). */
export declare function readBlockAnimatable(file: string): Promise<BlockAnimatable>;
