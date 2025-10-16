import type { StyleProcessor } from '../StyleProcessor.js';
type ComponentEffectsMap = Record<string, any>;
export declare class TextEffectsStyleProcessor implements StyleProcessor<ComponentEffectsMap | undefined> {
    process(effectsMap: ComponentEffectsMap | undefined): Record<string, any>;
}
export {};
