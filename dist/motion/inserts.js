import { segmentStage } from './segments.js';
import { shotsDuring } from './shots/index.js';
import { transitionModule } from './transitions/index.js';
/**
 * The inserts export of a program (`render --export inserts`): one file per clip, for an editor
 * to lay over the rough cut. An insert is the clip exactly as the program draws it, alone:
 *
 * - **Time:** the clip's program window plus handles (default 10 frames each side, never past
 *   the program's ends), in which the clip holds its first or last frame, as it does inside a
 *   transition window.
 * - **Place:** frame coordinates. The file has the program's frame size and the clip sits where
 *   the program draws it: placement keys move it, and a clip in a shot's slot follows the slot
 *   wherever the shot puts it (morphs and whips included). Over the program's own picture every
 *   insert lines up pixel for pixel, except where a transition moves the clip in the program (a
 *   behind clip rides the footage's side; `insertNotes` names those frames). A slotted clip shows
 *   only while the shot frees its slot, in the handles too.
 * - **Alpha:** every clip of a program is drawn over the footage, so inserts are transparent
 *   (ProRes 4444, straight alpha) unless the clip says `"alpha": false`; it is then drawn over
 *   its `background` as an opaque H.264 file. Behind clips are always transparent.
 * - **Behind:** a clip with `"layer": "behind"` becomes a holdout insert: its alpha is cut out
 *   wherever the subject is, as the program draws the subject over it (alpha × (1 − subject)).
 *   Laid over the footage it sits behind the speaker.
 *
 * Not in inserts: the cut list itself, shots (framing, fills, dimmed rooms, motion blur of the
 * footage) and transitions; they stay in the program render. `insertNotes` says where a program
 * relies on them.
 */
/** Frames of handle before and after each insert unless `--handles` says otherwise. */
export const DEFAULT_INSERT_HANDLES = 10;
const endOf = (s) => s.startFrame + s.frames;
/** Shots that show the footage as the plain rough cut does: the whole frame, no zoom. */
const UNFRAMED = new Set(['full', 'behind']);
/** The pieces of the cut list under program frames `[startFrame, startFrame + frames)`. */
export function cutListUnder(program, startFrame, frames) {
    const end = startFrame + frames;
    return program.cuts.flatMap((cut) => {
        const pieces = [];
        const moving = endOf(cut) - (cut.hold ?? 0);
        const from = Math.max(startFrame, cut.startFrame);
        const to = Math.min(end, moving);
        if (from < to) {
            const srcIn = cut.srcIn + (from - cut.startFrame);
            pieces.push({
                cut: cut.id,
                source: cut.source,
                startFrame: from,
                frames: to - from,
                srcIn,
                srcOut: srcIn + (to - from)
            });
        }
        const holdFrom = Math.max(startFrame, moving);
        const holdTo = Math.min(end, endOf(cut));
        if (cut.hold && holdFrom < holdTo)
            pieces.push({
                cut: cut.id,
                source: cut.source,
                startFrame: holdFrom,
                frames: holdTo - holdFrom,
                srcIn: cut.srcOut - 1,
                srcOut: cut.srcOut,
                hold: true
            });
        return pieces;
    });
}
/** Shots on screen with `clip` that frame the footage differently from the plain rough cut. */
function reframingShots(program, clip) {
    return shotsDuring(program.shots, clip).filter((s) => s.startFrame < endOf(clip) &&
        endOf(s) > clip.startFrame &&
        (!UNFRAMED.has(s.shot) ||
            s.keys.length > 0 ||
            (s.shot === 'behind' && typeof s.params.scale === 'number' && s.params.scale !== 1)));
}
const list = (names) => names.map((n) => `"${n}"`).join(', ');
/**
 * Why the insert of `clip` differs from the clip in the program render, one note per reason;
 * a warning where the project asks for something the insert does not do.
 */
