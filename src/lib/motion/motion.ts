import type { Action } from 'svelte/action';
import { controllerOf } from './runtime.svelte.js';
import {
	EMPHASES,
	MASK_OVERHANG,
	combine,
	countText,
	emphasisPose,
	itemPose,
	planEvents,
	planMotion,
	type MotionOptions,
	type Pose,
	type Split
} from './primitives.js';

type Styled = Element & ElementCSSInlineStyle;

/** Properties `use:motion` may write; their inline values are restored when it is removed. */
const OWNED = [
	'transform',
	'opacity',
	'filter',
	'clip-path',
	'visibility',
	'display',
	'transform-box',
	'transform-origin',
	'stroke-dasharray',
	'stroke-dashoffset',
	'background-image',
	'background-size',
	'background-position',
	'background-repeat',
	'box-decoration-break',
	'-webkit-box-decoration-break'
];
const GEOMETRY = 'path, line, polyline, polygon, circle, ellipse, rect';
const ACCENT = 'var(--brand-accent, #fbc42d)';

/**
 * Named motion on any element of a motion block, as a pure function of clip time:
 *
 * ```svelte
 * <h1 use:motion={{ enter: 'pop', at: 'cue', exit: 'fade', emphasis: 'pulse' }}>…</h1>
 * <p use:motion={{ enter: 'rise', split: 'words', at: 'list' }}>…</p>
 * <span use:motion={{ count: 12400, at: 'stat' }}>0</span>
 * ```
 *
 * It owns the element's transform, opacity, filter, clip-path and visibility (and the split
 * items'), so do not set those from markup or a timeline on the same element.
 */
export const motion: Action<Element, MotionOptions | undefined> = (node, options) => {
	let undo = setup(node, options ?? {});
	return {
		update(next) {
			undo();
			undo = setup(node, next ?? {});
		},
		destroy() {
			undo();
		}
	};
};

type Base = { transform: string; opacity: number; filter: string };

function setup(node: Element, options: MotionOptions): () => void {
	const c = controllerOf(node);
	const clip = c.clip;
	const restore: (() => void)[] = [];
	const bases = new Map<Element, Base>();
	const remember = (el: Element) => {
		const style = (el as Styled).style;
		const before = OWNED.map((p) => [p, style.getPropertyValue(p)] as const);
		restore.push(() =>
			before.forEach(([p, v]) => (v ? style.setProperty(p, v) : style.removeProperty(p)))
		);
		// Inline values the block set itself are kept under the motion.
		bases.set(el, {
			transform: style.transform,
			opacity: style.opacity === '' ? 1 : Number(style.opacity),
			filter: style.filter
		});
	};

	if (options.count !== undefined && (options.split || options.enter === 'typewriter'))
		throw new Error(`Clip "${clip.id}": count writes the element's text; it cannot be split.`);
	const draw = options.enter === 'draw' || options.exit === 'draw';
	const split: Split | undefined =
		options.enter === 'typewriter' || options.exit === 'typewriter' ? 'chars' : options.split;
	if (draw && split)
		throw new Error(`Clip "${clip.id}": draw animates SVG strokes; it cannot split text.`);

	remember(node);
	let groups: Styled[][];
	if (draw) {
		const shapes = node.matches(GEOMETRY) ? [node] : Array.from(node.querySelectorAll(GEOMETRY));
		if (!shapes.length)
			throw new Error(`Clip "${clip.id}": draw needs an SVG shape (path, line, circle …).`);
		groups = shapes.map((s) => [s as Styled]);
		for (const s of shapes) {
			const had = s.getAttribute('pathLength');
			s.setAttribute('pathLength', '1');
			restore.push(() =>
				had === null ? s.removeAttribute('pathLength') : s.setAttribute('pathLength', had)
			);
		}
	} else if (split) {
		groups = splitText(node, split, restore);
	} else {
		groups = [[node as Styled]];
	}

	let plan: ReturnType<typeof planMotion>;
	try {
		plan = planMotion(clip, options, groups.length);
	} catch (error) {
		// An unknown name or moment leaves the element as the block wrote it.
		for (const r of restore.reverse()) r();
		throw error;
	}
	const items = groups.flat();
	for (const el of items) if (!bases.has(el)) remember(el);
	if (plan.transforms) for (const el of items) prepareTransform(el);
	if (plan.emphasis.some((e) => !EMPHASES[e.move].lasting)) prepareTransform(node as Styled);

	if (plan.count) {
		const text = node.textContent;
		restore.push(() => (node.textContent = text));
	}

	for (const e of planEvents(plan, clip.fps)) {
		const { name, t, ...detail } = e;
		restore.push(clip.event(name, t, detail));
	}

	const ownItem = items.includes(node as Styled);
	const apply = (t: number) => {
		const root = emphasisPose(plan, t);
		groups.forEach((group, i) => {
			const pose = itemPose(plan, i, t);
			for (const el of group) paint(el, el === node ? combine(pose, root) : pose, bases.get(el)!);
		});
		if (!ownItem) paint(node as Styled, root, bases.get(node)!);
		if (plan.count) {
			const value = countText(plan, t);
			if (node.textContent !== value) node.textContent = value;
		}
	};
	// The first start state shows before any frame is seeked (frame 0 of a still, the mount).
	apply(clip.t);
	const frameFn = ({ t }: { t: number }) => apply(t);
	c.frameFns.push(frameFn);

	return () => {
		const i = c.frameFns.indexOf(frameFn);
		if (i >= 0) c.frameFns.splice(i, 1);
		for (const r of restore.reverse()) r();
	};
}

