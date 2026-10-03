---
title: Captions
description: Word-timed captions in VisualFries motion projects. The built-in Captions component and @visualfries/captions block with five presets (bold, karaoke, pill, punch, neon), emphasis words, line breaking and styling.
updated: 2026-10-03
---

Captions come from the transcript, so the highlighted word is the word being said on that frame. VisualFries ships them as a component you drop into any block and as a block you can use without writing code.

## As a block

```json
{
	"id": "captions",
	"block": "@visualfries/captions",
	"from": 0,
	"until": 17,
	"audio": "talk",
	"words": { "captions": "clip" },
	"props": { "footage": "talk", "preset": "pill", "emphasis": ["free", "never"] }
}
```

With `footage`, the block draws the video underneath; without it, the captions sit on the clip background (use `"alpha": true` for a transparent ProRes overlay for your editor).

## In your own block

```svelte
<script>
	import { Captions, useClip } from 'visualfries/motion';
	const clip = useClip();
</script>

<Captions words={clip.words.captions} preset="bold" y={0.8} accent="#ffe100" />
```

`words` is any word selection of the clip; bind one with `"words": { "captions": "clip" }` in the project file.

## Presets

| Preset    | Look                                                                    |
| --------- | ----------------------------------------------------------------------- |
| `bold`    | Heavy uppercase with an outline; the spoken word jumps and turns accent |
| `karaoke` | Sentence case; a fill sweeps through each word as it is said            |
| `pill`    | The spoken word sits on an accent pill that pops in                     |
| `punch`   | One word at a time, huge, slammed in                                    |
| `neon`    | Glowing type; spoken words light up                                     |

## Props

| Prop                   | Default          | Meaning                                                                         |
| ---------------------- | ---------------- | ------------------------------------------------------------------------------- |
| `words`                |                  | The words to caption.                                                           |
| `preset`               | `bold`           | See above.                                                                      |
| `y`                    | `0.75`           | Vertical centre of the lines, 0–1 of the clip height.                           |
| `width`                | `0.86`           | Line width, 0–1 of the clip width.                                              |
| `size`                 | by preset        | Font size in px.                                                                |
| `font`, `weight`       | Inter, 800–900   | Any font declared in the project's `fonts`.                                     |
| `color`, `accent`      | white, `#fbc42d` | Text and highlight colours.                                                     |
| `maxWords`, `maxChars` | 3 (punch 1), 18  | When a caption breaks. It also breaks after punctuation and pauses over 0.45 s. |
| `emphasis`             | `[]`             | Words that always take the accent and grow.                                     |
| `uppercase`            | by preset        |                                                                                 |
| `hold`                 | `0.5`            | Seconds a caption stays after its last word when nobody speaks.                 |

Captions follow the [determinism rules](/docs/determinism): every style is a function of clip time, so stills and renders match.