function clipNotes(program, spec, clip) {
    const info = [];
    const warnings = [];
    const seconds = (f) => `${(f / program.fps).toFixed(2)} s`;
    for (const t of program.transitions) {
        if (!transitionModule(t.type))
            continue;
        if (t.kind === 'clip' && t.owner === clip.id)
            info.push(`Its ${t.type} transition is drawn only in the program render; the insert cuts in on the clip's first frame.`);
        else if (t.kind !== 'clip' && t.cutFrame === clip.startFrame)
            info.push(`In the program it arrives with the ${t.type} transition into ${t.owner}; the insert cuts in.`);
        else if (t.kind !== 'clip' && t.cutFrame === endOf(clip))
            info.push(`In the program it leaves with the ${t.type} transition into ${t.owner}; the insert cuts out.`);
        else if (t.kind !== 'clip' &&
            clip.layer === 'behind' &&
            t.startFrame < endOf(clip) &&
            endOf(t) > clip.startFrame)
            // A behind clip lives on the footage's side of the stage: the transition moves (or
            // covers) it with the footage, while the insert stays where it is.
            info.push(`It sits behind the subject while the ${t.type} transition into ${t.owner} (${seconds(t.startFrame)}–${seconds(endOf(t))}) moves or covers the footage, and this clip with it, in the program; the insert stays still, so it does not line up with the program render in those frames.`);
    }
    const framed = reframingShots(program, clip);
    const shots = list(framed.map((s) => s.id));
    if (clip.slot && framed.length) {
        const keyed = clip.keys.some((k) => ['x', 'y', 'scale', 'rotation'].some((p) => k.values[p] !== undefined));
        info.push(`It fills the "${clip.slot}" slot of shot ${shots}: the insert is in frame coordinates, where the program puts the slot, so it lines up with the program's framing; over the unframed footage, frame the footage like the shot or use the program render.${keyed ? ' Its placement keys move it inside the slot, which follows the shot camera.' : ''}`);
    }
    if (clip.layer === 'behind' && framed.length)
        info.push(`It sits behind the subject while shot ${shots} reframes the footage: the holdout follows the subject as the program draws it, so it lines up with the program render, not with the unframed footage.`);
    if (spec?.audio)
        info.push(`"audio" is not muxed into the inserts of a program; the program's sound comes from the cut list.`);
    if (clip.layer === 'behind' && spec?.alpha === false)
        warnings.push('"alpha": false has no effect on a clip behind the subject: its insert is a holdout, so it is transparent (ProRes 4444).');
    return [
        ...warnings.map((message) => ({ level: 'warning', message })),
        ...info.map((message) => ({ level: 'info', message }))
    ];
}
/**
 * Where a program relies on what inserts cannot carry: transitions a clip rides or owns, slots
 * and holdouts under shots that reframe the footage, and (once) the shots and cut transitions
 * left to the program render, as info; what the project asks for and an insert does not do
 * (`"alpha": false` on a behind clip), as warnings. For `check --export inserts` and the render.
 */
export function insertNotes(program, project) {
    if (program.mode !== 'program')
        return [];
    const out = [];
    const shots = program.shots.filter((s) => !s.implicit).length;
    const staged = program.transitions.filter((t) => t.kind !== 'clip').length;
    if (shots || staged)
        out.push({
            level: 'info',
            item: 'inserts',
            field: 'export',
            message: `Inserts carry the clips only: ${[
                shots ? `${shots} shot${shots > 1 ? 's' : ''}` : '',
                staged ? `${staged} cut or shot transition${staged > 1 ? 's' : ''}` : ''
            ]
                .filter(Boolean)
                .join(' and ')} ${shots + staged === 1 ? 'stays' : 'stay'} in the program render (--export video).`
        });
    // A hold is program time the rough cut does not have unless the editor freezes the frame too.
    for (const cut of program.cuts) {
        if (!cut.hold)
            continue;
        const from = cut.startFrame + cut.frames - cut.hold;
        out.push({
            level: 'info',
            item: cut.id,
            field: 'export',
            message: `${cut.id} holds source frame ${cut.srcOut - 1} for ${cut.hold} frames from program frame ${from}: give the rough cut the same freeze frame there, or every insert after it lands ${cut.hold} frames late against the footage.`
        });
    }
    for (const clip of program.clips)
        for (const { level, message } of clipNotes(program, project.clips.find((c) => c.id === clip.id), clip))
            out.push({ level, clip: clip.id, field: 'export', message });
    return out;
}
/**
 * One plan per clip (or per clip in `clips`, in program order): the file's program frames with
 * handles, alpha, holdout, the cut list under it and its notes.
 */
