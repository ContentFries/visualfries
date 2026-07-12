import { HtmlBuilderFactory } from '../../builders/html/HtmlBuilderFactory.js';
export class HtmlTextHook {
    #handlers = {
        setup: this.#handleSetup.bind(this),
        update: this.#handleUpdate.bind(this),
        destroy: this.#handleDestroy.bind(this),
        refresh: this.#handleRefresh.bind(this),
        'refresh:content': this.#handleRefresh.bind(this),
        'refresh:config': this.#handleRefresh.bind(this)
    };
    types = ['setup', 'update', 'destroy', 'refresh'];
    priority = 1;
    #currentId = undefined;
    #context;
    #htmlEl = undefined;
    #wrapperEl = undefined;
    domManager;
    componentsManager;
    constructor(cradle) {
        this.domManager = cradle.domManager;
        this.componentsManager = cradle.componentsManager;
    }
    buildHtmlElements() {
        const componentData = this.#context.contextData;
        if (componentData.type !== 'TEXT')
            return { wrapper: undefined, element: undefined };
        try {
            // Use the factory to create an appropriate builder
            const builder = HtmlBuilderFactory.createBuilder(componentData, document);
            // Build the HTML elements
            const { wrapper, element } = builder.build();
            return { wrapper, element };
        }
        catch (error) {
            return { wrapper: undefined, element: undefined };
        }
    }
    async #handleSetup() {
        if (this.#htmlEl) {
            return;
        }
        const componentData = this.#context.contextData;
        this.#currentId = this.#context.contextData.id;
        const comp = this.componentsManager.get(this.#context.contextData.id);
        if (this.#context.type === 'TEXT' && comp) {
            this.#context.updateContextData(comp.props.getData());
        }
        const { wrapper, element } = this.buildHtmlElements();
        if (!element || !wrapper) {
            return;
        }
        this.#wrapperEl = wrapper;
        this.#htmlEl = element;
        // Store references in the context for other hooks
        this.#context.setResource('wrapperHtmlEl', this.#wrapperEl);
        this.#context.setResource('htmlEl', this.#htmlEl);
        const background = componentData.type === 'TEXT' ? componentData.appearance.background : undefined;
        const animateWrapper = background &&
            typeof background === 'object' &&
            'enabled' in background &&
            background.enabled &&
            background.target === 'wrapper';
        // Card/background animations must target the wrapper. Animating only the text leaves the
        // wrapper background fully opaque, which can create blank transition frames.
        this.#context.setResource('animationTarget', animateWrapper ? this.#wrapperEl : this.#htmlEl);
        // Add to DOM if not already present
        const hasEl = this.domManager.htmlContainer.querySelector('#' + this.#wrapperEl.id);
        if (!hasEl) {
            this.domManager.htmlContainer.appendChild(this.#wrapperEl);
        }
    }
    async #handleUpdate() {
        if (this.#currentId !== this.#context.contextData.id) {
            await this.#handleRefresh();
        }
        const isActive = this.#context.isActive && this.#context.data.visible !== false;
        if (this.#wrapperEl) {
            if (isActive) {
                this.#wrapperEl.style.display = 'flex';
            }
            else {
                this.#wrapperEl.style.display = 'none';
            }
        }
        if (this.#context.disabled != isActive) {
            this.#context.disabled = isActive !== true;
        }
    }
    async #handleRefresh() {
        await this.#handleDestroy();
        await this.#handleSetup();
    }
    async #handleDestroy() {
        this.#wrapperEl?.remove();
        this.#wrapperEl = undefined;
        this.#htmlEl = undefined;
        this.#context.removeResource('wrapperHtmlEl');
        this.#context.removeResource('htmlEl');
    }
    async handle(type, context) {
        this.#context = context;
        // if (this.#context.disabled) {
        // 	return;
        // }
        const handler = this.#handlers[type];
        if (handler) {
            await handler();
        }
    }
}
