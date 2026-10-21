import { controllerOf } from './runtime.svelte.js';
import { EMPHASES, MASK_OVERHANG, combine, countText, emphasisPose, itemPose, planEvents, planMotion } from './primitives.js';
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
 * It owns the `OWNED` properties of the element (and of the split items): transform, opacity,
 * filter, clip-path, visibility, display, transform-box/-origin, stroke-dash*, background-* and
 * box-decoration-break. Do not set those from markup or a timeline on the same element.
 */
export const motion = (node, options) => {
    let undo = setup(node, options ?? {});
    return {
        update(next) {
            undo();
            // If the new options throw, a later destroy must not undo the old setup twice.
            undo = () => { };
            undo = setup(node, next ?? {});
        },
        destroy() {
            undo();
        }
    };
};
function setup(node, options) {
    const c = controllerOf(node);
    const clip = c.clip;
    const restore = [];
    const bases = new Map();
    const remember = (el) => {
        const style = el.style;
        const inline = Object.fromEntries(OWNED.map((p) => [p, style.getPropertyValue(p)]));
        restore.push(() => setInline(style, inline, OWNED));
        // Inline values the block set itself are kept under the motion.
        bases.set(el, {
            transform: style.transform,
            opacity: style.opacity === '' ? 1 : Number(style.opacity),
            filter: style.filter,
            inline
        });
    };
    if (options.count !== undefined && (options.split || options.enter === 'typewriter'))
        throw new Error(`Clip "${clip.id}": count writes the element's text; it cannot be split.`);
    const draw = options.enter === 'draw' || options.exit === 'draw';
    const split = options.enter === 'typewriter' || options.exit === 'typewriter' ? 'chars' : options.split;
    if (draw && split)
        throw new Error(`Clip "${clip.id}": draw animates SVG strokes; it cannot split text.`);
    remember(node);
    let groups;
    if (draw) {
        const shapes = node.matches(GEOMETRY) ? [node] : Array.from(node.querySelectorAll(GEOMETRY));
        if (!shapes.length)
            throw new Error(`Clip "${clip.id}": draw needs an SVG shape (path, line, circle …).`);
        groups = shapes.map((s) => [s]);
        for (const s of shapes) {
            const had = s.getAttribute('pathLength');
            s.setAttribute('pathLength', '1');
            restore.push(() => had === null ? s.removeAttribute('pathLength') : s.setAttribute('pathLength', had));
        }
    }
    else if (split) {
        groups = splitText(node, split, restore);
    }
    else {
        groups = [[node]];
    }
    let plan;
    try {
        plan = planMotion(clip, options, groups.length);
    }
    catch (error) {
        // An unknown name or moment leaves the element as the block wrote it.
        for (const r of restore.reverse())
            r();
        throw error;
    }
    const items = groups.flat();
    for (const el of items)
        if (!bases.has(el))
            remember(el);
    if (plan.transforms)
        for (const el of items)
            prepareTransform(el);
    if (plan.emphasis.some((e) => !EMPHASES[e.move].lasting))
        prepareTransform(node);
    if (plan.count) {
        const text = node.textContent;
        restore.push(() => (node.textContent = text));
    }
    for (const e of planEvents(plan, clip.fps)) {
        const { name, t, ...detail } = e;
        restore.push(clip.event(name, t, detail));
    }
    const ownItem = items.includes(node);
    const apply = (t) => {
        const root = emphasisPose(plan, t);
        groups.forEach((group, i) => {
            const pose = itemPose(plan, i, t);
            for (const el of group)
                paint(el, el === node ? combine(pose, root) : pose, bases.get(el));
        });
        if (!ownItem)
            paint(node, root, bases.get(node));
        if (plan.count) {
            const value = countText(plan, t);
            if (node.textContent !== value)
                node.textContent = value;
        }
    };
    // The first start state shows before any frame is seeked (frame 0 of a still, the mount).
    apply(clip.t);
    const frameFn = ({ t }) => apply(t);
    c.frameFns.push(frameFn);
    return () => {
        const i = c.frameFns.indexOf(frameFn);
        if (i >= 0)
            c.frameFns.splice(i, 1);
        for (const r of restore.reverse())
            r();
    };
}
/** Transforms do nothing on inline boxes, and SVG shapes should turn around their own centre. */
function prepareTransform(el) {
    if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) {
        if (!el.style.transformBox)
            el.style.transformBox = 'fill-box';
        if (!el.style.transformOrigin)
            el.style.transformOrigin = 'center';
    }
    else if (getComputedStyle(el).display === 'inline') {
        el.style.display = 'inline-block';
    }
}
/**
 * Set inline values, removing properties without one. A value the engine rejects leaves the
 * property unset rather than keeping an older frame's value.
 */