export function planInserts(program, project, opts = {}) {
    const handles = opts.handles ?? DEFAULT_INSERT_HANDLES;
    if (!Number.isInteger(handles) || handles < 0)
        throw new Error(`--handles must be a whole number of frames (0 or more), got ${handles}.`);
    const known = program.clips.map((c) => c.id);
    const unknown = (opts.clips ?? []).filter((id) => !known.includes(id));
    if (unknown.length)
        throw new Error(`Unknown clip ${list(unknown)}. Clips: ${known.join(', ') || 'none'}`);
    const picked = opts.clips?.length
        ? program.clips.filter((c) => opts.clips.includes(c.id))
        : program.clips;
    return picked.map((clip) => {
        const spec = project.clips.find((c) => c.id === clip.id);
        const before = Math.max(0, Math.min(handles, clip.startFrame));
        const after = Math.max(0, Math.min(handles, program.frames - endOf(clip)));
        const startFrame = clip.startFrame - before;
        const frames = clip.frames + before + after;
        const holdout = clip.layer === 'behind';
        const alpha = holdout || spec?.alpha !== false;
        return {
            id: clip.id,
            clip,
            startFrame,
            frames,
            handles: { before, after },
            alpha,
            background: alpha ? null : clip.background,
            holdout,
            sources: cutListUnder(program, startFrame, frames),
            notes: clipNotes(program, spec, clip).map((n) => n.message)
        };
    });
}
/**
 * The page data that draws one insert: the program's stage with this clip alone, no footage
 * picture, no transitions, the clip on screen (holding its edge frames) over the whole file.
 * Shots stay: they place the clip's slot and the subject a holdout cuts out.
 */
export function insertStage(program, plan, footage, brand) {
    const span = { id: `insert-${plan.id}`, startFrame: plan.startFrame, frames: plan.frames };
    const data = segmentStage({ ...program, clips: [plan.clip], transitions: [] }, span, footage, brand);
    for (const clip of data.clips)
        clip.show = { from: plan.startFrame, until: endOf(plan) };
    return { ...data, background: plan.background, insert: { holdout: plan.holdout } };
}
/**
 * A clip with `"layer": "behind"` in a project without `cuts` or `shots`: the footage whose
 * matte its holdout uses (the one footage with a matte), or why it has none. Null for other
 * clips. Rendered as #82 did: ffmpeg multiplies the clip's alpha by the inverse of that matte,
 * aligned to the program frame by the footage's `start`.
 */
export function holdoutFootage(project, clipId) {
    const spec = project.clips.find((c) => c.id === clipId);
    if (spec?.layer !== 'behind')
        return null;
    if (!spec.alpha)
        return {
            error: '"behind" cuts the subject out of the alpha channel, so the clip needs "alpha": true.'
        };
    const matted = Object.entries(project.footage ?? {})
        .filter(([, f]) => f.matte)
        .map(([name]) => name);
    if (matted.length === 1)
        return { footage: matted[0] };
    return {
        error: matted.length
            ? `"behind" cuts out the subject of the one footage with a matte, but ${list(matted)} all have one.`
            : '"behind" needs footage with a matte ("matte": "….matte.mp4", see visualfries matte).'
    };
}
