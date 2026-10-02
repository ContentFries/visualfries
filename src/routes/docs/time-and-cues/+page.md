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
	"from": "all it needs is",
	"until": "cut from the video",
	"tail": 0.5
}
```

`from` starts the clip on the first word of its phrase. `until` ends it when the last word of its phrase ends, plus `tail`. Both snap to whole frames. `from` is searched in the **whole transcript**; `until` is searched from `from` onward. Use two or three words for both; a one-word range anchor produces a warning.

## Naming moments

```json
"cues": {
  "stamps": "timestamps",
  "extra": "extra",
  "duplicate": { "say": "words that are duplicated", "edge": "last" },
  "settle": 4.2
}
```

A cue phrase is searched **inside the clip**: its first word must start within the clip's time range, both ends inclusive. That range is the wider of the anchor times and the frame-rounded clip, and it includes `tail`. The rest of the phrase may run past the end. When the clip start is rounded to a later frame, a cue can land a few milliseconds before zero; it stays negative, so an animation from that cue is already slightly under way on the first frame. `edge` picks the moment: `start` (default), `last` (when the last word starts) or `end`. `occurrence` picks the n-th match inside the clip. `offset` shifts the cue's start in seconds; its end stays at the end of the phrase. Numbers and `{ "frame": n }` are clip-local. `start` and `end` are built in and cannot be redefined. A cue outside the rendered frames is a warning, not an error.

A block then writes `clip.p('extra')`, `clip.after('duplicate')` or `clip.has('duplicate', word)`; the cue also carries its words.

## Nothing is matched silently

A phrase that does not exist fails and suggests the closest spoken words:

```text
ERROR B-word-timestamps cues.extra: Phrase "extra" not found inside the clip.
Did you mean "spare" at 59.80s (words@59.08 that@59.40 spare@59.80 and@60.45)?
```

A phrase said twice lists both occurrences and asks you to choose:

```text
Phrase "small" is ambiguous: #1 at 79.09s (…); #2 at 83.61s (…).
Use a longer phrase or { "say": "small", "occurrence": n }.
```

Matching ignores case and punctuation, and keeps diacritics.

## See the result

```bash
npx visualfries clips cf004.vf.json --clip B-word-timestamps
```

```text
B-word-timestamps  48.967–64.967s  frame 1469  480 frames  blocks/WordStamps.svelte
  cue stamps         3.98s "timestamps"
  cue extra          9.20s "extra"
  cue duplicate      10.10s "words that are duplicated"
  words row          9 words: words that are extra and words that are duplicated
```

Add `--json` for the full resolved clip, including every bound word with its times.
