import { easeOf } from '../ease.js';
import { inWindow, transitionModule, transitionProgress } from './index.js';
/** Whether the stage draws `t` (a built-in module exists); others cut on their cut frame. */
export const isDrawn = (t) => transitionModule(t.type) !== null;
export function createTransitionPlayer(layer, transitions, stage) {
    const entries = [];
    transitions.forEach((t, i) => {
        const module = transitionModule(t.type);
        if (!module)
            return;
        const overlay = document.createElement('div');
        overlay.id = `vf-transition-${i}`;
        overlay.dataset.transition = t.id;
        overlay.style.cssText = 'position:absolute;inset:0;overflow:hidden;display:none';
        layer.appendChild(overlay);
        const direction = module.directional ? t.direction : null;
        module.setup(overlay, { size: stage.size, cls: stage.cls, direction, params: t.params });
        entries.push({
            t,
            module,
            overlay,
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
                    size: stage.size
                };
                e.overlay.style.display = '';
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
