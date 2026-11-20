import { footageMap } from './footage-map.js';
import { segmentStage, wholeProgram } from './segments.js';
/**
 * A live preview folder (`visualfries live`): everything a page needs to play a program in real
 * time, with no extracted frames. `manifest.json` names every other file relative to itself, so
 * the folder can be served from anywhere; `resolveLiveManifest` makes those names URLs.
 */
/** Version of `manifest.json`; a player refuses other versions. */
export const LIVE_MANIFEST_VERSION = 1;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * Replaces each of `files` where it starts a string or follows a quote, a parenthesis or a
 * space (`url("assets/1-logo.png")`, a prop that is the file) with `url(file)`.
 */
function fileSwapper(files, url) {
    if (!files.length)
        return (s) => s;
    const names = [...files].sort((a, b) => b.length - a.length).map(escape);
    const re = new RegExp(`(^|["'(\\s])(${names.join('|')})`, 'g');
    return (s) => s.replace(re, (_all, lead, file) => lead + url(file));
}
function swapStrings(value, swap) {
    if (typeof value === 'string')
        return swap(value);
    if (Array.isArray(value))
        return value.map((v) => swapStrings(v, swap));
    if (value && typeof value === 'object')
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swapStrings(v, swap)]));
    return value;
}
/**
 * The manifest with every file it names as a URL against `base` (the manifest's own URL): the
 * bundle, proxies, sound, fonts, and the files the segment's props, brand tokens and CSS name.
 */
export function resolveLiveManifest(manifest, base) {
    if (manifest.version !== LIVE_MANIFEST_VERSION)
        throw new Error(`Live preview version ${manifest.version} is not supported (this player reads ${LIVE_MANIFEST_VERSION}).`);
    const url = (file) => new URL(file, base).href;
    const swap = fileSwapper(manifest.files, url);
    return {
        ...manifest,
        bundle: url(manifest.bundle),
        styles: manifest.styles === null ? null : url(manifest.styles),
        segment: swapStrings(manifest.segment, swap),
        footage: Object.fromEntries(Object.entries(manifest.footage).map(([name, f]) => [name, { ...f, url: url(f.url) }])),
        fonts: manifest.fonts.map((f) => ({ ...f, url: url(f.url) })),
        css: swap(manifest.css),
        audio: manifest.audio === null ? null : url(manifest.audio),
        files: manifest.files.map(url)
    };
}
/**
 * Footage frames for the stage from proxies and ranges instead of extracted files: no URLs (the
 * live pictures draw from the videos), the same ranges and subject boxes as extraction. Blocks
 * get their frames from `pictures`.
 */
export function liveFootageFrames(footage, boxes = {}, pictures) {
    const frames = {};
    for (const [name, source] of Object.entries(footage)) {
        const ranges = (boxes[name] ?? []).map((r) => ({
            url: '',
            first: r.first,
            last: r.last,
            ...(r.boxes ? { boxes: r.boxes } : {})
        }));
        frames[name] = {
            url: '',
            first: ranges[0]?.first ?? 0,
            last: ranges[0]?.last ?? -1,
            ranges,
            total: source.total,
            width: source.width,
            height: source.height,
            startFrame: 0,
            subject: source.packed,
            boxes: ranges[0]?.boxes,
            ...(pictures
                ? { picture: (frame, layer) => pictures(name, frame, layer) }
                : {})
        };
    }
    return frames;
}
const isSegment = (input) => 'footageMap' in input && 'size' in input;
/**
 * The segment a live player draws: a stage segment as it is, or a whole resolved program as one
 * segment (`brand` its tokens), with the footage frames of the proxies (blocks draw them with
 * `pictures`).
 */
export function liveSegment(input, footage, boxes, brand, pictures) {
    const frames = liveFootageFrames(footage, boxes, pictures);
    if (isSegment(input))
        return { ...input, footage: frames };
    const totals = Object.fromEntries(Object.entries(footage).map(([n, f]) => [n, f.total]));
    const map = footageMap(input, totals);
    return segmentStage(input, wholeProgram(input), { frames, map }, brand);
}
