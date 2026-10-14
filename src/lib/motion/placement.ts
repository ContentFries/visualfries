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

// ---------------------------------------------------------------- tiny XML reader (FCPXML only)

type XmlNode = { name: string; attrs: Record<string, string>; children: XmlNode[] };

function parseXml(xml: string): XmlNode {
	const root: XmlNode = { name: '#root', attrs: {}, children: [] };
	const stack = [root];
	const tag = /<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>/g;
	const attr = /([\w.:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
	for (let m = tag.exec(xml); m; m = tag.exec(xml)) {
		if (!m[2]) continue; // comment, declaration, doctype
		if (m[1]) {
			if (stack.length > 1) stack.pop();
			continue;
		}
		const attrs: Record<string, string> = {};
		for (let a = attr.exec(m[3]); a; a = attr.exec(m[3])) attrs[a[1]] = (a[2] ?? a[3]).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
		attr.lastIndex = 0;
		const node: XmlNode = { name: m[2], attrs, children: [] };
		stack[stack.length - 1].children.push(node);
		if (!m[4]) stack.push(node);
	}
	return root;
}

function find(node: XmlNode, name: string): XmlNode | null {
	for (const c of node.children) {
		if (c.name === name) return c;
		const deeper = find(c, name);
		if (deeper) return deeper;
	}
	return null;
}

/** FCPXML rational time ("1001/30000s", "12s", "0/1s") in seconds, exact as a fraction. */
function time(v: string | undefined): [number, number] {
	if (!v) return [0, 1];
	const s = v.trim().replace(/s$/, '');
	const [n, d] = s.includes('/') ? s.split('/') : [s, '1'];
	if (n.includes('.')) {
		const places = n.split('.')[1].length;
		return [Math.round(Number(n) * 10 ** places), Number(d) * 10 ** places];
	}
	return [Number(n), Number(d)];
}
const sec = (t: [number, number]) => t[0] / t[1];

const PICTURE = new Set(['clip', 'asset-clip', 'ref-clip', 'sync-clip', 'mc-clip', 'video', 'title']);

/** True when a connected element carries picture (not an audio-only connected clip). */
function hasPicture(node: XmlNode): boolean {
	if (node.name === 'video' || node.name === 'title') return true;
	if (node.name === 'audio') return false;
	if (node.name === 'asset-clip' || node.name === 'ref-clip') return node.attrs.srcEnable !== 'audio';
	return node.children.some(hasPicture);
}

export function parseFcpxmlCuts(xml: string): { cuts: number[]; duration: number } {
	const root = parseXml(xml);
	const spine = find(root, 'spine');
	if (!spine) throw new Error('FCPXML: no <spine> found (export the timeline, not a library).');
	const points = new Set<number>();
	let end = 0;
	for (const el of spine.children) {
		const off = sec(time(el.attrs.offset));
		const dur = sec(time(el.attrs.duration));
		const start = sec(time(el.attrs.start));
		points.add(off).add(off + dur);
		end = Math.max(end, off + dur);
		for (const ch of el.children) {
			const lane = Number(ch.attrs.lane ?? 0);
			if (lane > 0 && PICTURE.has(ch.name) && hasPicture(ch)) {
				const a = off + sec(time(ch.attrs.offset)) - start;
				points.add(a).add(a + sec(time(ch.attrs.duration)));
			}
		}
	}
	const cuts = [...points]
		.filter((c) => c > 1e-9 && c < end - 1e-9)
		.map((c) => Math.round(c * 1e6) / 1e6)
		.sort((a, b) => a - b);
	return { cuts: [...new Set(cuts)], duration: end };
}

// ---------------------------------------------------------------- placement

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

export function placeClips(
	clips: PlaceInput[],
	opts: { fps: number; handle?: number; cuts?: number[]; joinGap?: number; snapInto?: number }
): Placed[] {
	const fps = opts.fps;
	const fr = (x: number) => Math.round(x * fps) / fps;
	const handle = opts.handle ?? 10 / fps;
	const joinGap = opts.joinGap ?? 1;
	const into = opts.snapInto ?? 5 / fps;
	const cuts = [...(opts.cuts ?? [])].sort((a, b) => a - b);
	const P: Placed[] = [...clips]
		.sort((a, b) => a.programStart - b.programStart)
		.map((c) => ({
			...c,
			in: c.programStart + (c.head ?? (c.programStart > 0 ? handle : 0)),
			out: c.programEnd - (c.tail ?? handle),
			track: 'V4'
		}));
	const full = P.filter((p) => !p.alpha);
	for (let i = 1; i < full.length; i++) {
		const a = full[i - 1];
		const b = full[i];
		// join only when the handles overlap; the cut goes in the middle of the gap
		if (b.in - a.out < joinGap && a.programEnd >= b.programStart) {
			const cut = fr(Math.max(b.programStart, Math.min(a.programEnd, (a.out + b.in) / 2)));
			a.out = cut;
			b.in = cut;
			a.joinedOut = true;
			b.joinedIn = true;
		}
	}
	const nearest = (list: number[], x: number) => list.reduce((best, c) => (Math.abs(c - x) < Math.abs(best - x) ? c : best));
	for (const p of P) {
		if (p.snap === false) continue;
		if (!p.joinedIn) {
			const c = cuts.filter((x) => x >= p.programStart - 1e-6 && x <= p.in + into);
			if (c.length) {
				const x = nearest(c, p.in);
				p.snapIn = Math.round((x - p.in) * 1000) / 1000;
				p.in = x;
			}
		}
		if (!p.joinedOut) {
			const c = cuts.filter((x) => x >= p.out - into && x <= p.programEnd + 1e-6);
			if (c.length) {
				const x = nearest(c, p.out);
				p.snapOut = Math.round((x - p.out) * 1000) / 1000;
				p.out = x;
			}
		}
	}
	let v2 = -Infinity;
	let v3 = -Infinity;
	for (const p of P) {
		p.in = fr(p.in);
		p.out = fr(p.out);
		if (!(p.in < p.out))
			throw new Error(`Clip "${p.id}": nothing left to show after placement (${p.in}–${p.out} s).`);
		if (p.alpha) p.track = 'V4';
		else if (v2 <= p.programStart + 1e-6) {
			p.track = 'V2';
			v2 = p.programEnd;
		} else {
			p.track = 'V3';
			v3 = p.programEnd;
		}
	}
	void v3;
	return P;
}
