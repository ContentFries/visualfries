import type {
	IComponentContext,
	IComponentHook,
	HookType,
	HookHandlers
} from '$lib';
import type { AnimationPreset as AnimationPresetData } from '$lib';
import { AnimationPresetShape } from '$lib';

import { TimelineManager } from '$lib/managers/TimelineManager.svelte.js';
import { AnimationContext } from '$lib/animations/AnimationContext.js';
import { GsapEngineAdaptor } from '$lib/animations/engines/GSAPEngineAdaptor.js';
import { AnimationBuilder } from '$lib/animations/animationBuilder.js';
import { AnimationPreset } from '$lib/animations/animationPreset.js';
import type { ComponentAnimationTransformer } from '$lib/animations/transformers/AnimationReferenceTransformer.js';
import { gsap } from 'gsap';
import { SplitTextCache } from '$lib/animations/SplitTextCache.js';
import { WordHighlighterAnimationBuilder } from '$lib/animations/builders/WordHighlighterAnimationBuilder.js';
import { LineHighlighterAnimationBuilder } from '$lib/animations/builders/LineHighlighterAnimationBuilder.js';
/**
 * Animation hook for managing component animations
 * This hook can be applied to any component type and handles animation lifecycle
 */
export class AnimationHook implements IComponentHook {
	#handlers: HookHandlers = {
		setup: this.#handleSetup.bind(this),
		destroy: this.#handleDestroy.bind(this),
		update: this.#handleUpdate.bind(this),
		refresh: this.#handleRefresh.bind(this),
		'refresh:animation': this.#handleRefresh.bind(this)
	} as const;

	#context!: IComponentContext;
	#currentId: string | undefined = undefined;
	#componentTimeline: gsap.core.Timeline | undefined | null = undefined;
	#animationsBuilt = false;

	private timeline: TimelineManager;
	private splitTextCache: SplitTextCache;
	types: HookType[] = Object.keys(this.#handlers) as HookType[];
	priority: number = 1;
	animTransformer: ComponentAnimationTransformer;

	constructor(cradle: {
		timelineManager: TimelineManager;
		componentAnimationTransformer: ComponentAnimationTransformer;
		splitTextCache: SplitTextCache;
	}) {
		this.timeline = cradle.timelineManager;
		this.animTransformer = cradle.componentAnimationTransformer;
		this.splitTextCache = cradle.splitTextCache;
	}

	#getComponentAnimations() {
		const target = this.#context.resources.get('animationTarget') as HTMLElement;
		const animationData =
			(this.#context.resources.get('animationData') as Record<string, any>) ??
			({} as Record<string, any>);
		const animations = [...(this.#context.contextData.animations.list ?? [])];
		const customAnimations = WordHighlighterAnimationBuilder.build(
			this.#context.contextData,
			target,
			animationData,
			this.splitTextCache
		);

		const lineAnimations = LineHighlighterAnimationBuilder.build(
			this.#context.contextData,
			target,
			animationData,
			this.splitTextCache
		);

		animations.push(...customAnimations);
		animations.push(...lineAnimations);

		return animations;
	}

	/**
	 * Handle hook setup
	 */
	async #handleSetup() {
		if (this.#componentTimeline !== undefined) {
			return;
		}
		// Get component animations
		if (!this.#context.data.animations.enabled) {
			return;
		}

		const target = this.#context.resources.get('animationTarget');
		if (!target) {
			// console.warn("Animation target not specified. Skipping animations")
			return;
		}

		const animations = this.#getComponentAnimations();
		if (!animations?.length) {
			return;
		}

		// if (this.#animationsBuilt) {
		// 	return;
		// }

		this.#currentId = this.#context.contextData.id;

		const animationTimes = animations.map((anim) => {
			return {
				id: anim.id,
				startAt: anim.startAt ?? 0
			};
		});

		// first we need to transform / normalize strings or simplified animations into animations
		const anims: AnimationPresetData[] = animations
			.map((anim) => {
				const animation = this.animTransformer.handle(anim.animation);
				if (animation) {
					animation.id = anim.id;
					return animation;
				}
			})
			.filter((anim) => anim !== null) as AnimationPresetData[];

		// build timeline and add it to the main timeline
		const animationData =
			(this.#context.resources.get('animationData') as Record<string, any>) ??
			({} as Record<string, any>);

		const animationsTimeline = gsap.timeline();
		let hasAnimations = false;
		for (const anim of anims) {
			try {
				if (!anim) {
					continue;
				}

				const parsedPreset = AnimationPresetShape.safeParse(anim);
				if (!parsedPreset.success) {
					continue;
				}

				const animationPreset = new AnimationPreset(anim);
				const animationContext = new AnimationContext(
					target,
					animationPreset,
					this.splitTextCache,
					{
						...animationData
					}
				);
				animationContext.setAnimationTargetDuration(this.#context.duration);

				// 3. Instantiate Engine Adaptor
				const gsapAdaptor = new GsapEngineAdaptor();

				// 4. Build the Animation
				const builder = new AnimationBuilder(animationContext, gsapAdaptor);
				const animation = builder.build();
				if (animation) {
					// pass in animation start time so it starts at the correct time, relative to the component
					const animationTime = animationTimes.find((at) => at.id === anim.id)?.startAt;
					animationsTimeline.add(animation, animationTime ?? 0);
					hasAnimations = true;
				}
				this.#animationsBuilt = true;
			} catch (error) {
				console.error('Error building animation', error, anim);
			}
		}

		if (hasAnimations) {
			this.#componentTimeline = animationsTimeline;
			this.timeline.addLabel(
				this.#context.contextData.id,
				this.#context.contextData.timeline.startAt
			);
			this.timeline.add(this.#componentTimeline, this.#context.contextData.id);
		}
	}

	/**
	 * Handle animation refresh
	 */
	async #handleRefresh() {
		await this.#handleDestroy();
		await this.#handleSetup();
	}

	/**
	 * Handle component updates
	 */
	async #handleUpdate() {
		// Check if component ID has changed
		if (this.#context.isActive && this.#currentId !== this.#context.contextData.id) {
			await this.#handleRefresh();
		}

		// Setup if component becomes active and animations aren't set up
		if (this.#context.isActive) {
			//  && !this.#controls
			await this.#handleSetup();
		}
	}

	/**
	 * Handle hook destruction
	 */
	async #handleDestroy() {
		// this.#controls
		this.#currentId = undefined;
		this.#componentTimeline?.revert();
		this.#componentTimeline?.kill();
		this.#componentTimeline = undefined;

		if (this.#context.resources.get('animationTarget') instanceof HTMLElement) {
			// clear cache for the animation target so it works on rewind / fast forward as underlying instances were destroyed by revert
			this.splitTextCache.clearCache(this.#context.resources.get('animationTarget') as HTMLElement);
		}
	}

	/**
	 * Hook handle method
	 */
	async handle(type: HookType, context: IComponentContext) {
		this.#context = context;

		// Skip if component is disabled
		if (this.#context.disabled) {
			return;
		}

		// Call the appropriate handler
		const handler = this.#handlers[type];
		if (handler) {
			await handler();
		}
	}
}
