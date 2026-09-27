import { flushSync, mount, unmount } from 'svelte';
import { Clip, MOTION_CONTEXT_KEY } from './runtime.svelte.js';
/**
 * Browser side of motion rendering. Everything that decides pixels lives here so
 * preview, local export and server export run the same code.
 */
export function createMotionStage(options) {
    const probe = document.createElement('canvas').getContext('2d');
    const mode = typeof probe?.drawElementImage === 'function' ? 'html-in-canvas' : 'dom';
    const paintTimeout = options.paintTimeout ?? 2000;
    const style = document.createElement('style');
    style.textContent =
        (options.fonts ?? [])
            .map((f) => `@font-face{font-family:${JSON.stringify(f.family)};src:url(${JSON.stringify(f.url)});` +
            `font-weight:${f.weight ?? 'normal'};font-style:${f.style ?? 'normal'};font-display:block}`)
            .join('\n') +
            '\nhtml,body{margin:0;background:transparent}\n#vf-stage{position:relative;overflow:hidden}\n' +
            (options.css ?? '');
    document.head.appendChild(style);
    let canvas = null;
    let ctx = null;
    let stage = null;
    let active = null;
    let seeks = 0;
    async function load(data) {
        unload();
        const [width, height] = data.size;
        stage = document.createElement('div');
        stage.id = 'vf-stage';
        stage.style.width = `${width}px`;
        stage.style.height = `${height}px`;
        stage.style.background = data.background ?? 'transparent';
        if (mode === 'html-in-canvas') {
            canvas = document.createElement('canvas');
            canvas.setAttribute('layoutsubtree', '');
            canvas.width = width;
            canvas.height = height;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            canvas.appendChild(stage);
            document.body.appendChild(canvas);
            ctx = canvas.getContext('2d');
        }
        else {
            document.body.appendChild(stage);
        }
        // Fonts first: blocks and engines measure text when they mount.
        const query = (f) => `${f.style ?? 'normal'} ${String(f.weight ?? 400).split(/\s+/)[0]} 32px ${JSON.stringify(f.family)}`;
        await Promise.all((options.fonts ?? []).map((f) => document.fonts.load(query(f))));
        const missing = (options.fonts ?? []).filter((f) => !document.fonts.check(query(f)));
        if (missing.length)
            throw new Error(`Fonts failed to load: ${missing.map((f) => f.family).join(', ')}`);
        const Block = options.blocks[data.block];
        if (!Block)
            throw new Error(`Block "${data.block}" is not in the bundle.`);
        const root = document.createElement('div');
        root.className = 'vf-clip';
        root.style.cssText = 'position:absolute;inset:0';
        stage.appendChild(root);
        const controller = {
            clip: new Clip(data),
            root,
            timelines: [],
            frameFns: [],
            ready: []
        };
        const instance = mount(Block, {
            target: root,
            props: { ...data.props },
            context: new Map([[MOTION_CONTEXT_KEY, controller]])
        });
        flushSync();
        active = { controller, instance, data };
        await Promise.all(controller.ready);
        await document.fonts.ready;
        return { mode, frames: data.frames, fps: data.fps };
    }
    function applyTime(frame) {
        if (!active)
            throw new Error('No clip loaded.');
        const { controller, data } = active;
        const t = frame / data.fps;
        controller.clip.t = t;
        controller.clip.frame = frame;
        flushSync();
        for (const tl of controller.timelines)
            tl.seek(t, true);
        for (const fn of controller.frameFns)
            fn({ t, frame, clip: controller.clip });
        return t;
    }
    function nextPaint() {
        return new Promise((resolve, reject) => {
            if (!canvas)
                return requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
            const c = canvas;
            const timer = setTimeout(() => {
                c.removeEventListener('paint', done);
                reject(new Error(`Paint did not happen within ${paintTimeout} ms.`));
            }, paintTimeout);
            function done() {
                clearTimeout(timer);
                resolve();
            }
            c.addEventListener('paint', done, { once: true });
            c.requestPaint?.();
        });
    }
    /** Seek, repaint, draw. With `capture`, returns a PNG data URL (html-in-canvas mode only). */
    async function frame(n, capture = false) {
        const t0 = performance.now();
        const t = applyTime(n);
        // Force a fresh raster of the whole subtree: Chromium otherwise reuses cached raster for
        // transform-animated layers and the pixels depend on seek history.
        const how = options.invalidate ?? 'filters';
        if (how === 'filters')
            stage.style.filter = ++seeks % 2 ? 'saturate(1)' : 'contrast(1)';
        else if (how === 'reattach' && canvas)
            canvas.appendChild(stage);
        await nextPaint();
        const paintMs = performance.now() - t0;
        let image;
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawElementImage(stage, 0, 0);
            if (capture)
                image = canvas.toDataURL('image/png');
        }
        return { frame: n, t, image, paintMs, mode };
    }
    function unload() {
        if (active) {
            unmount(active.instance);
            active = null;
        }
        canvas?.remove();
        stage?.remove();
        canvas = null;
        ctx = null;
        stage = null;
    }
    /**
     * Run the clip's logic at the given frames without painting: collects exceptions (unknown
     * cues, bad eases, maps going back in time) and wall-clock CSS animations.
     */
    function check(frames) {
        const errors = [];
        const warnings = [];
        for (const n of frames) {
            try {
                applyTime(n);
            }
            catch (error) {
                const message = error.message;
                if (!errors.some((e) => e.message === message))
                    errors.push({ frame: n, message });
            }
        }
        const running = document.getAnimations();
        if (running.length) {
            const where = running
                .slice(0, 3)
                .map((a) => {
                const el = a.effect?.target;
                return el
                    ? `<${el.tagName.toLowerCase()}${el.className ? ` class="${el.className}"` : ''}>`
                    : 'element';
            })
                .join(', ');
            warnings.push({
                frame: frames[frames.length - 1] ?? 0,
                message: `${running.length} CSS animation(s)/transition(s) run on wall-clock time (${where}); they will not follow seeks. Drive them from clip time instead.`
            });
        }
        return { errors, warnings };
    }
    return { mode, load, frame, check, unload };
}
