import type { AnimationContext } from './AnimationContext.js';
import type {
	AnimationEngineAdaptor,
	EngineTimeline,
	EngineTarget
} from './engines/AnimationEngineAdaptor.js';
import type { AnimationSequenceItem, AnimationTimelinePosition } from '$lib';
import { AnimationSetup } from './AnimationSetup.js';
import { get } from 'lodash-es';
import { v4 as uuidv4 } from 'uuid';

interface ResolvedPosition {
	value?: string | number; // Final value for the engine (time, label, relative offset)
	// Could add more metadata if needed, e.g., if it was an anchor type
}

interface OutLabelInfo {
	labelName: string;
	item: AnimationSequenceItem;
	targets: EngineTarget | EngineTarget[] | null;
	duration: number; // Store the actual calculated duration
}

export class AnimationBuilder {
	private animationContext: AnimationContext;
	private engineAdaptor: AnimationEngineAdaptor;
	private mainTimeline: EngineTimeline;
	private labels: Set<string> = new Set();

	constructor(animationContext: AnimationContext, engineAdaptor: AnimationEngineAdaptor) {
		this.animationContext = animationContext;
		this.engineAdaptor = engineAdaptor;

		const revertAfterComplete = get(
			this.animationContext.preset.preset,
			'revertAfterComplete',
			false
		);

		this.mainTimeline = this.engineAdaptor.createTimeline({
			// duration: this.animationContext.preset.duration,
			revertAfterComplete
		});
	}

	public build(): EngineTimeline {
		this.processSetupSteps();
		const hasItems = this.buildTimelineItems();
		// No more repositionOutLabelsIfNeeded() since we position correctly from the start
		return hasItems ? this.mainTimeline : null;
	}

	private processSetupSteps(): void {
		const setupProcessor = new AnimationSetup(this.animationContext, this.engineAdaptor);
		setupProcessor.process();
	}

	private ensureItemHasId(item: AnimationSequenceItem): void {
		if (!item.id) {
			item.id = uuidv4();
		}
	}

	private buildTimelineItems(): boolean {
		const timelineItems = this.animationContext.preset.getTimelineItems();
		let hasSequenceItems = false;

		for (let i = 0; i < timelineItems.length; i++) {
			const item = timelineItems[i];
			this.ensureItemHasId(item);

			const targets = this.resolveTargets(item.target);

			if (!this.isValidTargets(targets)) {
				console.warn(
					`AnimationBuilder: No targets found for query "${item.target}" in item ID "${item.id || 'untitled'}". Skipping.`
				);
				continue;
			}

			this.addSequenceItemToTimeline(item, i === 0, targets);
			hasSequenceItems = true;
		}

		return hasSequenceItems;
	}

	private isValidTargets(targets: EngineTarget | EngineTarget[] | null): boolean {
		return targets !== null && !(Array.isArray(targets) && targets.length === 0);
	}

	private addSequenceItemToTimeline(
		item: AnimationSequenceItem,
		isFirstItem: boolean,
		targets: EngineTarget | EngineTarget[] | null
	): void {
		// Always build the child timeline first to get real duration
		const childTimeline = this.processTweens(item, targets);
		const duration = this.engineAdaptor.totalDuration(childTimeline);

		// Now calculate position with duration information available
		const resolvedPosition = this.calculatePosition(item.position, item.id, isFirstItem, duration);

		// Add label if needed
		this.addItemLabelIfNeeded(item, resolvedPosition);

		// Add child timeline at calculated position
		this.mainTimeline.add(childTimeline, resolvedPosition.value);
	}

	private addItemLabelIfNeeded(
		item: AnimationSequenceItem,
		resolvedPosition: ResolvedPosition
	): void {
		if (item.id && resolvedPosition.value !== undefined && !this.labels.has(item.id)) {
			this.engineAdaptor.addLabel(this.mainTimeline, item.id, resolvedPosition.value);
			this.labels.add(item.id);
		}
	}

