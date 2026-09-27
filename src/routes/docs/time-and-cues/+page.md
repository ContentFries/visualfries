---
title: Time and cues
description: How VisualFries places motion clips by what is said. from and until anchor clips to transcript phrases, cues name moments inside a clip, and missing or ambiguous phrases are errors with suggestions.
updated: 2026-09-27
---

In a motion project a clip is placed by **what is said**, not by typed seconds. `from` and `until` anchor it to spoken phrases, `cues` name moments inside it, and blocks read those moments as time. When the voiceover changes, a new transcript moves everything.

## Placing a clip

```json
{
	"id": "B-word-timestamps",
	"from": "jediné čo potrebuje",
	"until": "videa vyhodiť",
	"tail": 0.5
}
```

`from` starts the clip on the first word of its phrase. `until` ends it when the last word of its phrase ends, plus `tail`. Both snap to whole frames. `from` is searched in the **whole transcript**; `until` is searched from `from` onward. Use two or three words for both; a one-word range anchor produces a warning.

## Naming moments

```json
"cues": {
  "stamps": "časové",
  "extra": "naviac",
  "duplicate": { "say": "ktoré sú duplicitné", "edge": "last" },
  "settle": 4.2
}
```

A cue phrase is searched **inside the clip**: its first word must start within the clip, the rest may run past the end. `edge` picks the moment: `start` (default), `last` (when the last word starts) or `end`. `occurrence` picks the n-th match inside the clip. `offset` shifts the cue's start in seconds; its end stays at the end of the phrase. Numbers and `{ "frame": n }` are clip-local. `start` and `end` are built in and cannot be redefined. A cue outside the rendered frames is a warning, not an error.

A block then writes `clip.p('extra')`, `clip.after('duplicate')` or `clip.has('duplicate', word)`; the cue also carries its words.

## Nothing is matched silently

A phrase that does not exist fails and suggests the closest spoken words:

```text
ERROR B-word-timestamps cues.extra: Phrase "naviac" not found inside the clip.
Did you mean "navyše" at 59.80s (ktoré@59.08 sú@59.40 navyše@59.80 ktoré@60.45)?
```

A phrase said twice lists both occurrences and asks you to choose:

```text
Phrase "malá" is ambiguous: #1 at 79.09s (…); #2 at 83.61s (…).
Use a longer phrase or { "say": "malá", "occurrence": n }.
```

Matching ignores case and punctuation, and keeps diacritics.

## See the result

```bash
npx visualfries clips cf004.vf.json --clip B-word-timestamps
```

```text
B-word-timestamps  48.967–64.967s  frame 1469  480 frames  blocks/WordStamps.svelte
  cue stamps         3.98s "časové"
  cue extra          9.20s "naviac"
  cue duplicate      10.10s "ktoré sú duplicitné"
  words row          6 words: ktoré sú naviac ktoré sú duplicitné
```

Add `--json` for the full resolved clip, including every bound word with its times.
