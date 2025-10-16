import type { StyleProcessor } from '../StyleProcessor.js';
import type { TextAppearance } from '../../..';
export declare class TextAppearanceStyleProcessor implements StyleProcessor<TextAppearance | undefined> {
    process(textAppearance: TextAppearance | undefined): Record<string, any>;
}
