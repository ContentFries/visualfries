import { flushSync, mount, unmount } from 'svelte';
import { Clip, MOTION_CONTEXT_KEY, registerClipRoot } from './runtime.svelte.js';
import { brandTokens } from './brand.js';
import { formatTokens } from './format.js';
import { seekTimeline } from './seek.js';
import { programFootageAt, transitionSidesAt } from './footage-map.js';
import { sourceFrameUrl } from './footage.js';
import { programFraming } from './framing.js';
import { clipFrameAt } from './segments.js';
import { shotModule } from './shots/index.js';
import { facePoint } from './shots/layout.js';
import { createTransitionPlayer } from './transitions/player.js';
import { keyTracks, placementTransform } from './keys.js';
import { applyRegion, drawRegion, drawRim, loadPicture } from './subject-canvas.js';
/**
 * The fill around a framed shot: the brand's surface; without a brand, the project background
 * (the brand's neutral surface when there is none either).
 */
const surface = (seg) => seg.brand.neutral ? (seg.background ?? seg.brand.colors.surface) : 'var(--brand-surface)';
/** Brand tokens, safe insets and `data-format`, as the clip stage sets them on a clip's root. */
function applyLook(el, seg) {
    el.dataset.format = seg.format.class;
    for (const [name, value] of Object.entries({
        ...brandTokens(seg.brand),
        ...formatTokens(seg.format)
    }))
        el.style.setProperty(name, value);
}
const LAYER = 'position:absolute;inset:0';
/**
 * A layer whose children stack inside it: a block's `z-index` (or a blend mode) cannot lift it
 * out of its clip, past the subject or over the transition overlay.
 */
const ISOLATED = `${LAYER};isolation:isolate`;
function layer(parent, className, style = LAYER) {
    const el = document.createElement('div');
    el.className = className;
    el.style.cssText = style;
    parent.appendChild(el);
    return el;
}
/**
 * An `<img>` in its own clipped box (the camera window), with `backdrop` a second one under it
 * for a blurred copy; empty images stay hidden.
 */
function picture(parent, className, backdrop = false) {
    // Placed by `frameBox` alone: an `inset` here would fight its left and top.
    const box = layer(parent, className, 'position:absolute;overflow:hidden;isolation:isolate');
    const image = () => {
        const img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        img.style.cssText = 'position:absolute;display:none;max-width:none';
        box.appendChild(img);
        return img;
    };
    const back = backdrop ? image() : undefined;
    if (back)
        back.className = 'vf-backdrop';
    return { box, img: image(), back };
}
function side(stage, name) {
    const el = layer(stage, 'vf-side', ISOLATED);
    el.dataset.side = name;
    const fill = layer(el, 'vf-fill');
    const group = layer(el, 'vf-picture');
    const plate = picture(group, 'vf-plate', true);
    // Painted over their whole box (see `TransitionSides`).
    for (const solid of [el, fill, plate.box])
        solid.dataset.solid = '';
    const behind = layer(group, 'vf-behind', ISOLATED);
    const subject = picture(group, 'vf-subject');
    return { el, fill, picture: group, plate, behind, subject, name };
}
const SVG = 'http://www.w3.org/2000/svg';
function svgEl(parent, tag, attrs) {
    const el = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs))
        el.setAttribute(k, v);
    parent.appendChild(el);
    return el;
}
/** Motion blur clips' content gets, of the footage's (the approved look). */
const CLIP_STREAK = 0.6;
/** Below this a blur is not drawn at all. */
const BLUR_MIN = 0.4;
/**
 * In a dimmed room the subject's semi-transparent edge (which carries some of the room) is
 * dimmed with it, by `1 - alpha^EDGE`: the matte's fringe never outlines the speaker.
 */
const EDGE = 3;
/** Alpha kept as fully opaque after a blur: anything the blur reached at all. */
const OPAQUE = `0${' 1'.repeat(15)}`;
const seen = (a) => !!a && (a.x >= BLUR_MIN || a.y >= BLUR_MIN);
const deviation = (a) => `${a.x.toFixed(2)} ${a.y.toFixed(2)}`;
function region(filter, inset) {
    const r = inset
        ? { x: '0', y: '0', width: '100%', height: '100%' }
        : { x: '-30%', y: '-30%', width: '160%', height: '160%' };
    for (const [k, v] of Object.entries(r))
        filter.setAttribute(k, v);
}
/**
 * Motion blur that keeps a solid surface solid: the blur smears past the element's shape into
 * transparency, and over it the element's own shape is drawn again, opaque where it was, in the
 * blurred colours. Two surfaces meeting at a seam (the footage and a card) never let what is
 * under them show through, and text keeps a readable core.
 */