/** Transforms do nothing on inline boxes, and SVG shapes should turn around their own centre. */
function prepareTransform(el: Styled) {
	if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) {
		if (!el.style.transformBox) el.style.transformBox = 'fill-box';
		if (!el.style.transformOrigin) el.style.transformOrigin = 'center';
	} else if (getComputedStyle(el).display === 'inline') {
		el.style.display = 'inline-block';
	}
}

const num = (n: number) => String(Math.round(n * 1000) / 1000);
const MARK_LAYOUT = {
	strike: { height: '0.08em', y: '58%' },
	underline: { height: '0.08em', y: '96%' },
	highlight: { height: '60%', y: '85%' }
};

/** Write a pose over the element's own inline values. Every owned property is written each frame. */
function paint(el: Styled, pose: Pose, base: Base) {
	const s = el.style;
	const own =
		pose.x || pose.y || pose.rotate || pose.scale !== 1
			? `translate(${num(pose.x)}px, ${num(pose.y)}px) rotate(${num(pose.rotate)}deg) scale(${num(pose.scale)})`
			: '';
	s.transform = [base.transform, own].filter(Boolean).join(' ');
	const opacity = base.opacity * Math.max(0, pose.opacity);
	s.opacity = opacity < 1 ? num(opacity) : '';
	s.filter = [
		base.filter,
		pose.blur > 0.01 ? `blur(${num(pose.blur)}px)` : '',
		pose.glow > 0.01 ? `drop-shadow(0 0 ${num(pose.glow)}px ${pose.glowColor ?? ACCENT})` : ''
	]
		.filter(Boolean)
		.join(' ');
	s.visibility = pose.hidden ? 'hidden' : '';
	// The mask reaches past the box so italic overhang and descenders are not cut off.
	s.clipPath = pose.hide.some((h) => h > 0)
		? `inset(${pose.hide.map((h) => `calc(${num(h)} * (100% + 2 * ${MASK_OVERHANG}) - ${MASK_OVERHANG})`).join(' ')})`
		: '';
	if (pose.draw) {
		const [a, b] = pose.draw;
		s.strokeDasharray = `${num(Math.max(0, b - a))} 2`;
		s.strokeDashoffset = num(-a);
		// A zero-length dash still paints round caps.
		if (b - a <= 0) s.opacity = '0';
	}
	if (pose.marks.length) {
		const marks = [...pose.marks].sort((m, n) => order(m.kind) - order(n.kind));
		const color = (k: keyof typeof MARK_LAYOUT) =>
			pose.markColor?.[k] ?? (k === 'strike' ? 'currentColor' : ACCENT);
		s.backgroundImage = marks
			.map((m) => `linear-gradient(${color(m.kind)}, ${color(m.kind)})`)
			.join(', ');
		s.backgroundSize = marks
			.map((m) => `${num(m.f * 100)}% ${MARK_LAYOUT[m.kind].height}`)
			.join(', ');
		s.backgroundPosition = marks
			.map((m) => `${m.from === 'right' ? '100%' : '0%'} ${MARK_LAYOUT[m.kind].y}`)
			.join(', ');
		s.backgroundRepeat = 'no-repeat';
		s.setProperty('box-decoration-break', 'clone');
		s.setProperty('-webkit-box-decoration-break', 'clone');
	}
}

