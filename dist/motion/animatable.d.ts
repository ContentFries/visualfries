import type { BlockAnimatable } from './cutlist.js';
/**
 * Reads the block's `animatable` export from its source: `{ props: {} }` when it has none, an
 * error when the source does not parse or the declaration is not a literal object of kinds.
 */
export declare function readAnimatable(source: string, file: string): Promise<BlockAnimatable>;
/** `readAnimatable` of a block file; a missing file declares nothing (bundling reports it). */
export declare function readBlockAnimatable(file: string): Promise<BlockAnimatable>;
