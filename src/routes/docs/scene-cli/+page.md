---
title: Scene CLI and captions
description: The VisualFries command line for scene JSON. Create captioned scenes from video and transcript, apply cue files, validate against runtime support, inspect frames, and render MP4.
updated: 2026-09-27
---

The `visualfries` command works on scene JSON as well as on motion projects. It covers the path from a video and a transcript to a captioned, checked render.

## Captioned video in one command

```bash
npx visualfries compose \
  --video ./input.mp4 \
  --transcript ./transcript.srt \
  --cue-preset hidden-engine-dynamic \
  --scene-output ./scene.json \
  --qa-output ./qa/frames \
  --output ./out.mp4
```

Or step by step:

```bash
npx visualfries caption-scene --video ./input.mp4 --transcript ./transcript.srt --preset reels-center --output ./scene.json
npx visualfries preset-cues --duration 45 --preset hidden-engine-dynamic --output ./cues.json
npx visualfries apply-cues ./scene.json --cues ./cues.json --output ./scene.with-cues.json
npx visualfries render ./scene.with-cues.json --output ./out.mp4
```

Transcripts can be JSON, SRT or VTT. Caption presets: `reels-center`, `reels-lower`, `podcast-clean`, `hidden-engine-center`.

## Check before rendering

| Command                                                    | What it does                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| `validate scene.json [--strict-runtime-support]`           | Schema validation; strict mode rejects fields the renderer does not draw. |
| `inspect scene.json [--json] [--screenshots --output dir]` | Structure report, optionally with frames.                                 |
| `explain scene.json --component <id> --frame <n>`          | The computed state of one component at one frame, from the real runtime.  |
| `qa scene.json --output dir`                               | Renders QA frames around authored events.                                 |
| `parity scene.json --output dir --frames 5,12,35`          | Compares preview and final render.                                        |
| `catalog [--component TYPE] [--capabilities]`              | Supported components, animations and effects.                             |
| `doctor`                                                   | Checks the render toolchain.                                              |

## Render

```bash
npx visualfries render ./scene.json --output ./out.mp4 [--skip-duplicates] [--frames-only]
```

`--skip-duplicates` speeds up static-heavy scenes; `--frames-only` writes frames for review without encoding.

## Node API

```ts
import {
	createCaptionScene,
	inspectScene,
	addAgentTextOverlays,
	addAgentBrollSequence,
	addAgentTransitions
} from 'visualfries/agent';
```
