import { AnimationPresetShape, KeyframeAnimationShape } from '../..';
class AbstractNormalizationHandler {
    nextHandler = null;
    setNext(handler) {
        this.nextHandler = handler;
        return handler; // Allows chaining like handler1.setNext(handler2).setNext(handler3)
    }
    handle(input, registry) {
        if (this.canHandle(input)) {
            return this.normalize(input, registry);
        }
        else if (this.nextHandler) {
            return this.nextHandler.handle(input, registry);
        }
        return null;
    }
}
class StringPresetHandler extends AbstractNormalizationHandler {
    canHandle(input) {
        return typeof input === 'string';
    }
    normalize(input, registry) {
        const presetName = input;
        const preset = registry.get(presetName);
        if (!preset) {
            console.warn(`StringPresetHandler: Preset "${presetName}" not found.`);
            return null;
        }
        // Optional: validate preset from registry
        const parseResult = AnimationPresetShape.safeParse(preset);
        if (!parseResult.success) {
            console.warn(`StringPresetHandler: Preset "${presetName}" from registry is invalid.`, parseResult.error.flatten());
            return null;
        }
        return parseResult.data;
    }
}
class KeyframePresetHandler extends AbstractNormalizationHandler {
    canHandle(input) {
        // More robust than 'tween' in input, use Zod to check shape
        return KeyframeAnimationShape.safeParse(input).success;
    }
    normalize(input, _registry) {
        const parseResult = KeyframeAnimationShape.safeParse(input);
        if (!parseResult.success) {
            // Should have been caught by canHandle, but good practice
            console.warn('KeyframePresetHandler: Input is not a valid KeyframeAnimationShape.', parseResult.error.flatten());
            return null;
        }
        const keyframeAnim = parseResult.data;
        const presetId = keyframeAnim.id || `keyframe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const fullPresetObject = {
            id: presetId,
            data: { componentDuration: 0 },
            setup: [],
            timeline: [
                {
                    target: keyframeAnim.target || 'container',
                    tweens: [keyframeAnim.tween]
                }
            ]
        };
        const normalizedValidation = AnimationPresetShape.safeParse(fullPresetObject);
        if (!normalizedValidation.success) {
            console.error('KeyframePresetHandler: Failed to normalize keyframe to valid AnimationPresetShape.', normalizedValidation.error.flatten());
            return null;
        }
        return normalizedValidation.data;
    }
}
class FullPresetHandler extends AbstractNormalizationHandler {
    canHandle(input) {
        const resp = AnimationPresetShape.safeParse(input);
        if (!resp.success) {
            // console.warn('FullPresetHandler: Input is not a valid AnimationPresetShape.', resp.error);
        }
        return AnimationPresetShape.safeParse(input).success;
    }
    normalize(input, _registry) {
        const parseResult = AnimationPresetShape.safeParse(input);
        if (!parseResult.success) {
            // Should have been caught by canHandle
            // console.warn(
            // 	'FullPresetHandler: Input is not a valid AnimationPresetShape.',
            // 	parseResult.error.flatten()
            // );
            return null;
        }
        return parseResult.data;
    }
}
export class ComponentAnimationTransformer {
    animationPresetsRegister;
    constructor(cradle) {
        this.animationPresetsRegister = cradle.animationPresetsRegister;
    }
    handle(input) {
        const stringHandler = new StringPresetHandler();
        const keyframeHandler = new KeyframePresetHandler();
        const fullPresetHandler = new FullPresetHandler();
        // Define the chain: Order matters!
        // String is most specific, then keyframe (subset of object), then full object.
        stringHandler.setNext(keyframeHandler).setNext(fullPresetHandler);
        const normalizedPreset = stringHandler.handle(input, this.animationPresetsRegister.getPresets()); // TODO fill registry
        if (!normalizedPreset) {
            // console.warn(
            // 	'normalizeAnimationReferenceWithPattern: Input animation reference does not match any known format or failed normalization.',
            // 	input
            // );
            return null;
        }
        return normalizedPreset;
    }
}
