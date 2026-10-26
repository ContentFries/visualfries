---
title: 'CLI: program, check, still, render'
description: Reference for the VisualFries motion CLI. Resolve a whole program with program and transcript cues with clips, test every block or segment in seconds with check, review moments as a contact sheet with still, render a program as one video or its clips as inserts with render, and make mattes and beat grids.
updated: 2026-10-22
---

Four commands cover the life of a motion project: see where things land (`clips`, or `program` for a [program](/docs/programs)), check that blocks behave, look at moments, render. They accept `--transcript <file>` to work against a new voiceover; in a program, point `footage.<name>.transcript` at the new take's transcript instead.

## program

```bash
npx visualfries program reel.vf.json [--format <WxH>] [--excerpt <id>] [--json]
```

For a project with `cuts` or `shots`. Resolves the whole program (cuts, program words, shots, clips, transitions, audio pieces and segments), measures every audio edit point on the sound and saves the result as `.visualfries/program/<format>.json`. Prints one line per cut, shot, clip, transition, music item and segment, then every warning and error; exits with code 1 on errors. `--format` resolves another frame size of the same project; `--excerpt <id>` resolves the whole program and slices one of its `excerpts` (a teaser, see [Programs](/docs/programs)), saved as `.visualfries/program/<id>.<format>.json`; `--json` prints the whole resolved program, including its `events`. See [Programs](/docs/programs).

## clips

```bash
npx visualfries clips project.vf.json [--clip <id>] [--json]
```

Resolves every clip and cue against the transcript and prints program times, frames, cues with their words, bound words and every warning or error. Exits with code 1 when a clip has errors.

## check

```bash
npx visualfries check project.vf.json [--clip <id>]... [--determinism] [--export inserts] [--json]
npx visualfries check program.vf.json --format 1080x1920   # a program in another frame size
```

With music beats in the project, it first prints each music item's bar grid (bar, start, BPM, energy, first beats): a BPM column at twice the tempo you hear calls for `"tempo": "half"` on the music item. Then it mounts every block and runs it at every fifth frame and around each cue, without rendering video. Finds resolution errors, runtime errors (unknown cues, bad eases, `map()` going back in time) and CSS animations on wall-clock time. `--determinism` also captures about a dozen sampled frames forward and backward and fails when they differ. An unknown `--clip` id is an error. The 16 clips of the CF004 example check in about six seconds.

In a program, `check` first lists the program's warnings and errors, mixes the sound and prints its loudness, then checks every segment (a range between hard cuts) with every clip on screen in it; `--determinism` compares each segment forward, backward, scrambled and against a page holding the whole program. With a matte, it warns where a shot cuts the speaker's head and where a clip's text covers the face for half a second or more (the clip, its first time, the share of the face and the side of the frame clear of the head), where the speaker covers more than half of a text placed behind them, and where captions that start inside a shot move are drawn over the moving panel or the face until it lands (with the time the move ends); see [Shots and transitions](/docs/shots-and-transitions). It also warns where a clip's content does not fit the frame: a quarter or more of what reaches into the frame cut by its edge for a second, or an opaque full-frame card whose content is laid out like a frame of the other orientation (the bottom of a portrait frame or the right of a landscape one stays empty), the sign of a block laid out in fixed pixels for another size. Scrims, full-bleed pictures and short lists are not judged; tickers and other content that bleeds off the frame on purpose can warn. `--format WxH` checks the program in that frame size, as `render --format` draws it, and adds text outside that format's safe zone (the `--safe-*` insets). Every warning is a hint: look at a still at the time it names and decide; nothing moves on its own. `--export inserts` adds, as notes, every place where inserts would rely on the program render (cut and shot transitions, reframing shots, clips with audio).

## still

```bash
npx visualfries still project.vf.json --clip <id> [--at <moment>]... [--columns <n>] --output sheet.png
npx visualfries still program.vf.json [--clip <id>] [--at <moment>]... [--columns <n>] [--format <WxH>] --output sheet.png   # a program
```

Without `--at` it renders frame 0, frame 10, each cue plus 0.6 s and the last frame as one labelled contact sheet. With one `--at` it writes a single frame. Moments use the [clip moment grammar](/docs/clip-api): `extra`, `extra.end+0.3`, `2.5s`, `f120`, `mid`, `end`. In a program, `still` draws the whole program (footage and every clip on screen), `--clip` is optional and `--at` takes program moments (`2.5s`, `f120`, `end`); with `--clip`, the moments are that clip's. `--format WxH` draws the program in another frame size, as `render --format` does.

## render

```bash
npx visualfries render project.vf.json --output out/ [--clip <id>]... [--jobs <n>] [--keep-frames]
```

Renders clips to `out/<id>.mp4`, or `out/<id>.mov` (ProRes 4444) for `"alpha": true` clips, with `--jobs` pages capturing frames in parallel (default: up to six). Frames are piped to ffmpeg in order as they are captured, so memory stays flat however long the clip is; if the pipe fails, the clip is rendered again through PNG files in the temp directory. `--keep-frames` uses that path and keeps the files. With a single clip, `--output reel.mp4` (or `.mov`) writes that file directly and skips the manifest. The videos are silent unless the clip names a footage in `"audio"` ([Footage and mattes](/docs/footage)). Writes `out/manifest.json`; this is the real output for the Quickstart project:

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

