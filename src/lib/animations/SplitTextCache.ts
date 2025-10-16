import { SplitText } from 'gsap/SplitText';
import gsap from 'gsap';
/**
 * Singleton cache for SplitText instances.
 * This ensures we only split text once per element and split type,
 * preventing multiple splits on the same element when accessed from different contexts.
 */
export class SplitTextCache {
	private cache: Map<string, SplitText> = new Map();

	constructor() {
		gsap.registerPlugin(SplitText);
	}

	/**
	 * Get or create a SplitText instance for an element and split type
	 * @param element The HTML element to split
	 * @param splitType The type of split ('words', 'lines', 'chars')
	 * @returns The SplitText result array for the requested split type
	 */
	public getSplitText(element: HTMLElement, splitType: 'words' | 'lines' | 'chars'): any {
		// Generate a unique cache key based on element ID/reference and split type
		const elementId = element.id || this.generateElementId(element);
		const cacheKey = `${elementId}_${splitType}`;

		// Check if we already have this split in the cache
		if (!this.cache.has(cacheKey)) {
			// Create and cache a new SplitText instance
			const splitText = new SplitText(element, {
				type: splitType,
				reduceWhiteSpace: false,
				preserveSpaces: true,
				autoSplit: true,
				aria: 'none'
			});
			this.cache.set(cacheKey, splitText);
		}

		// Return the cached split elements
		return this.cache.get(cacheKey)![splitType];
	}

	/**
	 * Clear the entire cache or just entries for a specific element
	 * @param element Optional element to clear cache for just that element
	 */
	public clearCache(element?: HTMLElement): void {
		if (element) {
			const elementId = element.id || this.generateElementId(element);
			// Remove all entries starting with this element's ID
			for (const key of this.cache.keys()) {
				if (key.startsWith(`${elementId}_`)) {
					this.cache.delete(key);
				}
			}
		} else {
			this.cache.clear();
		}
	}

	/**
	 * Generate a unique ID for an element that doesn't have an ID
	 * Uses a WeakMap to store references to elements without modifying them
	 */
	private elementMap = new WeakMap<HTMLElement, string>();
	private elementCounter = 0;

	private generateElementId(element: HTMLElement): string {
		if (!this.elementMap.has(element)) {
			this.elementMap.set(element, `split-text-el-${this.elementCounter++}`);
		}
		return this.elementMap.get(element)!;
	}
}
