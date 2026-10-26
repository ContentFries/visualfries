import type { ProgramTransition, ResolvedKey } from './program.js';
import type { ShotSpan } from './shots/index.js';

/**
 * Shot moves and the captions that start inside them: a morph into a shot (a strip's panel
 * rising, a whip), a fast move of a shot's keys, or a cut or shot transition. Captions that
 * start on the same anchor as such a move are drawn over the moving panel or the face until it
 * lands. Pure: the windows come from the program data; the stage measures the overlap (see
 * `measure` in `program-stage.ts`) and `check` says when the move ends. Nothing moves on its own.
 */

/** Two shot keys at most this far apart move the camera fast enough to count as a move. */
export const FAST_KEY_SECONDS = 1;
/**
 * Share of the captions' text area over a moving panel from which they count as drawn over it:
 * below a fifth, the panel's edge only grazes a line.
 */
export const PANEL_TEXT_SHARE = 0.2;
/** Captions starting this many frames before a move still start on its anchor. */
const LEAD_FRAMES = 2;

export type ShotMove = {
	/** What moves, as the warning names it: `the strip shot "auto" morphing in`. */
	what: string;
	/** Program frames of the move: `[from, to)`. */
	from: number;
	to: number;
};

/** A key value as compared: `"12"` and `12` are one, so are `0`, `"0px"` and `"0%"`. */
function same(value: unknown): string {
	if (typeof value !== 'string') return String(value);
	const v = value.trim();
	if (/^[-+]?(\d+\.?\d*|\.\d+)(px)?$/.test(v)) return String(parseFloat(v));
	if (/^[-+]?0*\.?0+%$/.test(v)) return '0';
	return v;
}

/** Camera values a shot key may leave out, as the camera has them without keys. */
const CAMERA_DEFAULTS: Record<string, unknown> = { scale: 1, x: 0, y: 0, rotation: 0 };

/**
 * The camera at each of a shot's keys: every value but `opacity` (a fade moves nothing), as
 * that key or an earlier one sets it, else the camera's default. Keys that only name a value
 * the camera already has (`{ "scale": 1 }` then `{ "scale": 1, "x": 0 }`) do not move it.
 */
function cameras(keys: readonly ResolvedKey[]): string[] {
	const names = new Set(Object.keys(CAMERA_DEFAULTS));
	for (const k of keys) for (const name of Object.keys(k.values)) names.add(name);
	names.delete('opacity');
	const now: Record<string, unknown> = {};
	for (const name of names) now[name] = CAMERA_DEFAULTS[name] ?? 0;
	return keys.map((k) => {
		for (const [name, value] of Object.entries(k.values)) if (names.has(name)) now[name] = value;
		return JSON.stringify([...names].sort().map((name) => same(now[name])));
	});
}

/**
 * The moves of a program (or a segment of it), in program order: every shot morph, every pair
 * of shot keys at most `FAST_KEY_SECONDS` apart that moves the camera, and every cut or shot
 * transition window.
 */
export function shotMoves(data: {
	shots: readonly ShotSpan[];
	transitions: readonly ProgramTransition[];
	fps: number;
}): ShotMove[] {
	const out: ShotMove[] = [];
	for (const s of data.shots) {
		if (s.morphFrames > 0)
			out.push({
				what: `the ${s.shot} shot "${s.id}" morphing in`,
				from: s.startFrame,
				to: s.startFrame + s.morphFrames
			});
		const keys = s.keys ?? [];
		const camera = cameras(keys);
		for (let i = 1; i < keys.length; i++) {
			const a = keys[i - 1];
			const b = keys[i];
			if (b.frame <= a.frame || b.frame - a.frame > FAST_KEY_SECONDS * data.fps) continue;
			if (camera[i - 1] === camera[i]) continue;
			out.push({ what: `the keys of shot "${s.id}"`, from: a.frame, to: b.frame });
		}
	}
	for (const t of data.transitions) {
		if (t.kind === 'clip') continue;
		out.push({
			what: `the ${t.type} transition into "${t.owner}"`,
			from: t.startFrame,
			to: t.startFrame + t.frames
		});
	}
	return out.sort((x, y) => x.from - y.from || x.to - y.to);
}

/**
 * The move a clip starting at `startFrame` starts on: the first move whose window holds the
 * clip's first frame (or that starts up to `LEAD_FRAMES` after it), joined with every move that
 * overlaps or touches it, so the frame it ends on is clear of all of them. Null when the clip
 * starts on none.
 */
export function moveAtStart(moves: readonly ShotMove[], startFrame: number): ShotMove | null {
	const first = moves.find((m) => startFrame >= m.from - LEAD_FRAMES && startFrame < m.to);
	if (!first) return null;
	const joined = { ...first };
	const whats = [first.what];
	for (let grown = true; grown; ) {
		grown = false;
		for (const m of moves)
			if (m.from <= joined.to && m.to > joined.to) {
				joined.to = m.to;
				whats.push(m.what);
				grown = true;
			}
	}
	return { ...joined, what: whats.join(' and ') };
}

export type CaptionsInMove = {
	clip: string;
	/** The clip's first frame. */
	start: number;
	move: ShotMove;
	/** What the captions were drawn over during the move. */
	over: { panel: boolean; face: boolean };
	/** First program frame checked inside the move with the captions over something. */
	frame: number;
};

const DRAWN = 'they are drawn over';

/**
 * A `check` warning for captions that start inside a shot move and are drawn over the moving
 * panel or the face until it lands, with the frame the move ends on. It stays a hint: the agent
 * looks at stills and decides.
 */
export function captionsInMoveMessage(found: CaptionsInMove, fps: number): string {
	const secs = (f: number) => (f / fps).toFixed(2);
	const s = (f: number) => `${secs(f)} s`;
	const what = [
		found.over.panel ? 'the moving panel' : '',
		found.over.face ? "the speaker's face" : ''
	]
		.filter(Boolean)
		.join(' and ');
	const later = (found.move.to - found.start) / fps;
	const where = found.start < found.move.from ? 'just before' : 'inside';
	return `Captions "${found.clip}": they start at ${s(found.start)} (program time), ${where} ${found.move.what} (${secs(found.move.from)}–${s(found.move.to)}), and ${DRAWN} ${what} until it lands; once it has landed they are clear. Start them when the move ends, at ${s(found.move.to)} (${later.toFixed(2)} s later), or keep them out of the moving area. Look at stills from ${secs(found.move.from)} to ${s(found.move.to)} before deciding.`;
}

/** The clip a captions-in-a-move warning names; null for any other message. */
export function captionsInMoveClip(message: string): string | null {
	const m = /^Captions "(.*?)": they start at /.exec(message);
	return m && message.includes(`, and ${DRAWN} `) ? m[1] : null;
}
