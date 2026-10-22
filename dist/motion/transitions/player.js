import { easeOf } from '../ease.js';
import { inWindow, transitionModule, transitionProgress } from './index.js';
/** Whether the stage draws `t` (a built-in module exists); others cut on their cut frame. */
export const isDrawn = (t) => transitionModule(t.type) !== null;
/** Players made on this page: ids of one never collide with another stage's. */
let players = 0;
/**
 * `layer` holds the transitions' overlays, above everything; `stage.under`, when the stage has
 * one, a layer above both sides and below the front clips.
 */
export function createTransitionPlayer(layer, transitions, stage) {
    const entries = [];
    const scope = ++players;
    const box = (parent) => {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;inset:0;overflow:hidden;display:none';
        parent.appendChild(el);
        return el;
    };
    transitions.forEach((t, i) => {
        const module = transitionModule(t.type);
        if (!module)
            return;
        const overlay = box(layer);
        // Filters and other ids a transition makes start with its overlay's id.
        overlay.id = `vf-transition-${scope}-${i}`;
        overlay.dataset.transition = t.id;
        const under = stage.under ? box(stage.under) : null;
        const direction = module.directional ? t.direction : null;
        module.setup(overlay, {
            size: stage.size,
            cls: stage.cls,
            direction,
            params: t.params,
            ...(under ? { under } : {})
        });
        entries.push({
            t,
            module,
            overlay,
            under,
            direction,
            ease: easeOf(t.ease ?? module.ease),
            touched: null
        });
    });
    return {
        at: (f) => entries.filter((e) => inWindow(e.t, f)).map((e) => e.t),
        seek(f, sides) {
            for (const e of entries) {
                if (!e.touched)
                    continue;
                e.module.release(e.touched);
                e.overlay.style.display = 'none';
                if (e.under)
                    e.under.style.display = 'none';
                e.touched = null;
            }
            for (const e of entries) {
                if (!inWindow(e.t, f))
                    continue;
                const { out, in: incoming, focus } = sides(e.t);
                const touched = {
                    out,
                    in: incoming,
                    overlay: e.overlay,
                    ...(e.under ? { under: e.under } : {}),
                    size: stage.size
                };
                e.overlay.style.display = '';
                if (e.under)
                    e.under.style.display = '';
                const p = transitionProgress(e.t, f);
                e.module.apply({
                    ...touched,
                    p,
                    eased: e.ease(p),
                    direction: e.direction,
                    params: e.t.params,
                    kind: e.t.kind,
                    focus
                });
                e.touched = touched;
            }
        }
    };
}