function setInline(style, values, props) {
    for (const p of props) {
        const v = values[p];
        if (v && style.getPropertyValue(p) === v)
            continue;
        style.removeProperty(p);
        if (v)
            style.setProperty(p, v);
    }
}
const DASH = ['stroke-dasharray', 'stroke-dashoffset'];
const MARK_PROPS = [
    'background-image',
    'background-size',
    'background-position',
    'background-repeat',
    'box-decoration-break',
    '-webkit-box-decoration-break'
];
const num = (n) => String(Math.round(n * 1000) / 1000);
const MARK_LAYOUT = {
    strike: { height: '0.08em', y: '58%' },
    underline: { height: '0.08em', y: '96%' },
    highlight: { height: '60%', y: '85%' }
};
/**
 * Write a pose over the element's own inline values. Every property a pose can change is written
 * on every frame, also when the pose leaves it alone (then back to the block's value), so a seek
 * back in time never keeps what a later frame drew.
 */
function paint(el, pose, base) {
    const s = el.style;
    const own = pose.x || pose.y || pose.rotate || pose.scale !== 1
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
    s.visibility = pose.hidden ? 'hidden' : base.inline.visibility;
    // The mask reaches past the box so italic overhang and descenders are not cut off.
    s.clipPath = pose.hide.some((h) => h > 0)
        ? `inset(${pose.hide.map((h) => `calc(${num(h)} * (100% + 2 * ${MASK_OVERHANG}) - ${MASK_OVERHANG})`).join(' ')})`
        : base.inline['clip-path'];
    if (pose.draw) {
        const [a, b] = pose.draw;
        s.strokeDasharray = `${num(Math.max(0, b - a))} 2`;
        s.strokeDashoffset = num(-a);
        // A zero-length dash still paints round caps.
        if (b - a <= 0)
            s.opacity = '0';
    }
    else
        setInline(s, base.inline, DASH);
    if (pose.marks.length) {
        const marks = [...pose.marks].sort((m, n) => order(m.kind) - order(n.kind));
        const color = (k) => pose.markColor?.[k] ?? (k === 'strike' ? 'currentColor' : ACCENT);
        const layers = (f) => marks.map(f).join(', ');
        setInline(s, {
            'background-image': layers((m) => `linear-gradient(${color(m.kind)}, ${color(m.kind)})`),
            'background-size': layers((m) => `${num(m.f * 100)}% ${MARK_LAYOUT[m.kind].height}`),
            'background-position': layers((m) => `${m.from === 'right' ? '100%' : '0%'} ${MARK_LAYOUT[m.kind].y}`),
            'background-repeat': 'no-repeat',
            'box-decoration-break': 'clone',
            '-webkit-box-decoration-break': 'clone'
        }, MARK_PROPS);
    }
    else
        setInline(s, base.inline, MARK_PROPS);
}
const order = (kind) => ['strike', 'underline', 'highlight'].indexOf(kind);
const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter('en', { granularity: 'grapheme' })
    : null;
const graphemes = (text) => segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
/** Whitespace a line may break at; no-break spaces (`&nbsp;`) stay inside their word. */
const SPACE = '[^\\S\\u00a0\\u2007\\u202f\\ufeff]';
const SPACES = new RegExp(`(${SPACE}+)`);
const ONLY_SPACE = new RegExp(`^${SPACE}+$`);
const STARTS_SPACE = new RegExp(`^${SPACE}`);
const ENDS_SPACE = new RegExp(`${SPACE}$`);
/**
 * Wrap the element's words (and characters) in inline-block spans, keeping inline markup such
 * as `<em>`. Returns the animated items in reading order; a line is a group of word spans.
 * The text is read once: later changes to it are not split. Screen readers get the text as the
 * element's `aria-label`; the pieces are `aria-hidden`.
 */
