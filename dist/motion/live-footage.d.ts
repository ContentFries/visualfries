import type { FootagePictures } from './program-stage.js';
import type { FootageLayer } from './footage.js';
import type { FootageMap } from './footage-map.js';
import type { LiveSource } from './live-manifest.js';
type SideName = 'a' | 'b';
export type DriftSample = {
    at: number;
    drift: number;
    source: string;
};
export type LiveFootage = FootagePictures & {
    /**
     * Keeps the videos on the clock and paints the pictures shown since the last tick: `t` is the
     * program time in seconds, `frame` the program frame drawn.
     */
    tick(t: number, frame: number, playing: boolean): void;
    /** Seeks `side`'s video of `source` to `frame` while another source is on screen. */
    preroll(side: SideName, source: string, frame: number): void;
    /**
     * An explicit seek to program time `t`: seeks every video on screen to where it should be at
     * once, playing too (`tick` would only let it catch up).
     */
    align(t: number): void;
    /**
     * Resolves once every video on screen shows the frame it should (after a seek), or at once
     * after `destroy`; rejects when one fails to load.
     */
    settled(): Promise<void>;
    /**
     * Source frame `frame` of `source` as a picture of its own, for blocks (`<Footage>`,
     * `<Subject>`, `clip.picture()`): `plate`, or `subject` with the matte as its alpha.
     */
    picture(source: string, frame: number, layer: FootageLayer): Promise<HTMLCanvasElement>;
    /** Forgets the pictures (a new scene makes its own); the videos stay loaded. */
    reset(map: FootageMap | null): void;
    stats: {
        resyncs: number;
        drift: DriftSample[];
        stalls: number;
    };
    destroy(): void;
};
/**
 * Footage pictures for `createProgramScene` that play proxy videos instead of loading extracted
 * frames: one video per side and source, kept on the program clock (`tick`), drawn into canvases
 * the scene places, turns and filters like its `<img>` pictures. The subject comes from the
 * packed matte through WebGL. The videos sit hidden in `parent`.
 */
export declare function createLiveFootage(sources: Record<string, LiveSource>, fps: number, clockAt: (perf: number) => number, map: FootageMap | null, parent: HTMLElement): LiveFootage;
export {};
