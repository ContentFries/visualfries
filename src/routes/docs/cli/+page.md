---
title: 'CLI: clips, check, still, render'
description: Reference for the VisualFries motion CLI. Resolve transcript cues with clips, test every block in seconds with check, review moments as a contact sheet with still, and render MP4 or ProRes 4444 with render.
updated: 2026-09-27
---

Four commands cover the life of a motion project: see where things land, check that blocks behave, look at moments, render. All of them accept `--transcript <file>` to work against a new voiceover.

## clips

```bash
npx visualfries clips project.vf.json [--clip <id>] [--json]
```

Resolves every clip and cue against the transcript and prints program times, frames, cues with their words, bound words and every warning or error. Exits with code 1 when a clip has errors.

## check

```bash
npx visualfries check project.vf.json [--clip <id>]... [--determinism] [--json]
```

Mounts every block and runs it across the clip without rendering video. Finds resolution errors, runtime errors (unknown cues, bad eases, `map()` going back in time) and CSS animations on wall-clock time. `--determinism` also renders sampled frames forward and backward and fails when they differ. The 16 clips of the CF004 example check in about six seconds.

## still

```bash
npx visualfries still project.vf.json --clip <id> [--at <moment>]... [--columns <n>] --output sheet.png
```

Without `--at` it renders the start, each cue plus 0.6 s and the end as one labelled contact sheet. With one `--at` it writes a single frame. Moments use the [clip moment grammar](/docs/clip-api): `extra`, `extra.end+0.3`, `2.5s`, `f120`, `mid`, `end`.

## render

```bash
npx visualfries render project.vf.json --output out/ [--clip <id>]... [--jobs <n>] [--keep-frames]
```

Renders clips to `out/<id>.mp4`, or `out/<id>.mov` (ProRes 4444) for `"alpha": true` clips, splitting each clip into `--jobs` parallel ranges (default: up to six). Writes `out/manifest.json`:

```json
{
	"fps": 30,
	"size": [1920, 1080],
	"transcript": "c0284aeaddb3",
	"clips": [
		{
			"id": "B-word-timestamps",
			"file": "out/B-word-timestamps.mp4",
			"frames": 480,
			"programStartFrame": 1469,
			"alpha": false,
			"transcript": "c0284aeaddb3"
		}
	]
}
```

A render refuses to start when any requested clip has errors, and verifies that every frame was written before encoding.

## Scene commands

The same `visualfries` command also works on scene JSON: `validate`, `inspect`, `qa`, `explain`, `render`, `caption-scene` and more. See [Scene CLI and captions](/docs/scene-cli).
