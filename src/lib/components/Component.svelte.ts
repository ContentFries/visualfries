import type {
	IComponent,
	IComponentContext,
	ComponentProps,
	IComponentHook,
	HookType,
	ComponentRefreshType,
	ComponentData
} from '$lib';

import type { AppearanceInput } from '$lib';

import { ComponentContext } from './ComponentContext.svelte.js';

export class Component implements IComponent {
	#properties: ComponentProps = $state({} as ComponentProps);
	#context: IComponentContext;
	#hooks: IComponentHook[] = [];
	#autoRefresh: boolean = false;
	#eventUnsubscribers: (() => void)[] = [];

	constructor(cradle: { componentState: ComponentProps; componentContext: ComponentContext }) {
		this.#properties = cradle.componentState;
		this.#context = cradle.componentContext;
		this.#context.setComponentProps(this.#properties);

		// Set up auto-refresh callback if ComponentState supports it
		if (
			'setRefreshCallback' in this.#properties &&
			typeof this.#properties.setRefreshCallback === 'function'
		) {
			this.#properties.setRefreshCallback(() => this.maybeRefresh());
		}
	}

	get id(): string {
		return this.#properties.id;
	}

	get type() {
		return this.#properties.type;
	}

	get props(): ComponentProps {
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

	get autoRefresh(): boolean {
		return this.#autoRefresh;
	}

	setAutoRefresh(enabled: boolean): Component {
		this.#autoRefresh = enabled;
		return this;
	}

	private async maybeRefresh(): Promise<void> {
		if (this.#autoRefresh) {
			await this.refresh();
		}
	}

	addHook(hook: IComponentHook, priority?: number) {
		const maxPriority =
			this.#hooks.length > 0 ? Math.max(...this.#hooks.map((h) => h.priority ?? 0)) : 0;

		hook.priority = priority ? priority : maxPriority + 1;
		this.#hooks.push(hook);
	}

	async #handle(type: HookType) {
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

	async refresh(type: ComponentRefreshType = 'refresh') {
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
	async updateAppearance(appearance: Partial<AppearanceInput>): Promise<Component> {
		await this.#properties.updateAppearance(appearance);
		return this;
	}

	setStart(start: number): Component {
		this.#properties.setStart(start);
		return this;
	}

	setEnd(end: number): Component {
		this.#properties.setEnd(end);
		return this;
	}

	async updateText(text: string): Promise<Component> {
		await this.#properties.updateText(text);
		return this;
	}

	// Simple fluent wrapper methods
	async setText(text: string): Promise<Component> {
		return this.updateText(text);
	}

	async setVisible(visible: boolean): Promise<Component> {
		await this.#properties.setVisible(visible);
		return this;
	}

	async setOrder(order: number): Promise<Component> {
		await this.#properties.setOrder(order);
		return this;
	}

	// Component-scoped event filtering methods
	onChange(callback: (changes: ComponentData) => void): () => void {
		const wrappedCallback = (e: Event) => {
			const customEvent = e as CustomEvent<ComponentData>;
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

	onTimelineChange(callback: (time: number) => void): () => void {
		const wrappedCallback = (e: Event) => {
			const customEvent = e as CustomEvent<number>;
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
