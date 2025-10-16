export class EventManager extends EventTarget {
    isReady = false;
    constructor() {
        super();
    }
    emit(event, props) {
        if (!this.isReady) {
            return;
        }
        // Note: 'subtitleschange' is NOT in this list - subtitle refreshes are handled
        // by ComponentsManager with debouncing to avoid blocking the main thread
        const rerenderableEvents = ['layerschange', 'componentschange', 'componentchange'];
        if (rerenderableEvents.includes(event)) {
            this.emit('rerender');
        }
        this.dispatchEvent(new CustomEvent(event, { detail: props }));
    }
    // "on" automatically returns the right type under event.details object
    on(event, callback, options) {
        this.addEventListener(event, ((e) => callback(e)), options);
    }
}
