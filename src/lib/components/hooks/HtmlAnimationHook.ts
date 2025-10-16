import type {
	IComponentContext,
	IComponentHook,
	HookType,
	HookHandlers
} from '$lib';

export class HtmlAnimationHook implements IComponentHook {
	#handlers: HookHandlers = {
		// setup: this.#handleSetup.bind(this),
		destroy: this.#handleDestroy.bind(this),
		refresh: this.#handleRefresh.bind(this),
		update: this.#handleUpdate.bind(this),
		'refresh:animation': this.#handleRefresh.bind(this)
	} as const;
	#context!: IComponentContext;
	#htmlEl: HTMLElement | undefined = undefined;
	#tl = false;
	#currentId: string | undefined = undefined;

	types: HookType[] = Object.keys(this.#handlers) as HookType[];
	priority: number = 1;

	private buildTimeline() {
		if (this.#tl) {
			return;
		}

		if (!this.#htmlEl) {
			throw new Error(
				'html element not found for animation hook of component: ' + this.#context.contextData.id
			);
		}
	}

	async #handleSetup() {
		if (this.#htmlEl) {
			return;
		}

		const el = this.#context.getResource('htmlEl');
		if (!el) {
			throw new Error(
				'HtmlAnimationHandler: Html el resource not found: ' + this.#context.contextData.id
			);
		}

		this.#htmlEl = el;
		// this is a gsap animation that might utilize gsap text splitter and other complex animations and apply them to htmlEl
		this.buildTimeline();
		this.#currentId = this.#context.contextData.id;
	}

	async #handleRefresh() {
		await this.#handleDestroy();
		await this.#handleSetup();
	}

	// update on context id change, for example, subtitle changed so id changed as well
	async #handleUpdate() {
		if (this.#context.isActive && this.#currentId !== this.#context.contextData.id) {
			await this.#handleRefresh();
		}

		if (this.#context.isActive && !this.#htmlEl) {
			await this.#handleSetup();
		}
	}

	async #handleDestroy() {
		// remove event listeners from video
		if (this.#tl) {
			this.#tl = false;
			// this.timeline.getTimeline().remove(this.#tl);
			// this.#tl.kill();
			// this.#tl = undefined;
		}
		this.#htmlEl = undefined;
	}

	// we need to set context here and not inject it is bound to component and we can update any of the components at any time
	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;
		if (this.#context.disabled) {
			return;
		}

		const handler = this.#handlers[type];
		if (handler) {
			await handler();
		}
	}
}
