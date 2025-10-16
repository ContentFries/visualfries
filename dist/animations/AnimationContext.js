import { SplitTextCache } from './SplitTextCache.js';
export class AnimationContext {
    rootElement;
    preset;
    splitTextCache;
    data;
    animationTargetDuration;
    constructor(rootElement, preset, splitTextCache, data = {}) {
        this.rootElement = rootElement;
        this.preset = preset;
        this.splitTextCache = splitTextCache;
        this.data = data;
        let textShadow = '';
        if (this.rootElement instanceof HTMLElement) {
            textShadow = this.rootElement.style.textShadow ?? '';
        }
        this.data.textShadow = textShadow;
        this.animationTargetDuration = 0;
        this.preset.preset.data = {
            ...this.preset.preset.data,
            ...this.data
        };
    }
    get endAnchor() {
        return this.animationTargetDuration - this.getDuration();
    }
    setAnimationTargetDuration(duration) {
        this.animationTargetDuration = duration;
    }
    getData(key) {
        return this.data[key];
    }
    getElement(targetQuery) {
        if (!(this.rootElement instanceof HTMLElement)) {
            console.warn(`Root element is not an HTMLElement. Cannot target ${targetQuery}`);
            return this.rootElement;
        }
        const splitTargets = ['words', 'lines', 'chars'];
        if (splitTargets.includes(targetQuery)) {
            // Get the splitText instance from the global singleton cache
            return this.splitTextCache.getSplitText(this.rootElement, targetQuery);
        }
        if (targetQuery.startsWith('#') || targetQuery.startsWith('.')) {
            const element = this.rootElement.querySelector(targetQuery);
            if (!element) {
                console.warn(`Element not found for query: ${targetQuery}`);
                return null;
            }
            return element;
        }
        if (targetQuery === 'child') {
            if (this.rootElement.children.length === 0) {
                console.warn('No children found for "child" query');
                return null;
            }
            return this.rootElement.children[0];
        }
        if (targetQuery === 'children') {
            return this.rootElement.children;
        }
        return this.rootElement;
    }
    getDuration() {
        return this.preset.duration;
    }
    getAnimationTargetDuration() {
        return this.animationTargetDuration;
    }
    getAllData() {
        return this.data;
    }
}
