export type MotionWord = {
	/** Stable id: index in the transcript, e.g. "w812". */
	id: string;
	index: number;
	/** Display text with punctuation stripped from the edges. */
	text: string;
	/** Text exactly as transcribed. */
	raw: string;
	/** Program seconds. */
	start: number;
	end: number;
};

type RawWord = {
	text?: string;
	word?: string;
	startMs?: number;
	endMs?: number;
	start?: number;
	end?: number;
};

const EDGE_PUNCTUATION = /^[\s"'„“”‚‘’«»(\[{¿¡]+|[\s"'„“”‚‘’«»)\]}.,;:!?…]+$/gu;

export function displayText(raw: string): string {
	return raw.replace(EDGE_PUNCTUATION, '');
}

export function normalizeToken(raw: string): string {
	return displayText(raw).normalize('NFC').toLocaleLowerCase('sk');
}

/** Accepts Soniox-style `{ words: [{ text, startMs, endMs }] }` or `[{ text|word, start, end }]` in seconds. */
export function parseTranscriptWords(input: unknown): MotionWord[] {
	const list: RawWord[] = Array.isArray(input)
		? input
		: Array.isArray((input as { words?: unknown })?.words)
			? (input as { words: RawWord[] }).words
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

export type PhraseMatch = { words: MotionWord[]; start: number; end: number };

/** All occurrences of `phrase` whose first word starts within [from, to] (program seconds). */
export function findPhrase(
	words: MotionWord[],
	phrase: string,
	from = -Infinity,
	to = Infinity
): PhraseMatch[] {
	const tokens = phrase.split(/\s+/).map(normalizeToken).filter(Boolean);
	if (!tokens.length) return [];
	const matches: PhraseMatch[] = [];
	for (let i = 0; i + tokens.length <= words.length; i++) {
		if (words[i].start < from || words[i].start > to) continue;
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

export function describeWords(words: MotionWord[], around: number, span = 4): string {
	const i = words.findIndex((w) => w.start >= around);
	const at = i < 0 ? words.length - 1 : i;
	return words
		.slice(Math.max(0, at - span), at + span)
		.map((w) => `${w.text}@${w.start.toFixed(2)}`)
		.join(' ');
}
