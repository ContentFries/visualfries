/**
 * SeedFactory - A utility for deterministic seed-based value generation
 * 
 * This class implements functionality for creating deterministic sequences
 * from seed values, useful for consistent animations and randomization.
 */
export class SeedFactory {
  /**
   * Generates a hash value from a string
   * Implementation of djb2 hash algorithm
   * 
   * @param str The string to hash
   * @returns A numeric hash value
   */
  static hash(str: string): number {
    // Optional: Limit string length to prevent excessive computation
    const limitedStr = str.length > 10000 ? str.substring(0, 10000) : str;
    
    let hash = 5381;
    for (let i = 0; i < limitedStr.length; i++) {
      hash = (hash * 33) ^ limitedStr.charCodeAt(i);
    }
    return hash >>> 0;
  }

  /**
   * Creates a deterministic random number generator
   * 
   * @param seed The seed value for random generation
   * @returns A function that produces deterministic random numbers between 0 and 1
   */
  static createRandomGenerator(seed = 5381): () => number {
    let currentSeed = seed;
    
    return function() {
      // Simple LCG (Linear Congruential Generator)
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  /**
   * Generates a deterministic array of values selected from possible values
   * 
   * @param seed The seed value for deterministic selection
   * @param possibleValues Array of possible values to select from
   * @param count Number of items to generate (default: 50)
   * @returns Array of values in deterministic pseudo-random order
   */
  static generateValues<T>(seed: number, possibleValues: T[], count = 50): T[] {
    if (!possibleValues.length) return [];
    
    // Create seeded random generator
    const seededRandom = this.createRandomGenerator(seed);
    const result: T[] = [];
    
    // Fill array with deterministic selections
    for (let i = 0; i < count; i++) {
      const randomIndex = Math.floor(seededRandom() * possibleValues.length);
      result.push(possibleValues[randomIndex]);
    }
    
    return result;
  }

  /**
   * Generates an array of possible values within a numeric range
   * 
   * @param min Minimum value (inclusive)
   * @param max Maximum value (inclusive)
   * @param step Step size between values (default: 1)
   * @returns Array of all possible values in the range
   */
  static generatePossibleValues(min: number, max: number, step = 1): number[] {
    const values: number[] = [];
    for (let i = min; i <= max; i += step) {
      values.push(Number(i.toFixed(2))); // Fix precision
    }
    return values;
  }

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
  static generateRangeValues(
    seed: number,
    min: number,
    max: number,
    step = 1,
    count = 50
  ): number[] {
    // Generate all possible values in the range
    const possibleValues = this.generatePossibleValues(min, max, step);
    
    // Use the standard generateValues method with the possible values
    return this.generateValues(seed, possibleValues, count);
  }

  /**
   * Converts an array to a seed value
   * 
   * @param array Array to convert to seed
   * @returns Numeric seed value
   */
  static arrayToSeed<T>(array: T[]): number {
    return this.hash(JSON.stringify(array));
  }
}
