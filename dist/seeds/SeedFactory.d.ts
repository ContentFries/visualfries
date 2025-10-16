/**
 * SeedFactory - A utility for deterministic seed-based value generation
 *
 * This class implements functionality for creating deterministic sequences
 * from seed values, useful for consistent animations and randomization.
 */
export declare class SeedFactory {
    /**
     * Generates a hash value from a string
     * Implementation of djb2 hash algorithm
     *
     * @param str The string to hash
     * @returns A numeric hash value
     */
    static hash(str: string): number;
    /**
     * Creates a deterministic random number generator
     *
     * @param seed The seed value for random generation
     * @returns A function that produces deterministic random numbers between 0 and 1
     */
    static createRandomGenerator(seed?: number): () => number;
    /**
     * Generates a deterministic array of values selected from possible values
     *
     * @param seed The seed value for deterministic selection
     * @param possibleValues Array of possible values to select from
     * @param count Number of items to generate (default: 50)
     * @returns Array of values in deterministic pseudo-random order
     */
    static generateValues<T>(seed: number, possibleValues: T[], count?: number): T[];
    /**
     * Generates an array of possible values within a numeric range
     *
     * @param min Minimum value (inclusive)
     * @param max Maximum value (inclusive)
     * @param step Step size between values (default: 1)
     * @returns Array of all possible values in the range
     */
    static generatePossibleValues(min: number, max: number, step?: number): number[];
    /**
     * Generates deterministic numeric values within a range
     *
     * @param seed The seed value for deterministic generation
     * @param min Minimum value (inclusive)
     * @param max Maximum value (inclusive)
     * @param step Step size between values (default: 1)
     * @param count Number of items to generate (default: 50)
     * @returns Array of deterministic numeric values
     */
    static generateRangeValues(seed: number, min: number, max: number, step?: number, count?: number): number[];
    /**
     * Converts an array to a seed value
     *
     * @param array Array to convert to seed
     * @returns Numeric seed value
     */
    static arrayToSeed<T>(array: T[]): number;
}
