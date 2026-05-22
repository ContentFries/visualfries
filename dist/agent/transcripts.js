function toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}
function normalizeWord(word) {
    const text = String(word.text ?? word.word ?? '').trim();
    const start = toNumber(word.start_at ?? word.start);
    const end = toNumber(word.end_at ?? word.end);
    if (!text || start === undefined || end === undefined)
        return undefined;
    return [text, start, Math.max(start, end)];
}
function segmentText(segment) {
    const explicit = String(segment.text ?? '').trim();
    if (explicit)
        return explicit;
    return (segment.words ?? [])
        .map((word) => String(word.text ?? word.word ?? '').trim())
        .filter(Boolean)
        .join(' ');
}
function segmentTiming(segment) {
    const start = toNumber(segment.start_at ?? segment.start);
    const end = toNumber(segment.end_at ?? segment.end);
    if (start !== undefined && end !== undefined) {
        return { start, end: Math.max(start, end) };
    }
    const words = (segment.words ?? []).map(normalizeWord).filter(Boolean);
    if (!words.length)
        return undefined;
    return {
        start: words[0][1],
        end: words[words.length - 1][2]
    };
}
function wordsToSegments(words, maxWordsPerSegment = 7) {
    const normalized = words.map(normalizeWord).filter(Boolean);
    const segments = [];
    for (let index = 0; index < normalized.length; index += maxWordsPerSegment) {
        const chunk = normalized.slice(index, index + maxWordsPerSegment);
        segments.push({
            id: `subtitle-${segments.length + 1}`,
            text: chunk.map((word) => word[0]).join(' '),
            start_at: chunk[0][1],
            end_at: chunk[chunk.length - 1][2],
            words: chunk.map((word) => ({
                text: word[0],
                start_at: word[1],
                end_at: word[2]
            }))
        });
    }
    return segments;
}
export function normalizeTranscript(input) {
    const rawSegments = Array.isArray(input)
        ? input
        : input.subtitles ?? input.segments ?? (input.words ? wordsToSegments(input.words) : []);
    return rawSegments
        .map((segment, index) => {
        const timing = segmentTiming(segment);
        const text = segmentText(segment);
        if (!timing || !text)
            return undefined;
        const words = (segment.words ?? []).map(normalizeWord).filter(Boolean);
        return {
            id: segment.id ?? `subtitle-${index + 1}`,
            start_at: timing.start,
            end_at: timing.end,
            text,
            words: words.length ? words : undefined
        };
    })
        .filter(Boolean);
}
export function inferTranscriptDuration(subtitles) {
    return subtitles.reduce((duration, subtitle) => Math.max(duration, subtitle.end_at), 0);
}
function parseTimestamp(value) {
    const normalized = value.trim().replace(',', '.');
    const parts = normalized.split(':');
    if (parts.length < 2 || parts.length > 3)
        return undefined;
    const seconds = Number(parts.at(-1));
    const minutes = Number(parts.at(-2));
    const hours = parts.length === 3 ? Number(parts[0]) : 0;
    if (![seconds, minutes, hours].every(Number.isFinite))
        return undefined;
    return hours * 3600 + minutes * 60 + seconds;
}
function stripVttCueSetting(value) {
    return value.trim().split(/\s+/, 1)[0] ?? value.trim();
}
function parseCueBlock(block, index) {
    const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (!lines.length)
        return undefined;
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex === -1)
        return undefined;
    const [rawStart, rawEnd] = lines[timingIndex].split('-->', 2);
    const start = parseTimestamp(rawStart ?? '');
    const end = parseTimestamp(stripVttCueSetting(rawEnd ?? ''));
    if (start === undefined || end === undefined)
        return undefined;
    const text = lines
        .slice(timingIndex + 1)
        .join(' ')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!text)
        return undefined;
    return {
        id: `subtitle-${index + 1}`,
        text,
        start_at: start,
        end_at: Math.max(start, end)
    };
}
export function parseSubtitleText(input, format = 'auto') {
    const text = input.replace(/^\uFEFF/, '').trim();
    const withoutHeader = format === 'vtt' || (format === 'auto' && /^WEBVTT(?:\s|$)/i.test(text))
        ? text
            .replace(/^WEBVTT[^\n\r]*(?:\r?\n)+/i, '')
            .replace(/^(NOTE|STYLE|REGION)[\s\S]*?(?:\r?\n){2}/gim, '')
        : text;
    return withoutHeader
        .split(/\r?\n\s*\r?\n/)
        .map(parseCueBlock)
        .filter(Boolean);
}
