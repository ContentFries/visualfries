import type { AnimationContext } from './AnimationContext.ts';
import type { AnimationEngineAdaptor } from './engines/AnimationEngineAdaptor.ts';
export class AnimationSetup {
	constructor(
		private animationContext: AnimationContext,
		private engineAdaptor: AnimationEngineAdaptor
	) {}

	process(): void {
		// TODO: Implement setup processing
		const setup = this.animationContext.preset.preset.setup;
		if (!setup) return;

		for (const step of setup) {
			if (step.type === 'style') {
				// if (this.animationContext.rootElement instanceof HTMLElement) {
				// 	for (const property in step.properties) {
				// 		this.animationContext.rootElement.style[property] = step.properties[property];
				// 	}
				// }
			}

			if (step.type === 'splitText' && ['words', 'lines', 'chars'].includes(step.by)) {
				// prepare cache
				// this.animationContext.splitTextCache.getSplitText(
				// 	this.animationContext.rootElement,
				// 	step.by
				// );
			}
		}
	}
}
