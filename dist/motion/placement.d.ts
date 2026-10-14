/**
 * Placing rendered clips on an editor's timeline.
 *
 * - `parseFcpxmlCuts` reads the picture cut points (program seconds) of an NLE timeline exported as
 *   FCPXML (tested with DaVinci Resolve, FCPXML 1.9): every boundary between primary-storyline
 *   clips plus the in/out of connected video clips (B-roll on a lane above).
 * - `placeClips` turns rendered clips (with their handles) into visible windows: the window is the
 *   spoken words, full-screen neighbours whose handles overlap are joined in the middle of the gap,
 *   and an edge that faces the camera snaps onto a cut inside its handle — otherwise a few frames of
 *   the old shot flash between a cut and an insert. Full-screen clips alternate two tracks so
 *   overlapping handles never collide; alpha clips get a third.
 */
export declare function parseFcpxmlCuts(xml: string): {
    cuts: number[];
    duration: number;
};
export type PlaceInput = {
    id: string;
    /** Program seconds of the rendered file, handles included. */
    programStart: number;
    programEnd: number;
    alpha: boolean;
    /** Seconds of handle before the words (default `handle`; 0 for a clip starting at 0). */
    head?: number;
    /** Seconds of handle after the words (the clip's `tail`). */
    tail?: number;
    /** false keeps the edges where they are (a transition that straddles its cut on purpose). */
    snap?: boolean;
};
export type Placed = PlaceInput & {
    /** Visible window on the timeline (program seconds, frame-rounded). */
    in: number;
    out: number;
    /** V2/V3 alternate for full-screen clips, V4 for alpha clips. */
    track: 'V2' | 'V3' | 'V4';
    snapIn?: number;
    snapOut?: number;
    joinedIn?: boolean;
    joinedOut?: boolean;
};
export declare function placeClips(clips: PlaceInput[], opts: {
    fps: number;
    handle?: number;
    cuts?: number[];
    joinGap?: number;
    snapInto?: number;
}): Placed[];
