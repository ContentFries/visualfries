import type { StyleProcessor } from '../StyleProcessor.js';
import type { Appearance } from '../../../index.js';
export declare class AppearanceStyleProcessor implements StyleProcessor<Appearance | undefined> {
    process(appearance: Appearance | undefined): Record<string, any>;
}