	private processTweens(
		item: AnimationSequenceItem,
		targets: EngineTarget | EngineTarget[] | null
	): EngineTimeline {
		const tweenTL = this.engineAdaptor.createTimeline();

		item.tweens.forEach((tweenDef, tweenIndex) => {
			const resolvedVars = this.resolveTweenVars(tweenDef.vars);
			const tweenPosition = tweenIndex === 0 ? 0 : '>'; // Always start first tween at 0
			const tweenFinalPosition = tweenDef.position || tweenPosition;
			const resolvedPosition = this.calculatePosition(
				tweenFinalPosition,
				undefined,
				tweenIndex === 0,
				0
			);

			this.engineAdaptor.addTween(
				tweenTL,
				targets,
				tweenDef.method,
				resolvedVars,
				resolvedPosition.value
			);
		});

		return tweenTL;
	}

	private resolveTargets(targetQuery: string | undefined): EngineTarget | EngineTarget[] | null {
		return targetQuery
			? this.animationContext.getElement(targetQuery)
			: this.animationContext.rootElement;
	}

	private resolveTweenVars(vars: Record<string, any>): Record<string, any> {
		const resolved: Record<string, any> = {};

		for (const [key, valueDefinition] of Object.entries(vars)) {
			if (key === 'from' && this.isObject(valueDefinition)) {
				resolved.from = this.resolveTweenVars(valueDefinition);
				continue;
			}

			if (key === 'stagger' && valueDefinition) {
				resolved.stagger = this.engineAdaptor.resolveStagger(
					valueDefinition,
					this.animationContext,
					typeof resolved.duration === 'number' ? resolved.duration : undefined
				);
				continue;
			}

			// merge textShadow with animation shadow to preserve effects as expected
			if (key === 'textShadow') {
				const hasOriginalShadow =
					this.animationContext.getData('textShadow') &&
					this.animationContext.getData('textShadow') !== 'none' &&
					this.animationContext.getData('textShadow') !== '';

				const hasAnimationShadow =
					valueDefinition && valueDefinition !== 'none' && valueDefinition !== '';

				if (hasOriginalShadow && hasAnimationShadow) {
					// merge shadows
					resolved.textShadow = `${this.animationContext.getData('textShadow')}, ${valueDefinition}`;
				} else {
					resolved.textShadow = valueDefinition;
				}
				continue;
			}

			resolved[key] = this.resolveValue(valueDefinition, key);
		}

		return resolved;
	}

	private isObject(value: any): boolean {
		return typeof value === 'object' && value !== null;
	}

	private resolveValue(valueDefinition: any, key: string): any {
		if (!this.isObject(valueDefinition)) {
			return valueDefinition;
		}

		if (this.isFromDataValue(valueDefinition)) {
			return this.resolveFromDataValue(valueDefinition, key);
		}

		if (this.isByIndexValue(valueDefinition)) {
			return this.resolveByIndexValue(valueDefinition, key);
		}

		return valueDefinition;
	}

	private isFromDataValue(value: any): boolean {
		return 'fromData' in value && !('type' in value && value.type === 'byIndex');
	}

	private isByIndexValue(value: any): boolean {
		return value.type === 'byIndex' && 'expression' in value;
	}

	private resolveFromDataValue(dataDef: any, key: string): any {
		const referencedData = this.animationContext.getData(dataDef.fromData);

		if (referencedData === undefined) {
			console.warn(
				`AnimationBuilder: dataKey "${dataDef.fromData}" for property "${key}" not found. Using fallbackValue if provided.`
			);
			return dataDef.fallbackValue;
		}

		if (Array.isArray(referencedData)) {
			return this.createArrayAccessFunction(referencedData, dataDef);
		}

		return referencedData;
	}

