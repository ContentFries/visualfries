const EDGE_PUNCTUATION = /^[\s"'„“”‚‘’«»(\[{¿¡]+|[\s"'„“”‚‘’«»)\]}.,;:!?…]+$/gu;
export function displayText(raw) {
    return raw.replace(EDGE_PUNCTUATION, '');
}
export function normalizeToken(raw) {
    return displayText(raw).normalize('NFC').toLocaleLowerCase('sk');
}
/** Accepts Soniox-style `{ words: [{ text, startMs, endMs }] }` or `[{ text|word, start, end }]` in seconds. */
export function parseTranscriptWords(input) {
    const list = Array.isArray(input)
        ? input
        : Array.isArray(input?.words)
            ? input.words
            : [];
    if (!list.length)
        throw new Error('Transcript has no words (expected { words: [...] } or an array of words).');
    return list.map((w, index) => {
        const raw = String(w.text ?? w.word ?? '');
        const start = w.startMs !== undefined ? w.startMs / 1000 : Number(w.start);
        const end = w.endMs !== undefined ? w.endMs / 1000 : Number(w.end);
        if (!Number.isFinite(start) || !Number.isFinite(end)) {
            throw new Error(`Transcript word ${index} ("${raw}") has no valid start/end.`);
        }
        return { id: `w${index}`, index, text: displayText(raw), raw, start, end };
    });
}
/** All occurrences of `phrase` whose first word starts within [from, to] (program seconds). */
export function findPhrase(words, phrase, from = -Infinity, to = Infinity) {
    const tokens = phrase.split(/\s+/).map(normalizeToken).filter(Boolean);
    if (!tokens.length)
        return [];
    const matches = [];
    for (let i = 0; i + tokens.length <= words.length; i++) {
        if (words[i].start < from || words[i].start > to)
            continue;
        let ok = true;
        for (let k = 0; k < tokens.length && ok; k++)
            ok = normalizeToken(words[i + k].raw) === tokens[k];
        if (ok) {
            const hit = words.slice(i, i + tokens.length);
            matches.push({ words: hit, start: hit[0].start, end: hit[hit.length - 1].end });
        }
    }
    return matches;
}
export function describeWords(words, around, span = 4) {
    const i = words.findIndex((w) => w.start >= around);
    const at = i < 0 ? words.length - 1 : i;
    return words
        .slice(Math.max(0, at - span), at + span)
        .map((w) => `${w.text}@${w.start.toFixed(2)}`)
        .join(' ');
}
