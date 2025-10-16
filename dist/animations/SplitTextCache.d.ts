/**
 * Singleton cache for SplitText instances.
 * This ensures we only split text once per element and split type,
 * preventing multiple splits on the same element when accessed from different contexts.
 */
export declare class SplitTextCache {
    private cache;
    constructor();
    /**
     * Get or create a SplitText instance for an element and split type
     * @param element The HTML element to split
     * @param splitType The type of split ('words', 'lines', 'chars')
     * @returns The SplitText result array for the requested split type
     */
    getSplitText(element: HTMLElement, splitType: 'words' | 'lines' | 'chars'): any;
    /**
     * Clear the entire cache or just entries for a specific element
     * @param element Optional element to clear cache for just that element
     */
    clearCache(element?: HTMLElement): void;
    /**
     * Generate a unique ID for an element that doesn't have an ID
     * Uses a WeakMap to store references to elements without modifying them
     */
    private elementMap;
    private elementCounter;
    private generateElementId;
}