function streakSteps(filter, input) {
    const blur = svgEl(filter, 'feGaussianBlur', { in: input, stdDeviation: '0 0', result: 'blur' });
    const solid = svgEl(filter, 'feComponentTransfer', { in: 'blur', result: 'solid' });
    svgEl(solid, 'feFuncA', { type: 'discrete', tableValues: OPAQUE });
    svgEl(filter, 'feComposite', {
        in: 'solid',
        in2: 'SourceAlpha',
        operator: 'in',
        result: 'core'
    });
    const merge = svgEl(filter, 'feMerge', {});
    svgEl(merge, 'feMergeNode', { in: 'blur' });
    svgEl(merge, 'feMergeNode', { in: 'core' });
    return blur;
}
/**
 * SVG filters of shot looks, each built on first use in a hidden `<svg>` on the stage and
 * updated per frame:
 * - `plate`: the footage plate desaturated and darkened (a dimmed room), blurred (the room's
 *   blur and the motion blur together) inside its own box with its edges kept opaque, so
 *   neither the frame edge nor a seam ever darkens;
 * - `subject`: the cut-out's edge dimmed with the room, and motion blur (see `streakSteps`);
 * - `streak`: motion blur alone, for the clips behind the subject and in slots.
 */
let scenes = 0;
function shotFilters(stage) {
    // Ids unique per scene: two stages on one page never use each other's filters.
    const scope = ++scenes;
    let svg = null;
    const built = new Map();
    function get(name, build) {
        const id = `${name}-${scope}`;
        let parts = built.get(id);
        if (!parts) {
            svg ??= svgEl(stage, 'svg', {
                width: '0',
                height: '0',
                style: 'position:absolute;left:0;top:0'
            });
            const filter = svgEl(svg, 'filter', { id, 'color-interpolation-filters': 'sRGB' });
            parts = build(filter);
            built.set(id, parts);
        }
        return { id, parts };
    }
    return {
        dispose() {
            svg?.remove();
        },
        /**
         * `filter` value for the plate (or its backdrop, `side` `a-back`) of a room and a motion
         * blur; '' when it is untouched.
         */
        plate(side, room, streak) {
            const dim = room && room.dim > 0 ? room.dim : 0;
            const r = room?.blur ?? 0;
            const blur = { x: Math.hypot(r, streak?.x ?? 0), y: Math.hypot(r, streak?.y ?? 0) };
            const blurred = seen(blur);
            if (!dim && !blurred)
                return '';
            const { id, parts } = get(`vf-plate-${side}-${blurred ? 'b' : 'n'}`, (filter) => {
                region(filter, true);
                const saturate = svgEl(filter, 'feColorMatrix', { type: 'saturate', values: '1' });
                const light = svgEl(filter, 'feComponentTransfer', {});
                const [r, g, b] = ['feFuncR', 'feFuncG', 'feFuncB'].map((tag) => svgEl(light, tag, { type: 'linear', slope: '1', intercept: '0' }));
                const out = { saturate, r, g, b };
                if (blurred) {
                    out.blur = svgEl(filter, 'feGaussianBlur', { stdDeviation: '0 0' });
                    // Opaque wherever the blur reached at all: a corner keeps only a quarter of
                    // its alpha, and anything below that would round it off.
                    const opaque = svgEl(filter, 'feComponentTransfer', {});
                    svgEl(opaque, 'feFuncA', { type: 'discrete', tableValues: OPAQUE });
                }
                return out;
            });
            parts.saturate.setAttribute('values', (1 - 0.9 * dim).toFixed(3));
            for (const k of ['r', 'g', 'b'])
                parts[k].setAttribute('slope', (1 - dim).toFixed(3));
            if (blurred)
                parts.blur.setAttribute('stdDeviation', deviation(blur));
            return `url(#${id})`;
        },
        /** `filter` value for the subject cut-out in a room dimmed by `dim` and a motion blur. */
        subject(side, dim, streak) {
            const blurred = seen(streak);
            if (dim <= 0 && !blurred)
                return '';
            const edged = dim > 0;
            const key = `${edged ? 'e' : ''}${blurred ? 'b' : ''}`;
            const { id, parts } = get(`vf-subject-${side}-${key}`, (filter) => {
                const out = {};
                region(filter, !blurred);
                if (edged) {
                    // alpha^EDGE in every colour channel, opaque…
                    svgEl(filter, 'feColorMatrix', {
                        in: 'SourceAlpha',
                        type: 'matrix',
                        values: '0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1',
                        result: 'alpha'
                    });
                    const curve = svgEl(filter, 'feComponentTransfer', { in: 'alpha', result: 'weight' });
                    for (const tag of ['feFuncR', 'feFuncG', 'feFuncB'])
                        svgEl(curve, tag, {
                            type: 'gamma',
                            amplitude: '1',
                            exponent: String(EDGE),
                            offset: '0'
                        });
                    // …so colour × (1 − dim + dim × weight), alpha unchanged.
                    out.edge = svgEl(filter, 'feComposite', {
                        in: 'SourceGraphic',
                        in2: 'weight',
                        operator: 'arithmetic',
                        k1: '0',
                        k2: '1',
                        k3: '0',
                        k4: '0',
                        result: 'lit'
                    });
                }
                if (blurred)
                    out.blur = streakSteps(filter, edged ? 'lit' : 'SourceGraphic');
                return out;
            });
            if (edged) {
                parts.edge.setAttribute('k1', dim.toFixed(3));
                parts.edge.setAttribute('k2', (1 - dim).toFixed(3));
            }
            if (blurred)
                parts.blur.setAttribute('stdDeviation', deviation(streak));
            return `url(#${id})`;
        },
        /** `filter` value for a motion blur of `amount` (px per axis); '' below the visible. */
        streak(name, amount) {
            if (!seen(amount))
                return '';
            const { id, parts } = get(`vf-streak-${name}`, (filter) => {
                region(filter, false);
                return { blur: streakSteps(filter, 'SourceGraphic') };
            });
            parts.blur.setAttribute('stdDeviation', deviation(amount));
            return `url(#${id})`;
        }
    };
}
/** The ring and the shadow of a camera window, as a `box-shadow`; '' without either. */
function windowShadow(layout, size) {
    const parts = [];
    if (layout.ring)
        parts.push(`0 0 0 ${layout.ring}px var(--brand-primary)`);
    if (layout.lift) {
        const k = Math.min(...size) / 1080;
        const r = (v) => Math.round(v * 100) / 100;
        parts.push(`0 ${r(24 * k * layout.lift)}px ${r(64 * k)}px rgba(0, 0, 0, ${r(0.55 * layout.lift)})`);
    }
    return parts.join(', ');
}
/** Places `el` at `rect` (absolute, stage pixels); writes only what changed. */
function place(el, rect) {
    const box = `${rect.x} ${rect.y} ${rect.width} ${rect.height}`;
    if (el.dataset.box === box)
        return;
    el.dataset.box = box;
    Object.assign(el.style, {
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`
    });
}
/** The camera window: clips the picture to `layout.clip`, footage placed at `layout.camera`. */
function frameBox(pic, layout) {
    const { clip, camera, radius, turn } = layout;
    place(pic.box, clip);
    pic.box.style.borderRadius = radius ? `${radius}px` : '';
    place(pic.img, {
        x: camera.x - clip.x,
        y: camera.y - clip.y,
        width: camera.width,
        height: camera.height
    });
    pic.img.style.transform = turn ? `rotate(${turn.rotation}deg)` : '';
    pic.img.style.transformOrigin = turn
        ? `${turn.pivot.x - camera.x}px ${turn.pivot.y - camera.y}px`
        : '';
}
/** A hole layer of `s`, made on first use and inserted before `before` (or last). */
function sheet(s, kind, before) {
    const made = s[kind];
    if (made)
        return made;
    const box = document.createElement('div');
    box.className = `vf-${kind}`;
    box.style.cssText = 'position:absolute;overflow:hidden;isolation:isolate';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;max-width:none';
    box.appendChild(canvas);
    s.picture.insertBefore(box, before);
    return (s[kind] = { box, canvas });
}
/**
 * Places a sheet like `frameBox` places a picture. The canvas keeps its own size (`w` × `h`, the
 * footage's) and is scaled onto the camera with a transform: HTML-in-Canvas draws a canvas at
 * its own size whatever its CSS width and height say, but follows its transform.
 */
function frameSheet(sheet, layout, w, h) {
    const { clip, camera, radius, turn } = layout;
    place(sheet.box, clip);
    sheet.box.style.borderRadius = radius ? `${radius}px` : '';
    place(sheet.canvas, { x: camera.x - clip.x, y: camera.y - clip.y, width: w, height: h });
    const scale = `scale(${camera.width / w},${camera.height / h})`;
    const pivot = turn && { x: turn.pivot.x - camera.x, y: turn.pivot.y - camera.y };
    sheet.canvas.style.transformOrigin = '0 0';
    sheet.canvas.style.transform = pivot
        ? `translate(${pivot.x}px,${pivot.y}px) rotate(${turn.rotation}deg) translate(${-pivot.x}px,${-pivot.y}px) ${scale}`
        : scale;
}
/** A sheet's 2D context, cleared, at `w` × `h`. */
function blank(sheet, w, h) {
    if (sheet.canvas.width !== w || sheet.canvas.height !== h) {
        sheet.canvas.width = w;
        sheet.canvas.height = h;
    }
    const ctx = sheet.canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);
    return ctx;
}
/** Where a side's camera shows the footage, as a clip sees it (`clip.camera`). */
function cameraView(layout, source, slot) {
    const ox = slot?.x ?? 0;
    const oy = slot?.y ?? 0;
    const { camera, turn } = layout;
    return {
        x: camera.x - ox,
        y: camera.y - oy,
        width: camera.width,
        height: camera.height,
        rotation: turn?.rotation ?? 0,
        pivot: turn
            ? { x: turn.pivot.x - ox, y: turn.pivot.y - oy }
            : { x: camera.x - ox + camera.width / 2, y: camera.y - oy + camera.height / 2 },
        source: { width: source.width, height: source.height }
    };
}
const sameCamera = (a, b) => a === b || (!!a && !!b && JSON.stringify(a) === JSON.stringify(b));
/** Shows `url` in `img`; resolves once the image is decoded. */
function show(img, url) {
    img.style.display = '';
    if (img.src === url)
        return null;
    img.src = url;
    return img.decode();
}
const hide = (img) => (img.style.display = 'none');
function clipError(id, error) {
    const message = error?.message ?? String(error);
    return new Error(message.startsWith(`Clip "${id}"`) ? message : `Clip "${id}": ${message}`);
}
const endOf = (s) => s.startFrame + s.frames;
const px = (v) => Math.round(v * 100) / 100;
/**
 * The eyes below the top of the head the matte gives, in fractions of the footage height
 * (measured 0.21 and 0.24 on a medium and a close shot; the shots' face point, 0.1 down, is the
 * forehead).
 */
const EYES_DROP = 0.2;
const FULL = { shot: 'full', params: {} };
/** A region holding less of the subject than this share counts as empty. */
const EMPTY_SHARE = 0.002;
/**
 * Builds the layer tree in `stage` and mounts every clip of the segment. `animatable` holds what
 * each block exports as `animatable`; a keyed prop missing there is an error of the clip.
 */
export function createProgramScene(stage, seg, blocks, animatable = {}) {
    // On the stage too: fills and transition overlays use the brand's colours.
    applyLook(stage, seg);
    // HTML-in-Canvas leaves a 2D canvas out of the captured frame unless it sits at the stage's
    // top left corner or contains its own paint: every canvas the stage, a hole or a block draws
    // contains it (a `<canvas layoutsubtree>` is left alone: it samples its own children).
    const canvases = document.createElement('style');
    canvases.textContent = '#vf-stage canvas:not([layoutsubtree]){contain:paint}';
    stage.appendChild(canvases);
    const a = side(stage, 'a');
    // Side b shows only inside a cut or shot transition window.
    const b = side(stage, 'b');
    b.el.style.display = 'none';
    // An insert draws its clip alone: the footage picture stays out, the subject only shows in
    // the holdout pass.
    if (seg.insert)
        for (const s of [a, b]) {
            s.fill.style.visibility = 'hidden';
            s.plate.box.style.visibility = 'hidden';
            s.subject.box.style.opacity = '0';
        }
    const under = layer(stage, 'vf-under', `${ISOLATED};pointer-events:none`);
    const front = layer(stage, 'vf-clips', ISOLATED);
    const overlay = layer(stage, 'vf-overlay', `${ISOLATED};pointer-events:none`);
    const player = createTransitionPlayer(overlay, seg.transitions, {
        size: seg.size,
        cls: seg.cls,
        under
    });
    const filters = shotFilters(stage);
    // Slotted clips get a box for motion blur only where a shot blurs its moves.
    const streaks = seg.shots.some((s) => shotModule(s.shot)?.blur);
    const mounted = [];
    const ready = [];
    try {
        for (const data of seg.clips) {
            const Block = blocks[data.block];
            if (!Block)
                throw new Error(`Block "${data.block}" is not in the bundle.`);
            // A slotted root is placed on every seek, where the shot puts its slot.
            const root = layer(data.layer === 'behind' ? a.behind : front, 'vf-clip', data.slot
                ? `position:absolute;left:0;top:0;width:${seg.size[0]}px;height:${seg.size[1]}px;isolation:isolate`
                : ISOLATED);
            root.dataset.clip = data.id;
            applyLook(root, seg);
            let tracks;
            try {
                tracks = keyTracks(data.keys, {
                    size: seg.size,
                    animatable: animatable[data.block] ?? {},
                    block: data.block
                });
            }
            catch (error) {
                throw clipError(data.id, error);
            }
            const streak = data.slot && streaks ? layer(root, 'vf-streak') : null;
            const keyed = tracks.placement ? layer(streak ?? root, 'vf-keys') : null;
            // Roots stay visible until the first seek: blocks may measure text when they mount.
            // Keyed props start at their value on the clip's first frame.
            const controller = {
                clip: new Clip({
                    ...data,
                    props: { ...data.props, ...tracks.props?.(data.startFrame) },
                    footage: seg.footage,
                    footageMap: seg.footageMap ?? undefined
                }),
                root,
                timelines: [],
                frameFns: [],
                ready: []
            };
            registerClipRoot(controller);
            let instance;
            try {
                // The clip's reactive props: what changes `clip.props` later reaches the block.
                instance = mount(Block, {
                    target: keyed ?? streak ?? root,
                    props: controller.clip.props,
                    context: new Map([[MOTION_CONTEXT_KEY, controller]])
                });
            }
            catch (error) {
                throw clipError(data.id, error);
            }
            mounted.push({ data, controller, instance, shown: null, tracks, keyed, streak });
            ready.push(...controller.ready);
        }
        flushSync();
    }
    catch (error) {
        for (const m of mounted)
            unmount(m.instance);
        throw error;
    }
    /** The plan of the frame last seeked. */
    let last = null;
    /** Per clip, the run of checked frames where its region was empty (see `measure`). */
    const empty = new Map();
    /** The extracted frames of the source a view shows; null without them. */
    const framesOf = (view) => (view ? (seg.footage[view.source] ?? null) : null);
    const framing = programFraming(seg);
    /** The layout of a side showing `view`: the shot track at `f`, or `shot` alone. */
    const layoutFor = (f, view, shot) => framing.layoutFor(f, view, shot);
    /** Which side a clip rides in transition `t`: out when it ends on the cut, in when it starts on it. */
    function rides(data, t) {
        if (!t)
            return null;
        if (t.cutFrame === data.startFrame)
            return 'b';
        if (t.cutFrame === endOf(data))
            return 'a';
        return null;
    }
    function plan(f) {
        let staged = player.at(f).find((t) => t.kind !== 'clip') ?? null;
        const both = staged
            ? seg.footageMap
                ? transitionSidesAt(seg.footageMap, staged, f)
                : { out: null, in: null }
            : null;
        if (!both)
            staged = null;
        let sides;
        if (!staged || !both) {
            const view = seg.footageMap ? programFootageAt(seg.footageMap, f) : null;
            sides = { a: { view, layout: layoutFor(f, view) }, b: null };
        }
        else if (staged.kind === 'cut') {
            sides = {
                a: { view: both.out, layout: layoutFor(f, both.out) },
                b: { view: both.in, layout: layoutFor(f, both.in) }
            };
        }
        else {
            // Same footage under the previous and the new layout: each side holds its own shot's
            // layout on the other side of the cut.
            const shot = (id) => seg.shots.find((s) => s.id === id) ?? FULL;
            const before = f < staged.cutFrame;
            sides = {
                a: {
                    view: both.out,
                    layout: before ? layoutFor(f, both.out) : layoutFor(f, both.out, shot(staged.outgoing))
                },
                b: {
                    view: both.in,
                    layout: before ? layoutFor(f, both.in, shot(staged.owner)) : layoutFor(f, both.in)
                }
            };
        }
        const current = staged && f >= staged.cutFrame && sides.b ? sides.b : sides.a;
        const clips = mounted.map((m) => {
            let local = clipFrameAt(m.data, f);
            const side = sides.b ? rides(m.data, staged) : null;
            let slot = null;
            if (m.data.slot) {
                // A slot the shot does not free hides its clip.
                const layout = side === 'b' ? sides.b.layout : side === 'a' ? sides.a.layout : current.layout;
                slot = layout.slots[m.data.slot] ?? null;
                if (!slot)
                    local = null;
            }
            return { local, slot, side };
        });
        // Motion blur comes from the shot track alone, so only outside transition windows.
        return {
            f,
            staged,
            ...sides,
            clips,
            streak: sides.b ? null : (sides.a.layout.motionBlur ?? null)
        };
    }
    /** Behind clips in project order inside the side they belong to (b: arriving on its cut). */
    function arrangeBehind(now) {
        for (const s of [a, b]) {
            const want = mounted
                .filter((m, i) => m.data.layer === 'behind' && (now.clips[i].side === 'b') === (s === b))
                .map((m) => m.controller.root);
            const have = [...s.behind.children];
            if (want.length !== have.length || want.some((el, i) => el !== have[i]))
                for (const el of want)
                    s.behind.appendChild(el);
        }
    }
    /**
     * The eyes on screen in a side (where its camera puts them), inside the camera window: what a
     * transition centres on. Without a matte, the frame centre slightly high (see `facePoint`).
     */
    function faceOf(side) {
        if (!framesOf(side.view) || !side.view)
            return null;
        const subject = framing.subjectOf(side.view);
        const face = subject
            ? { x: subject.headX, y: Math.min(1, subject.headY + EYES_DROP) }
            : facePoint(null);
        const { camera, clip, turn } = side.layout;
        let x = camera.x + face.x * camera.width;
        let y = camera.y + face.y * camera.height;
        // A shot key's rotation turns the footage about its pivot: the eyes turn with it.
        if (turn) {
            const a = (turn.rotation * Math.PI) / 180;
            const dx = x - turn.pivot.x;
            const dy = y - turn.pivot.y;
            x = turn.pivot.x + dx * Math.cos(a) - dy * Math.sin(a);
            y = turn.pivot.y + dx * Math.sin(a) + dy * Math.cos(a);
        }
        const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
        return {
            x: clamp(x, clip.x, clip.x + clip.width),
            y: clamp(y, clip.y, clip.y + clip.height)
        };
    }
    /** The eyes on each side of transition `t` at the planned frame (under a clip: on both). */
    function focusOf(now, t) {
        if (t.kind !== 'clip')
            return { out: faceOf(now.a), in: now.b ? faceOf(now.b) : null };
        const under = faceOf(now.b && now.f >= t.cutFrame ? now.b : now.a);
        return { out: under, in: under };
    }
    /** The elements leaving and arriving in transition `t` at the planned frame. */
    function sidesOf(now, t) {
        const onScreen = (m, i) => now.clips[i].local !== null;
        if (t.kind !== 'clip') {
            const riders = (s) => mounted
                .filter((m, i) => m.data.layer === 'front' && onScreen(m, i) && now.clips[i].side === s)
                .map((m) => m.controller.root);
            return { out: [a.el, ...riders('a')], in: [b.el, ...riders('b')] };
        }
        const i = mounted.findIndex((m) => m.data.id === t.owner);
        const own = mounted[i];
        if (!own)
            return { out: [], in: [] };
        if (own.data.layer === 'behind') {
            const home = now.clips[i].side === 'b' ? b : a;
            return { out: [home.fill, home.plate.box], in: [own.controller.root] };
        }
        const below = mounted
            .filter((m, k) => m.data.layer === 'front' && m.data.z < own.data.z && onScreen(m, k))
            .map((m) => m.controller.root);
        return {
            out: [a.el, ...(now.b ? [b.el] : []), ...below],
            in: [own.controller.root]
        };
    }
    /** The side a clip is on at a planned frame: the one it rides, else the one on screen. */
    function sideOf(now, i) {
        const rider = now.clips[i].side;
        if (rider)
            return rider;
        return now.b && now.staged && now.f >= now.staged.cutFrame ? 'b' : 'a';
    }
    /** Holes the clips on side `s` cut, placed at the frame the side shows. */
    function holesOn(now, s, view) {
        if (!view || seg.insert)
            return [];
        const out = [];
        mounted.forEach((m, i) => {
            if (m.shown === null || !m.controller.holes?.length)
                return;
            if ((now.clips[i].side ?? 'a') !== s)
                return;
            for (const source of m.controller.holes) {
                let hole;
                try {
                    hole = source({ source: view.source, frame: view.frame });
                }
                catch (error) {
                    throw clipError(m.data.id, error);
                }
                if (hole)
                    out.push({ id: m.data.id, hole });
            }
        });
        return out;
    }
    /**
     * The holes of side `s`: the clean plate inside them (under the behind clips), and over the
     * behind clips the subject with them cut out (when the subject is drawn) and their rims.
     */
    async function drawHoles(s, view, holes, subjectOn) {
        const frames = framesOf(view.view);
        const { source, frame } = view.view;
        if (!frames.clean)
            throw clipError(holes[0].id, new Error(`<Subject hole> needs a clean plate of footage "${source}" to show where the subject was. Add "clean": true to it.`));
        const hole = sheet(s, 'hole', s.behind);
        const cut = sheet(s, 'cut', null);
        const rims = holes.some((h) => h.hole.rim);
        const masks = [...new Set(holes.flatMap((h) => (h.hole.mask ? [h.hole.mask] : [])))];
        const [clean, subject, ...loaded] = await Promise.all([
            loadPicture(sourceFrameUrl(frames, frame, 'clean')),
            subjectOn || rims ? loadPicture(sourceFrameUrl(frames, frame, 'subject')) : null,
            ...masks.map(loadPicture)
        ]);
        const maskOf = (url) => (url ? loaded[masks.indexOf(url)] : null);
        const { width: w, height: h } = frames;
        const under = blank(hole, w, h);
        for (const { hole: x } of holes)
            drawRegion(under, clean, x.shape, { mask: maskOf(x.mask) });
        const over = blank(cut, w, h);
        if (subjectOn && subject) {
            over.drawImage(subject, 0, 0, w, h);
            for (const { hole: x } of holes)
                applyRegion(over, x.shape, 'out', maskOf(x.mask));
        }
        if (subject)
            for (const { hole: x } of holes)
                if (x.rim)
                    drawRim(over, subject, x.shape, x.rim, x.near, maskOf(x.mask));
    }
    function drawSide(s, view, behind, pending, holes = []) {
        const { layout } = view;
        s.fill.style.background = layout.fill ? surface(seg) : '';
        const opacity = layout.opacity;
        s.picture.style.opacity = opacity === undefined ? '' : String(opacity);
        frameBox(s.plate, layout);
        frameBox(s.subject, layout);
        s.plate.box.style.boxShadow = windowShadow(layout, seg.size);
        const room = !!layout.room && (layout.room.dim > 0 || layout.room.blur >= BLUR_MIN);
        s.plate.img.style.filter = filters.plate(s.name, layout.room, layout.motionBlur);
        s.subject.img.style.filter = filters.subject(s.name, layout.room?.dim ?? 0, layout.motionBlur);
        s.behind.style.filter = filters.streak(`behind-${s.name}`, layout.motionBlur);
        const frames = framesOf(view.view);
        const back = s.plate.back;
        if (!view.view || !frames) {
            hide(s.plate.img);
            hide(back);
            hide(s.subject.img);
            for (const x of [s.hole, s.cut])
                if (x)
                    x.box.style.display = 'none';
            return;
        }
        const url = sourceFrameUrl(frames, view.view.frame, 'plate');
        const plate = seg.insert ? null : show(s.plate.img, url);
        if (plate)
            pending.push(plate);
        if (layout.backdrop && !seg.insert) {
            // The blurred copy under footage that leaves the camera window open (see `backdrop`).
            const { camera, blur, dim } = layout.backdrop;
            const { clip } = layout;
            place(back, { ...camera, x: px(camera.x - clip.x), y: px(camera.y - clip.y) });
            // Under a dimmed room the copy is part of the room: dimmed and blurred with it too.
            const roomDim = layout.room?.dim ?? 0;
            const look = {
                dim: px(1 - (1 - dim) * (1 - roomDim)),
                blur: px(Math.hypot(blur, layout.room?.blur ?? 0))
            };
            back.style.filter = filters.plate(`${s.name}-back`, look, layout.motionBlur);
            const copy = show(back, url);
            if (copy)
                pending.push(copy);
        }
        else
            hide(back);
        // The subject covers behind clips only while one is on screen, or a dimmed room; in an
        // insert it is only what a holdout cuts out.
        const subjectOn = (seg.insert ? seg.insert.holdout && behind : behind || room) && frames.subject;
        if (holes.length) {
            // The holes' layers draw the subject (cut) instead of its picture.
            hide(s.subject.img);
            const hole = sheet(s, 'hole', s.behind);
            const cut = sheet(s, 'cut', null);
            for (const x of [hole, cut]) {
                x.box.style.display = '';
                frameSheet(x, layout, frames.width, frames.height);
            }
            hole.canvas.style.filter = s.plate.img.style.filter;
            cut.canvas.style.filter = subjectOn ? s.subject.img.style.filter : '';
            pending.push(drawHoles(s, view, holes, subjectOn));
            return;
        }
        for (const x of [s.hole, s.cut])
            if (x)
                x.box.style.display = 'none';
        if (subjectOn) {
            const subject = show(s.subject.img, sourceFrameUrl(frames, view.view.frame, 'subject'));
            if (subject)
                pending.push(subject);
        }
        else
            hide(s.subject.img);
    }
    function inSegment(f) {
        if (f < seg.startFrame || f >= seg.startFrame + seg.frames)
            throw new Error(`Frame ${f} is outside segment "${seg.id}" (frames ${seg.startFrame}–${seg.startFrame + seg.frames - 1}).`);
    }
    return {
        fps: seg.fps,
        ready,
        seek(f) {
            inSegment(f);
            const now = plan(f);
            last = now;
            b.el.style.display = now.b ? '' : 'none';
            mounted.forEach((m, i) => {
                const { local, slot } = now.clips[i];
                if (slot)
                    place(m.controller.root, slot);
                m.controller.root.style.display = local === null ? 'none' : '';
                m.shown = local;
                if (local === null)
                    return;
                m.controller.clip.t = local / seg.fps;
                m.controller.clip.frame = local;
                // Where the footage is on screen for this clip (its side; a slot's own pixels).
                const side = sideOf(now, i) === 'b' ? now.b : now.a;
                const frames = framesOf(side.view);
                const camera = frames ? cameraView(side.layout, frames, slot) : null;
                if (!sameCamera(m.controller.clip.camera, camera))
                    m.controller.clip.camera = camera;
                // Keys follow the frame the clip shows (held at its edges inside a window).
                const at = m.data.startFrame + local;
                if (m.tracks.props)
                    Object.assign(m.controller.clip.props, m.tracks.props(at));
                if (m.keyed) {
                    const p = m.tracks.placement(at);
                    m.keyed.style.transform = placementTransform(p);
                    m.keyed.style.opacity = p.opacity === 1 ? '' : String(p.opacity);
                }
            });
            const streak = filters.streak('clips', now.streak && {
                x: now.streak.x * CLIP_STREAK,
                y: now.streak.y * CLIP_STREAK
            });
            for (const m of mounted)
                if (m.streak)
                    m.streak.style.filter = streak;
            arrangeBehind(now);
            flushSync();
            // A block may set the point its placement keys turn about (`clip.pivot`), from what
            // this frame's seek just settled.
            for (const m of mounted) {
                if (m.shown === null || !m.keyed)
                    continue;
                const p = m.controller.clip.pivot;
                const at = typeof p === 'function' ? p() : p;
                m.keyed.style.transformOrigin = at ? `${px(at.x)}px ${px(at.y)}px` : '';
            }
            for (const m of mounted) {
                if (m.shown === null)
                    continue;
                try {
                    for (const tl of m.controller.timelines)
                        seekTimeline(tl, m.shown / seg.fps);
                }
                catch (error) {
                    throw clipError(m.data.id, error);
                }
            }
            player.seek(f, (t) => ({ ...sidesOf(now, t), focus: focusOf(now, t) }));
        },
        async draw(f) {
            const pending = [];
            const now = last?.f === f ? last : plan(f);
            const behindOn = (s) => mounted.some((m, i) => m.data.layer === 'behind' &&
                now.clips[i].local !== null &&
                (now.clips[i].side === 'b') === (s === 'b'));
            drawSide(a, now.a, behindOn('a'), pending, holesOn(now, 'a', now.a.view));
            if (now.b)
                drawSide(b, now.b, behindOn('b'), pending, holesOn(now, 'b', now.b.view));
            for (const m of mounted) {
                if (m.shown === null)
                    continue;
                const { clip } = m.controller;
                for (const fn of m.controller.frameFns) {
                    let result;
                    try {
                        result = fn({ t: clip.t, frame: clip.frame, clip });
                    }
                    catch (error) {
                        throw clipError(m.data.id, error);
                    }
                    if (result && typeof result.then === 'function')
                        pending.push(result.catch((e) => Promise.reject(clipError(m.data.id, e))));
                }
            }
            await Promise.all(pending);
        },
        warnings(f) {
            const out = [];
            for (const t of seg.transitions) {
                // Right after the window the pushed-in clip is in place.
                if (t.kind !== 'clip' || t.type !== 'push' || f !== t.startFrame + t.frames)
                    continue;
                const m = mounted.find((x) => x.data.id === t.owner);
                if (!m || m.shown === null || m.data.layer === 'behind' || m.data.slot)
                    continue;
                if (!coversStage(m.controller.root, stage))
                    out.push(`The push into clip "${t.owner}" slides everything below it off the frame, but the clip does not cover the frame: the empty stage shows around it. Use wipe, or give the clip a full-frame background.`);
            }
            return out;
        },
        async measure(f) {
            const out = [];
            for (const m of mounted) {
                if (m.shown === null || !m.controller.probes?.length) {
                    empty.delete(m.data.id);
                    continue;
                }
                let worst = null;
                for (const probe of m.controller.probes) {
                    const got = await probe().catch((e) => Promise.reject(clipError(m.data.id, e)));
                    if (got && (!worst || got.share < worst.share))
                        worst = got;
                }
                if (!worst || worst.share >= EMPTY_SHARE) {
                    empty.delete(m.data.id);
                    continue;
                }
                const run = empty.get(m.data.id) ?? { from: f, what: worst.what, told: false };
                empty.set(m.data.id, run);
                if (!run.told && f - run.from >= seg.fps / 2) {
                    run.told = true;
                    out.push(`Clip "${m.data.id}": ${run.what} holds none of the speaker from ${(run.from / seg.fps).toFixed(2)} s (program time) for half a second or more, so the subject layer draws nothing there. Move the line or path onto the speaker (a line's number counts head heights down from the top of the head), or check the matte.`);
                }
            }
            return out;
        },
        holdout(on) {
            const shown = !!seg.insert?.holdout && a.subject.img.style.display !== 'none';
            if (on && !shown)
                return false;
            a.subject.box.style.opacity = on ? '' : '0';
            a.behind.style.opacity = on ? '0' : '';
            front.style.opacity = on ? '0' : '';
            under.style.opacity = on ? '0' : '';
            return on;
        },
        destroy() {
            for (const m of mounted)
                unmount(m.instance);
            mounted.length = 0;
            filters.dispose();
            canvases.remove();
        }
    };
}
/**
 * Whether something inside `root` paints over the whole stage: an element covering the stage's
 * box with an opaque background colour, a background image, or an image, canvas or video.
 */
function coversStage(root, stage) {
    const frame = stage.getBoundingClientRect();
    const covers = (r) => r.left <= frame.left + 1 &&
        r.top <= frame.top + 1 &&
        r.right >= frame.right - 1 &&
        r.bottom >= frame.bottom - 1;
    for (const el of root.querySelectorAll('*')) {
        if (!covers(el.getBoundingClientRect()))
            continue;
        if (/^(IMG|CANVAS|VIDEO)$/.test(el.tagName))
            return true;
        const style = getComputedStyle(el);
        if (style.backgroundImage !== 'none')
            return true;
        const alpha = /rgba?\(([^)]+)\)/.exec(style.backgroundColor)?.[1].split(',')[3];
        if (style.backgroundColor !== 'transparent' && (alpha === undefined || Number(alpha) > 0.9))
            return true;
    }
    return false;
}