	private createArrayAccessFunction(valuesArray: any[], dataDef: any): (i: number) => any {
		const mode = dataDef.mode || 'cycle';
		const fallback = dataDef.fallbackValue;
		const arrayClone = [...valuesArray];

		return (i: number) => {
			if (arrayClone.length === 0) return fallback;
			if (i < arrayClone.length) return arrayClone[i];

			switch (mode) {
				case 'cycle':
					return arrayClone[i % arrayClone.length];
				case 'clamp':
					return arrayClone[arrayClone.length - 1];
				default:
					return fallback;
			}
		};
	}

	private resolveByIndexValue(dynamicValueDef: any, key: string): (i: number) => any {
		const expr = dynamicValueDef.expression;
		const dataContext = this.animationContext.getAllData();

		try {
			const boundExpressionFunc = new Function('index', 'data', `return (${expr})`);
			return (i: number) => {
				try {
					return boundExpressionFunc(i, dataContext);
				} catch (e) {
					console.warn(
						`AnimationBuilder: Error executing byIndex expression for '${key}': ${expr}. Index: ${i}. Using fallback.`,
						e
					);
					return dynamicValueDef.fallbackValue;
				}
			};
		} catch (e) {
			console.warn(
				`AnimationBuilder: Error creating function for byIndex expression '${expr}' for '${key}'. Using fallback.`,
				e
			);
			return () => dynamicValueDef.fallbackValue;
		}
	}

	private calculatePosition(
		positionDef: AnimationTimelinePosition | undefined,
		itemId: string | undefined,
		isFirstItem: boolean,
		duration: number
	): ResolvedPosition {
		if (positionDef === undefined) {
			return { value: isFirstItem ? 0 : '>' };
		}

		if (typeof positionDef === 'string') {
			return this.resolveStringPosition(positionDef, duration);
		}

		if (typeof positionDef === 'object') {
			return this.resolveObjectPosition(positionDef);
		}

		if (typeof positionDef === 'number') {
			return { value: positionDef };
		}

		return { value: 0 };
	}

	private resolveStringPosition(positionDef: string, duration: number): ResolvedPosition {
		switch (positionDef) {
			case 'in':
				return { value: 0 };
			case 'out': {
				const componentDuration = this.animationContext.getAnimationTargetDuration();
				if (componentDuration !== undefined) {
					const correctOutPosition = Math.max(0, componentDuration - duration);
					return { value: correctOutPosition };
				} else {
					console.warn(
						'AnimationBuilder: Cannot position "out" animation - no component duration available'
					);
					return { value: '>' };
				}
			}
			default:
				return { value: positionDef };
		}
	}

	private resolveObjectPosition(positionDef: any): ResolvedPosition {
		const { anchor, anchorPoint, alignTween = 'start', offset = '0s' } = positionDef;
		const baseTime = this.resolveAnchor(anchor, anchorPoint);

		if (baseTime === undefined) {
			console.warn(`AnimationBuilder: Could not resolve anchor "${anchor}" for position.`);
			return { value: 0 };
		}

		if (alignTween === 'end' || alignTween === 'center') {
			console.warn(
				`AnimationBuilder: alignTween "${alignTween}" requires knowing the duration of the current animation block. This is advanced and may not be fully supported.`
			);
		}

		return { value: this.buildPositionString(baseTime, offset) };
	}

	private resolveAnchor(anchor: string, anchorPoint?: string): number | string | undefined {
		switch (anchor) {
			case 'componentStart':
				return 0;
			case 'componentCenter': {
				const cd = this.animationContext.getDuration();
				return cd !== undefined ? cd / 2 : undefined;
			}
			case 'componentEnd':
				return this.animationContext.endAnchor;
			default:
				return anchorPoint === 'end' ? `${anchor}.end` : anchor;
		}
	}

	private buildPositionString(baseTime: number | string, offset: string): string {
		if (offset === '0s' || offset === '0') {
			return `${baseTime}`;
		}

		if (offset.startsWith('+') || offset.startsWith('-')) {
			return `${baseTime}${offset}`;
		}

		return `${baseTime}+=${offset}`;
	}
}
