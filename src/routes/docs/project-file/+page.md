---
title: The project file (.vf.json)
description: Reference for the VisualFries motion project file. Size, fps, transcript, fonts and styles at the top; clips with a block, a range anchored to spoken phrases, cues, word bindings and props.
updated: 2026-09-27
---

A motion project is one JSON file, usually named `<name>.vf.json`. It lists clips: which block plays, where in the program it starts and ends, which spoken words drive it, and what data it gets. Paths are relative to the project file.

## Top level

```json
{
	"size": [1920, 1080],
	"fps": 30,
	"transcript": "voice.transcript.json",
	"fonts": [{ "family": "Futura", "src": "fonts/Jost.ttf", "weight": "100 900" }],
	"styles": ["theme/film.css"],
	"background": "#17120e",
	"clips": []
}
```

| Field        | Type              | Meaning                                                                                       |
| ------------ | ----------------- | --------------------------------------------------------------------------------------------- |
| `size`       | `[width, height]` | Output size in pixels.                                                                        |
| `fps`        | number            | Frames per second.                                                                            |
| `transcript` | path              | Word-level transcript of the voiceover. Required when anything is anchored to a phrase.       |
| `fonts`      | list              | Font files loaded before any block mounts. A variable font declares its range as `"100 900"`. |
| `styles`     | list              | Global CSS files (themes, shared classes). Relative `url()` references keep working.          |
| `background` | CSS color         | Default background of every clip.                                                             |
| `clips`      | list              | The clips, described below.                                                                   |

Ship fonts with the project. A render must never depend on what happens to be installed on the machine.

## A clip

```json
{
	"id": "B-word-timestamps",
	"block": "blocks/WordStamps.svelte",
	"from": { "say": "jediné", "offset": -0.023 },
	"until": "videa vyhodiť",
	"tail": 0.5,
	"cues": {
		"stamps": "časové",
		"extra": "naviac",
		"duplicate": { "say": "ktoré sú duplicitné", "edge": "last" }
	},
	"words": { "row": "ktoré sú naviac ktoré sú duplicitné" },
	"props": { "title": "Transcript by words" },
	"alpha": false
}
```

| Field           | Meaning                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `id`            | Letters, digits, `.`, `-`, `_`. Used by the CLI and in `manifest.json`. |
| `block`         | Path to the Svelte component that draws the clip.                       |
| `from`, `until` | Where the clip sits in the program. See anchors below.                  |
| `tail`          | Seconds added after `until` (negative trims).                           |
| `cues`          | Named moments inside the clip. `start` and `end` are built in.          |
| `words`         | Transcript words handed to the block.                                   |
| `props`         | Any data for the block, read as `clip.props`.                           |
| `alpha`         | Render with a transparent background as ProRes 4444 `.mov`.             |
| `background`    | Per-clip background color.                                              |

## Anchors

`from`, `until` and every cue accept the same forms:

| Form                | Example                                                               | Meaning                                                               |
| ------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Phrase              | `"matched silently"`                                                  | The first word of the phrase (for `until`: the end of its last word). |
| Phrase with options | `{ "say": "naviac", "edge": "end", "occurrence": 2, "offset": -0.1 }` | `edge` is `start`, `last` (when the last word starts) or `end`.       |
| Seconds             | `12.5`                                                                | Program seconds for `from`/`until`; clip seconds for cues.            |
| Frame               | `{ "frame": 274 }`                                                    | Program frame for `from`/`until`; clip frame for cues.                |

Cue phrases are searched only inside the clip, so a common word can be a cue as long as it is said once in that clip. Clip ranges are searched in the whole transcript; use two or three words for them. The full rules, including what happens when a phrase is missing or appears twice, are in [Time and cues](/docs/time-and-cues).

## Word bindings

```json
"words": {
  "row": "ktoré sú naviac ktoré sú duplicitné",
  "all": "clip",
  "boxes": { "from": "časového", "until": "slová" }
}
```

A binding is a phrase, `"clip"` for every word spoken during the clip, or a `from`/`until` range. Each word arrives with an `id`, the display `text`, the transcribed `raw` text, program `start`/`end` and clip-local `localStart`/`localEnd`. See [The clip object](/docs/clip-api).
