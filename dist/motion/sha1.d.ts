/**
 * SHA-1 of a string's UTF-8 bytes, as hex. Synchronous and dependency-free so program
 * resolution hashes the same way in Node and in the browser. Used for cache keys, not security.
 */
export declare function sha1(text: string): string;