### Rendering a program

```bash
npx visualfries render reel.vf.json --output out/ [--format <WxH>] [--excerpt <id>] [--jobs <n>] [--no-cache] [--stems]
npx visualfries render reel.vf.json --export inserts --output inserts/ [--handles <frames>] [--clip <id>]... [--jobs <n>]
```

With `cuts` or `shots`, `render` makes the whole program one video (`--export video`, the default there). `--output` is an `.mp4`, or a directory that gets `<project>[.<format>].mp4`; `--format 1920x1080` renders another frame size from the same project, and `--excerpt <id>` one of its excerpts as `<project>.<id>.mp4` (`check` and `still` take `--excerpt` too). The sound is mixed first (speech, effects and music, normalised to −14 LUFS and −1 dBTP; see [Program sound](/docs/program-sound)), then each segment is drawn or taken from the cache in `.visualfries/segments/`, and the segments are joined and encoded once. `--no-cache` draws every segment again; `--stems` also writes `<name>.speech.wav`, `<name>.sfx.wav` and `<name>.music.wav`. The resolved program is saved beside the video as `<name>.program.json`, and the result is printed as JSON.

`--export inserts` renders every clip of the program as its own frame-sized file instead, with `--handles` frames before and after (default 10), transparent unless the clip says `"alpha": false`, and `manifest.json` with the cut list under each insert. See [Inserts for an editor](/docs/programs#inserts-for-an-editor).

## cache

```bash
npx visualfries cache project.vf.json [--clear]
```

Prints the size of the project's `.visualfries/` cache: extracted footage frames and rendered program segments. `--clear` removes both; the next render extracts and draws what it needs again.

## matte

```bash
# BiRefNet v2 on fal.ai (default provider)
FAL_KEY=… npx visualfries matte talk.mp4 --output talk.matte.mp4 [--model Matting] [--resolution 1024x1024]

# RobustVideoMatting on the CPU: no key, needs uv and ffmpeg
npx visualfries matte talk.mp4 --output talk.matte.mp4 --provider rvm [--threads 8]

# any local tool: one run per piece, with placeholders
npx visualfries matte talk.mp4 --output talk.matte.mp4 \
  --command "python rvm.py --in {input} --out {output}" [--command-output luma|alpha] [--max-frames 900]
```

Makes a greyscale matte (white = subject) for a [footage](/docs/footage). VisualFries splits the video into pieces of `--chunk-frames` (default 480, at most the provider's limit; `--jobs` at once), hands each piece to the provider, checks that every mask has the piece's frame count (two missing frames are padded), scales it to the video and joins the pieces; the command fails unless the matte has exactly as many frames as the input.

| Provider        |                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fal` (default) | BiRefNet v2 on fal.ai, `FAL_KEY`, ≤512 frames per request. Models: `Matting` (keeps hair), `Portrait`, `General Use (Light)`, `General Use (Light 2K)`, `General Use (Heavy)`, `General Use (Dynamic)`.                                                                                                                                                                                                                                                    |
| `rvm`           | RobustVideoMatting (mobilenetv3) on the CPU, no key, temporally stable; about 3 fps at 1080p on 12 cores; `--threads` (default: the CPU count, at most 10). Needs `uv` and `ffmpeg` on the PATH: `uv` brings Python, torch, torchvision and numpy, and the first run downloads them, the model code (tag v1.0.0) and its weights from the project's GitHub release (SHA-256 checked), a few hundred MB cached in `$TORCH_HOME` (default `~/.cache/torch`). |
| `command`       | Your tool. Placeholders: `{input}`, `{output}` (paths, passed through environment variables so any character is safe), `{fps}`, `{width}`, `{height}`, `{frames}`. The tool writes greyscale with white = subject, or with `--command-output alpha` a video with transparency (ProRes 4444 `.mov` by default; `--command-ext .webm` for VP9 with alpha). A mask without an alpha channel is rejected.                                                      |

In Node, pass any object with `name`, `maxFrames` and `segment(piece)` as `provider` to `createSubjectMatte` from `visualfries/motion/matte` ([example](/docs/footage#make-a-matte)).

## beats

```bash
npx visualfries beats music.mp3 [--output music.beats.json] [--model final0|small0] [--threads 4]
npx visualfries beats music.mp3 --command "tool {input} {output}" [--analyzer-name n] [--analyzer-version v]
```

Analyses a music file once and writes `music.beats.json`: beats with bar and beat-in-bar, tempo, energy per beat and per bar, the analyzer's name and version, and the music file's SHA-256. Beat anchors, `check` and `render` only read that file; a changed music file is an error until it is analysed again. The default analyzer is beat_this, an optional install (`VISUALFRIES_BEAT_THIS` points to its executable). With `--command`, `{input}` is the decoded mono WAV and the tool writes `time [position-in-bar]` lines or JSON to `{output}`.

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
