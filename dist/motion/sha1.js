/**
 * SHA-1 of a string's UTF-8 bytes, as hex. Synchronous and dependency-free so program
 * resolution hashes the same way in Node and in the browser. Used for cache keys, not security.
 */
export function sha1(text) {
    const bytes = new TextEncoder().encode(text);
    const length = bytes.length;
    const words = new Uint32Array((((length + 8) >> 6) + 1) * 16);
    for (let i = 0; i < length; i++)
        words[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
    words[length >> 2] |= 0x80 << (24 - (length % 4) * 8);
    words[words.length - 1] = length * 8;
    // Message lengths above 512 MB would need the high word; program slices are far smaller.
    const w = new Uint32Array(80);
    let [h0, h1, h2, h3, h4] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
    for (let block = 0; block < words.length; block += 16) {
        for (let t = 0; t < 16; t++)
            w[t] = words[block + t];
        for (let t = 16; t < 80; t++) {
            const x = w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16];
            w[t] = (x << 1) | (x >>> 31);
        }
        let [a, b, c, d, e] = [h0, h1, h2, h3, h4];
        for (let t = 0; t < 80; t++) {
            const f = t < 20
                ? ((b & c) | (~b & d)) + 0x5a827999
                : t < 40
                    ? (b ^ c ^ d) + 0x6ed9eba1
                    : t < 60
                        ? ((b & c) | (b & d) | (c & d)) + 0x8f1bbcdc
                        : (b ^ c ^ d) + 0xca62c1d6;
            const next = (((a << 5) | (a >>> 27)) + f + e + w[t]) >>> 0;
            e = d;
            d = c;
            c = (b << 30) | (b >>> 2);
            b = a;
            a = next;
        }
        h0 = (h0 + a) >>> 0;
        h1 = (h1 + b) >>> 0;
        h2 = (h2 + c) >>> 0;
        h3 = (h3 + d) >>> 0;
        h4 = (h4 + e) >>> 0;
    }
    return [h0, h1, h2, h3, h4].map((h) => (h >>> 0).toString(16).padStart(8, '0')).join('');
}
