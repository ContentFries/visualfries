import { ComponentContext } from './ComponentContext.svelte.js';
export class Component {
    #properties = $state({});
    #context;
    #hooks = [];
    #autoRefresh = false;
    #eventUnsubscribers = [];
    constructor(cradle) {
        this.#properties = cradle.componentState;
        this.#context = cradle.componentContext;
        this.#context.setComponentProps(this.#properties);
        // Set up auto-refresh callback if ComponentState supports it
        if ('setRefreshCallback' in this.#properties &&
            typeof this.#properties.setRefreshCallback === 'function') {
            this.#properties.setRefreshCallback(() => this.maybeRefresh());
        }
    }
    get id() {
        return this.#properties.id;
    }
    get type() {
        return this.#properties.type;
    }
    get props() {
        return this.#properties;
    }
    get displayObject() {
        return this.#context.getResource('pixiRenderObject');
    }
    get context() {
        return this.#context;
    }
    get checksum() {
        return this.#properties.checksum;
    }
    get autoRefresh() {
        return this.#autoRefresh;
    }
    setAutoRefresh(enabled) {
        this.#autoRefresh = enabled;
        return this;
    }
    async maybeRefresh() {
        if (this.#autoRefresh) {
            await this.refresh();
        }
    }
    addHook(hook, priority) {
        const maxPriority = this.#hooks.length > 0 ? Math.max(...this.#hooks.map((h) => h.priority ?? 0)) : 0;
        hook.priority = priority ? priority : maxPriority + 1;
        this.#hooks.push(hook);
    }
    async #handle(type) {
        const hooks = this.#hooks.filter((hook) => hook.types.includes(type));
        await this.#context.runHooks(hooks, type);
    }
    async setup() {
        this.#context.setComponentProps(this.#properties);
        await this.#handle('setup');
    }
    async update() {
        await this.#handle('update');
    }
    async refresh(type = 'refresh') {
        this.#context.setComponentProps(this.#properties);
        await this.#handle(type);
        await this.update(); // also auto update to fix timing bug
    }
    async destroy() {
        // Clean up all event listeners automatically
        // Create a copy of the array to avoid issues with modification during iteration
        const unsubscribers = [...this.#eventUnsubscribers];
        this.#eventUnsubscribers = [];
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        await this.#handle('destroy');
        if (this.displayObject) {
            this.displayObject.destroy();
        }
    }
    // Fluent method chaining - modify existing methods to return Component instance
    async updateAppearance(appearance) {
        await this.#properties.updateAppearance(appearance);
        return this;
    }
    setStart(start) {
        this.#properties.setStart(start);
        return this;
    }
    setEnd(end) {
        this.#properties.setEnd(end);
        return this;
    }
    async updateText(text) {
        await this.#properties.updateText(text);
        return this;
    }
    // Simple fluent wrapper methods
    async setText(text) {
        return this.updateText(text);
    }
    async setVisible(visible) {
        await this.#properties.setVisible(visible);
        return this;
    }
    async setOrder(order) {
        await this.#properties.setOrder(order);
        return this;
    }
    // Component-scoped event filtering methods
    onChange(callback) {
        const wrappedCallback = (e) => {
            const customEvent = e;
            if (customEvent.detail.id === this.id) {
                callback(customEvent.detail);
            }
        };
        // Use addEventListener directly to maintain reference for removal
        this.#context.eventManager.addEventListener('componentchange', wrappedCallback);
        // Create unsubscribe function
        const unsubscribe = () => {
            this.#context.eventManager.removeEventListener('componentchange', wrappedCallback);
            // Remove from tracked unsubscribers
            const index = this.#eventUnsubscribers.indexOf(unsubscribe);
            if (index > -1) {
                this.#eventUnsubscribers.splice(index, 1);
            }
        };
        // Track unsubscribe function for automatic cleanup
        this.#eventUnsubscribers.push(unsubscribe);
        return unsubscribe;
    }
    onTimelineChange(callback) {
        const wrappedCallback = (e) => {
            const customEvent = e;
            callback(customEvent.detail);
        };
        // Use addEventListener directly to maintain reference for removal
        this.#context.eventManager.addEventListener('timeupdate', wrappedCallback);
        // Create unsubscribe function
        const unsubscribe = () => {
            this.#context.eventManager.removeEventListener('timeupdate', wrappedCallback);
            // Remove from tracked unsubscribers
            const index = this.#eventUnsubscribers.indexOf(unsubscribe);
            if (index > -1) {
                this.#eventUnsubscribers.splice(index, 1);
            }
        };
        // Track unsubscribe function for automatic cleanup
        this.#eventUnsubscribers.push(unsubscribe);
        return unsubscribe;
    }
}
