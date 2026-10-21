import type { BlockAnimatable } from './cutlist.js';
/** Reads `export const animatable` from a block's source; `{ props: {} }` when it has none. */
export declare function readAnimatable(source: string, file: string): Promise<BlockAnimatable>;
/** `readAnimatable` of a block file; a missing file declares nothing (bundling reports it). */
export declare function readBlockAnimatable(file: string): Promise<BlockAnimatable>;
