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

Mounts every block and runs it at every fifth frame and around each cue, without rendering video. Finds resolution errors, runtime errors (unknown cues, bad eases, `map()` going back in time) and CSS animations on wall-clock time. `--determinism` also captures about a dozen sampled frames forward and backward and fails when they differ. An unknown `--clip` id is an error. The 16 clips of the CF004 example check in about six seconds.

## still

```bash
npx visualfries still project.vf.json --clip <id> [--at <moment>]... [--columns <n>] --output sheet.png
```

Without `--at` it renders frame 0, frame 10, each cue plus 0.6 s and the last frame as one labelled contact sheet. With one `--at` it writes a single frame. Moments use the [clip moment grammar](/docs/clip-api): `extra`, `extra.end+0.3`, `2.5s`, `f120`, `mid`, `end`.

## render

```bash
npx visualfries render project.vf.json --output out/ [--clip <id>]... [--jobs <n>] [--keep-frames]
```

Renders clips to `out/<id>.mp4`, or `out/<id>.mov` (ProRes 4444) for `"alpha": true` clips, splitting each clip into `--jobs` parallel ranges (default: up to six). The videos are silent unless the clip names a footage in `"audio"` ([Footage and mattes](/docs/footage)). Writes `out/manifest.json`; this is the real output for the Quickstart project:

```json
{
	"fps": 30,
	"size": [1080, 1350],
	"transcript": "25556a1eb505",
	"clips": [
		{
			"id": "quote",
			"file": "/home/me/quote/out/quote.mp4",
			"frames": 189,
			"programStartFrame": 0,
			"programStart": 0,
			"programEnd": 6.3,
			"alpha": false,
			"mode": "html-in-canvas",
			"seconds": 2.946,
			"transcript": "25556a1eb505"
		}
	]
}
```

| Field                                             | Meaning                                                                          |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `file`                                            | Absolute path of the rendered video.                                             |
| `programStartFrame`, `programStart`, `programEnd` | Where the clip belongs on the program timeline (frame, seconds).                 |
| `mode`                                            | Capture mode used: `html-in-canvas` or `dom`.                                    |
| `seconds`                                         | Wall-clock render time.                                                          |
| `transcript`                                      | Hash of the transcript the clip was timed against (`null` without a transcript). |
| `stale`                                           | Present and `true` on kept entries timed against another transcript.             |

A render refuses to start when any requested clip has errors, and verifies that every frame was written before encoding.

## matte

```bash
# BiRefNet v2 on fal.ai (default provider)
FAL_KEY=… npx visualfries matte talk.mp4 --output talk.matte.mp4 [--model Matting] [--resolution 1024x1024]

# any local tool: one run per piece, with placeholders
npx visualfries matte talk.mp4 --output talk.matte.mp4 \
  --command "python rvm.py --in {input} --out {output}" [--command-output luma|alpha] [--max-frames 900]
```

Makes a greyscale matte (white = subject) for a [footage](/docs/footage). VisualFries splits the video into pieces of `--chunk-frames` (default 480, at most the provider's limit; `--jobs` at once), hands each piece to the provider, checks that every mask has the piece's frame count (two missing frames are padded), scales it to the video and joins the pieces; the command fails unless the matte has exactly as many frames as the input.

| Provider        |                                                                                                                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fal` (default) | BiRefNet v2 on fal.ai, `FAL_KEY`, ≤512 frames per request. Models: `Matting` (keeps hair), `Portrait`, `General Use (Light)`, `General Use (Light 2K)`, `General Use (Heavy)`, `General Use (Dynamic)`.                                        |
| `command`       | Your tool. Placeholders: `{input}`, `{output}` (quoted paths), `{fps}`, `{width}`, `{height}`, `{frames}`. The tool writes greyscale with white = subject, or with `--command-output alpha` a video with transparency (ProRes 4444, VP9 WebM). |

In Node, pass any object with `name`, `maxFrames` and `segment(piece)` as `provider` to `createSubjectMatte` from `visualfries/motion/matte` ([example](/docs/footage#make-a-matte)).

## Node API

```ts
import { loadMotionProject, checkMotionProject, renderMotionClips } from 'visualfries/motion/node';

const project = await loadMotionProject('quote.vf.json', { transcript: 'retake.json' });
const report = await checkMotionProject(project, { determinism: true });
const clips = await renderMotionClips(project, { output: 'out', jobs: 6 });
```

The CLI is a thin layer over these functions; `renderStills` and `composeSheet` produce contact sheets. `project.resolved` holds every resolved clip, cue and diagnostic.

## Scene commands

The same `visualfries` command also works on scene JSON: `validate`, `inspect`, `qa`, `explain`, `render`, `caption-scene` and more. See [Scene CLI and captions](/docs/scene-cli).