function splitText(root, mode, restore) {
    const doc = root.ownerDocument;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode())
        texts.push(walker.currentNode);
    const label = (root.textContent ?? '').replace(/\s+/g, ' ').trim();
    // Whether a text continues the word the previous text ended in (`foo<em>bar</em>`).
    const continues = [];
    let open = null;
    for (const text of texts) {
        if (!text.data) {
            continues.push(false);
            continue;
        }
        continues.push(!!open && !STARTS_SPACE.test(text.data) && inlineBetween(open, text, root));
        open = ENDS_SPACE.test(text.data) ? null : text;
    }
    const words = [];
    const chars = [];
    const joined = new Set();
    texts.forEach((text, t) => {
        if (!text.data || ONLY_SPACE.test(text.data))
            return;
        const parts = text.data.split(SPACES).filter(Boolean);
        const nodes = parts.map((part, i) => {
            if (ONLY_SPACE.test(part))
                return doc.createTextNode(part);
            const word = doc.createElement('span');
            word.className = 'vf-word';
            word.style.display = 'inline-block';
            word.setAttribute('aria-hidden', 'true');
            if (mode === 'chars') {
                for (const g of graphemes(part)) {
                    const ch = doc.createElement('span');
                    ch.className = 'vf-char';
                    ch.style.display = 'inline-block';
                    ch.textContent = g;
                    word.appendChild(ch);
                    chars.push(ch);
                }
            }
            else
                word.textContent = part;
            if (i === 0 && continues[t])
                joined.add(word);
            words.push(word);
            return word;
        });
        const parent = text.parentNode;
        for (const n of nodes)
            parent.insertBefore(n, text);
        parent.removeChild(text);
        restore.push(() => {
            parent.insertBefore(text, nodes[0]);
            for (const n of nodes)
                n.parentNode?.removeChild(n);
        });
    });
    keepTogether(words, joined, restore);
    if (words.length && label && !root.hasAttribute('aria-label')) {
        root.setAttribute('aria-label', label);
        restore.push(() => root.removeAttribute('aria-label'));
    }
    if (mode === 'chars')
        return chars.map((ch) => [ch]);
    if (mode === 'words')
        return words.map((w) => [w]);
    // Lines: words that share a top edge after layout move together.
    const lines = [];
    let top = NaN;
    for (const w of words) {
        const y = Math.round(w.getBoundingClientRect().top);
        if (!lines.length || Math.abs(y - top) > 2)
            lines.push([]);
        lines.at(-1).push(w);
        top = y;
    }
    // A line of plain text gets one block box, so a mask wipes the whole line, not each word.
    // Lines inside inline markup stay groups of words with the same pose.
    if (getComputedStyle(root).display === 'inline')
        return lines;
    return lines.map((line) => {
        const parent = line[0].parentNode;
        if (parent !== root || line.some((w) => w.parentNode !== parent))
            return line;
        const box = doc.createElement('span');
        box.className = 'vf-line';
        box.style.display = 'block';
        parent.insertBefore(box, line[0]);
        const moved = [];
        for (let n = line[0]; n;) {
            const next = n === line.at(-1) ? null : n.nextSibling;
            box.appendChild(n);
            moved.push(n);
            n = next;
        }
        restore.push(() => {
            for (const n of moved)
                parent.insertBefore(n, box);
            box.remove();
        });
        return [box];
    });
}
// '' is what DOMs without a user-agent stylesheet (jsdom) report for inline elements.
const isInline = (el) => ['inline', 'contents', ''].includes(getComputedStyle(el).display);
/** Only edges of inline elements lie between text `a` and the later text `b` (no `<br>`, image or block). */
function inlineBetween(a, b, root) {
    for (let el = a.parentElement; el && !el.contains(b); el = el.parentElement)
        if (!isInline(el))
            return false;
    const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    walker.currentNode = a;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!(b.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_PRECEDING))
            break;
        if (!n.contains(b) || !isInline(n))
            return false;
    }
    return true;
}
/**
 * Inline-block pieces of one word (`foo<em>bar</em>`) could break onto two lines; a
 * `white-space: nowrap` wrapper keeps them together. Markup that also holds a space
 * (`fo<em>o b</em>ar`) is left alone, since the wrapper would glue that space too.
 */
function keepTogether(words, joined, restore) {
    const runs = [];
    for (const w of words) {
        if (joined.has(w) && runs.length)
            runs.at(-1).push(w);
        else
            runs.push([w]);
    }
    for (const run of runs) {
        if (run.length < 2)
            continue;
        const last = run.at(-1);
        let parent = run[0].parentNode;
        while (!parent.contains(last))
            parent = parent.parentNode;
        const top = (n) => {
            while (n.parentNode !== parent)
                n = n.parentNode;
            return n;
        };
        const from = top(run[0]);
        const to = top(last);
        const span = [];
        for (let n = from; n; n = n === to ? null : n.nextSibling)
            span.push(n);
        const foreign = (n) => n.nodeType === Node.TEXT_NODE
            ? n.data !== ''
            : n.classList?.contains('vf-word')
                ? !run.includes(n)
                : Array.from(n.childNodes).some(foreign);
        if (span.some(foreign))
            continue;
        const box = run[0].ownerDocument.createElement('span');
        box.className = 'vf-nowrap';
        box.style.whiteSpace = 'nowrap';
        parent.insertBefore(box, from);
        for (const n of span)
            box.appendChild(n);
        restore.push(() => {
            for (const n of span)
                parent.insertBefore(n, box);
            box.remove();
        });
    }
}