const order = (kind: string) => ['strike', 'underline', 'highlight'].indexOf(kind);

const segmenter =
	typeof Intl !== 'undefined' && 'Segmenter' in Intl
		? new Intl.Segmenter('en', { granularity: 'grapheme' })
		: null;
const graphemes = (text: string) =>
	segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);

/**
 * Wrap the element's words (and characters) in inline-block spans, keeping inline markup such
 * as `<em>`. Returns the animated items in reading order; a line is a group of word spans.
 * The text is read once: later changes to it are not split.
 */
function splitText(root: Element, mode: Split, restore: (() => void)[]): Styled[][] {
	const doc = root.ownerDocument;
	const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	const texts: Text[] = [];
	while (walker.nextNode()) texts.push(walker.currentNode as Text);
	const words: HTMLSpanElement[] = [];
	const chars: HTMLSpanElement[] = [];
	for (const text of texts) {
		if (!text.data.trim()) continue;
		const parts = text.data.split(/(\s+)/).filter(Boolean);
		const nodes = parts.map((part) => {
			if (/^\s+$/.test(part)) return doc.createTextNode(part);
			const word = doc.createElement('span');
			word.className = 'vf-word';
			word.style.display = 'inline-block';
			if (mode === 'chars') {
				for (const g of graphemes(part)) {
					const ch = doc.createElement('span');
					ch.className = 'vf-char';
					ch.style.display = 'inline-block';
					ch.textContent = g;
					word.appendChild(ch);
					chars.push(ch);
				}
			} else word.textContent = part;
			words.push(word);
			return word;
		});
		const parent = text.parentNode!;
		for (const n of nodes) parent.insertBefore(n, text);
		parent.removeChild(text);
		restore.push(() => {
			parent.insertBefore(text, nodes[0]);
			for (const n of nodes) n.parentNode?.removeChild(n);
		});
	}
	if (mode === 'chars') return chars.map((ch) => [ch]);
	if (mode === 'words') return words.map((w) => [w]);
	// Lines: words that share a top edge after layout move together.
	const lines: HTMLSpanElement[][] = [];
	let top = NaN;
	for (const w of words) {
		const y = Math.round(w.getBoundingClientRect().top);
		if (!lines.length || Math.abs(y - top) > 2) lines.push([]);
		lines.at(-1)!.push(w);
		top = y;
	}
	// A line of plain text gets one block box, so a mask wipes the whole line, not each word.
	// Lines inside inline markup stay groups of words with the same pose.
	if (getComputedStyle(root).display === 'inline') return lines;
	return lines.map((line) => {
		const parent = line[0].parentNode!;
		if (parent !== root || line.some((w) => w.parentNode !== parent)) return line;
		const box = doc.createElement('span');
		box.className = 'vf-line';
		box.style.display = 'block';
		parent.insertBefore(box, line[0]);
		const moved: Node[] = [];
		for (let n: Node | null = line[0]; n; ) {
			const next: Node | null = n === line.at(-1) ? null : n.nextSibling;
			box.appendChild(n);
			moved.push(n);
			n = next;
		}
		restore.push(() => {
			for (const n of moved) parent.insertBefore(n, box);
			box.remove();
		});
		return [box];
	});
}
