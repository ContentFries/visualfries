import type { FontType } from '..';
import type { FontVariantDescriptor } from '../fonts/fontDiscovery.js';
export declare const loadFonts: (fonts: FontType[], variants?: FontVariantDescriptor[]) => Promise<void>;
