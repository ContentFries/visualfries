import type { AnimationPreset } from './animationPreset.js';
import { SplitTextCache } from './SplitTextCache.js';

export class AnimationContext {
	private animationTargetDuration: number;

	constructor(
		public rootElement: any,
		public preset: AnimationPreset,
		public splitTextCache: SplitTextCache,
		public data: Record<string, any> = {}
	) {
		let textShadow = '';
		if (this.rootElement instanceof HTMLElement) {
			textShadow = this.rootElement.style.textShadow ?? '';
		}

		this.data.textShadow = textShadow;
		this.animationTargetDuration = 0

		this.preset.preset.data = {
			...this.preset.preset.data,
			...this.data
		};
	}

	get endAnchor(): number {
		return this.animationTargetDuration - this.getDuration();
	}

	setAnimationTargetDuration(duration: number): void {
		this.animationTargetDuration = duration;
	}

	getData(key: string): any {
		return this.data[key];
	}

	getElement(targetQuery: string): any {
		if (!(this.rootElement instanceof HTMLElement)) {
			console.warn(`Root element is not an HTMLElement. Cannot target ${targetQuery}`);
			return this.rootElement;
		}

		const splitTargets = ['words', 'lines', 'chars'];
		if (splitTargets.includes(targetQuery)) {
			// Get the splitText instance from the global singleton cache
			return this.splitTextCache.getSplitText(
				this.rootElement,
				targetQuery as 'words' | 'lines' | 'chars'
			);
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

	getDuration(): number {
		return this.preset.duration;
	}

	getAnimationTargetDuration(): number {
		return this.animationTargetDuration;
	}

	getAllData(): Record<string, any> {
		return this.data;
	}
}
