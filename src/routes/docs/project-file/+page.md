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
	"clips": [ … ]
}
```

A fragment: a project needs at least one clip.

| Field        | Type              | Meaning                                                                                                              |
| ------------ | ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| `size`       | `[width, height]` | Required. Output size in pixels, positive integers.                                                                  |
| `fps`        | number            | Required. Frames per second, positive.                                                                               |
| `transcript` | path              | Word-level transcript of the voiceover. Required when anything is anchored to a phrase or when a clip binds `words`. |
| `fonts`      | list              | Font files loaded before any block mounts. A variable font declares its range as `"100 900"`.                        |
| `styles`     | list              | Global CSS files (themes, shared classes). Relative `url()` references keep working.                                 |
| `background` | CSS color         | Default background of every opaque clip.                                                                             |
| `clips`      | list              | Required, at least one. Described below.                                                                             |

Ship fonts with the project. A render must never depend on what happens to be installed on the machine.

## A clip

```json
{
	"id": "B-word-timestamps",
	"block": "blocks/WordStamps.svelte",
	"from": { "say": "all it needs", "offset": -0.023 },
	"until": "cut from the video",
	"tail": 0.5,
	"cues": {
		"stamps": "timestamps",
		"extra": "extra",
		"duplicate": { "say": "words that are duplicated", "edge": "last" }
	},
	"words": { "row": "words that are extra and words that are duplicated" },
	"props": { "title": "Transcript by words" },
	"alpha": false
}
```

| Field           | Meaning                                                                                            |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `id`            | Required and unique. Letters, digits, `.`, `-`, `_`. Used by the CLI and in `manifest.json`.       |
| `block`         | Required. Path to the Svelte component that draws the clip.                                        |
| `from`, `until` | Required. Where the clip sits in the program. See anchors below.                                   |
| `tail`          | Seconds added after `until` (negative trims).                                                      |
| `cues`          | Named moments inside the clip. Names are identifiers; `start` and `end` are built in and reserved. |
| `words`         | Transcript words handed to the block.                                                              |
| `props`         | Any data for the block, read as `clip.props`.                                                      |
| `alpha`         | Render with a transparent background as ProRes 4444 `.mov`; `background` is then ignored.          |
| `background`    | Per-clip background color for opaque clips.                                                        |

## Anchors

`from`, `until` and every cue accept the same forms:

| Form                | Example                                                               | Meaning                                                               |
| ------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Phrase              | `"matched silently"`                                                  | The first word of the phrase (for `until`: the end of its last word). |
| Phrase with options | `{ "say": "extra", "edge": "end", "occurrence": 2, "offset": -0.1 }` | `edge` is `start`, `last` (when the last word starts) or `end`.       |
| Seconds             | `12.5`                                                                | Program seconds for `from`/`until`; clip seconds for cues.            |
| Frame               | `{ "frame": 274 }`                                                    | Program frame for `from`/`until`; clip frame for cues.                |

`from` is searched in the whole transcript. `until` is searched from the clip's start onward, so its `occurrence` counts only matches after `from`. Cue phrases are searched inside the clip, so a common word can be a cue as long as it is said once there. Use two or three words for `from` and `until`. The full rules, including what happens when a phrase is missing or appears twice, are in [Time and cues](/docs/time-and-cues).

## Word bindings

```json
"words": {
  "row": "words that are extra and words that are duplicated",
  "all": "clip",
  "boxes": { "from": "every timestamp", "until": "the words" }
}
```

A binding is a phrase, `"clip"` for every word spoken during the clip, or a `from`/`until` range. Each word arrives with an `id`, the display `text`, the transcribed `raw` text, program `start`/`end` and clip-local `localStart`/`localEnd`. See [The clip object](/docs/clip-api).
