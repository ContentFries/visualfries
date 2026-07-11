---
name: visualfries
description: Create and validate VisualFries scene JSON, caption videos from transcripts, prepare agent-friendly video overlays, and hand off render-ready scenes without opening the ContentFries UI.
---

# VisualFries

VisualFries is a JSON-first Svelte/Pixi/GSAP video scene engine. For agents, treat `scene.json` as the source of truth.

Use this skill when the user asks to:

- add captions/subtitles to a video without ContentFries UI
- build a VisualFries scene from assets and a transcript
- create reusable overlays, text effects, b-roll layouts, or short-form scene JSON
- validate or inspect VisualFries scene JSON before sending it to a renderer

## Mental Model

HyperFrames uses HTML files. VisualFries uses typed scene JSON:

```text
scene
  settings
  assets
  layers
    components
      VIDEO / IMAGE / TEXT / SHAPE / AUDIO / SUBTITLES
```

Agent rule:

```text
video/transcript/assets -> scene.json -> validate -> inspect -> render
```

Do not require the user to open ContentFries UI for captioning or scene creation.

For authored short-form edits with named beats, exact multi-track audio, source trims, freeze holds, proof cards, and timeline QA, use a production plan instead of raw component JSON:

```bash
visualfries produce ./production-plan.json \
  --scene-output ./scene.json \
  --generated-assets ./generated \
  --qa-output ./qa \
  --output ./final.mp4
```

`produce` is the preferred path for HyperFrames-class edits. It compiles editable plan text into deterministic SVG overlays, extracts freeze frames, segments rendering at timeline event boundaries, mixes audio, writes exact QA frames, and enforces the declared leading-silence limit.

## First Commands

From a project with `visualfries` installed:

```bash
visualfries --help
visualfries doctor --json
visualfries catalog --json
visualfries validate-cues ./cues.json --duration 45 --json
visualfries validate scene.json
visualfries inspect scene.json --json
```

Create a caption scene:

```bash
visualfries compose \
  --video ./input.mp4 \
  --transcript ./captions.srt \
  --cue-preset hidden-engine-dynamic \
  --cues ./cues.json \
  --scene-output ./scene.json \
  --qa-output ./qa/frames \
  --output ./out.mp4
```

Or step-by-step:

```bash
visualfries init ./video-package \
  --video ./input.mp4 \
  --transcript ./captions.srt \
  --preset hidden-engine-center \
  --cue-preset hidden-engine-dynamic

visualfries caption-scene \
  --video ./input.mp4 \
  --transcript ./captions.srt \
  --preset hidden-engine-center \
  --output ./scene.json

visualfries preset-cues \
  --duration 45 \
  --preset hidden-engine-dynamic \
  --output ./cues.json

visualfries apply-cues ./scene.json \
  --cues ./cues.json \
  --output ./scene.with-cues.json
```

Then:

```bash
visualfries validate ./scene.json
visualfries inspect ./scene.json --json
visualfries qa ./scene.json --output ./qa
visualfries render ./scene.json --output ./qa-frames --frames-only --to-frame 3
visualfries render ./scene.json --render-mode preview --output ./preview.mp4
```

Important: browser media rendering is preview/QA only for scenes with `VIDEO` or `GIF` components. Final VIDEO/GIF output uses the local deterministic renderer path, which predecodes active media ranges into exact frame images before browser composition. Use `--render-mode preview` only for QA or rough checks.

For final contiguous MP4 renders after QA, prefer:

```bash
visualfries render ./scene.json --stream-encode --image-format jpg --output ./out.mp4
```

For static-heavy scenes after QA:

```bash
visualfries render ./scene.json --output ./out.mp4 --skip-duplicates
```

Contiguous renders use the browser-side `renderFrameRange()` path. Sparse QA screenshots still use direct sampled frame rendering.

Preferred full agent path:

```text
production plan -> produce   (authored edit)
compose                       (caption-first video)
```

Debug path:

```text
caption-scene -> preset-cues -> edit cues -> apply-cues -> qa -> render
```

## Caption Workflow

Inputs:

- video file or URL
- transcript JSON with one of:
  - `segments: [{ text, start, end, words }]`
  - `subtitles: [{ text, start_at, end_at, words }]`
  - `words: [{ text, start, end }]`
- or a plain subtitle file:
  - `.srt`
  - `.vtt`

Recommended presets:

- `hidden-engine-center` for Hidden Engine short videos with middle captions
- `reels-center` for default high-energy vertical captions
- `reels-lower` when the middle must stay clean
- `podcast-clean` for calmer interview clips

Caption constraints:

- Keep subtitles away from important faces, product UI, and proof overlays.
- For videos that will get ContentFries-style overlays, prefer center captions only if the overlay is top/bottom.
- Validate and inspect after generating the scene.

## Scene Rules

- All media components must reference assets with stable `assetId`.
- SUBTITLES must have `timingAnchor.assetId` matching `scene.settings.subtitles.data[assetId]`.
- Higher layer `order` renders above lower layers.
- Use `SceneShape` validation, never raw unvalidated JSON.
- For Node agents, prefer the agent-only subpath so Svelte/browser exports are not loaded:

```ts
import { createCaptionScene, inspectScene, normalizeTranscript } from 'visualfries/agent';
```

- Composer helpers are useful inside app/runtime code, but CLI and automation should stay on `visualfries/agent` unless they explicitly need full VisualFries UI/runtime exports.

## Overlay Workflow

For Hidden Engine / short-form reaction overlays, use cue files or timed overlay helpers instead of hand-building TEXT components:

```json
{
	"broll": [
		{ "url": "./assets/profile-scroll.mp4", "start": 2, "end": 5, "type": "VIDEO" },
		{ "url": "./assets/chart.png", "start": 5, "end": 7, "type": "IMAGE", "motion": "slow-zoom-in" }
	],
	"overlays": [
		{ "text": "LOVE THIS 😍", "start": 0.4, "end": 1.1, "style": "hook-punch" },
		{ "text": "NECK 🤯", "start": 1.1, "end": 1.7, "style": "shock-word" }
	],
	"transitions": [
		{ "time": 2, "style": "dip-to-black" },
		{ "time": 5, "style": "swipe-left", "color": "#04483D" }
	]
}
```

Apply it:

```bash
visualfries apply-cues ./scene.json --cues ./cues.json --output ./scene.with-cues.json
```

Relative b-roll URLs resolve relative to the cue file.

If the agent is starting from scratch, create a cue skeleton first:

```bash
visualfries preset-cues --duration 45 --preset hidden-engine-dynamic --output ./cues.json
```

Starter presets:

- `hidden-engine-dynamic`: 40-60s story-driven shorts with hook/proof/mechanism/choice/CTA overlay beats.
- `captioned-clean`: caption-first videos with minimal transitions.

For Node automations:

```ts
import {
	addAgentBrollSequence,
	addAgentTextOverlays,
	addAgentTransitions
} from 'visualfries/agent';

const sceneWithOverlays = addAgentTextOverlays({
	scene,
	overlays: [
		{ text: 'LOVE THIS 😍', start: 0.4, end: 1.1, style: 'pop-label' },
		{ text: 'NECK 🤯', start: 1.1, end: 1.7, style: 'shock-word' }
	]
});

const sceneWithBroll = addAgentBrollSequence({
	scene,
	cues: [
		{ url: './broll/profile.mp4', start: 2.0, end: 5.0, type: 'VIDEO' },
		{ url: './broll/chart.png', start: 5.0, end: 7.0, type: 'IMAGE', motion: 'slow-zoom-in' }
	]
});

const sceneWithTransitions = addAgentTransitions({
	scene,
	transitions: [
		{ time: 2.0, style: 'dip-to-black' },
		{ time: 5.0, style: 'swipe-left', color: '#04483D' }
	]
});
```

Available initial styles:

- `pop-label`: reaction label with fast pop animation.
- `shock-word`: large high-emphasis keyword reveal.
- `soft-card`: calmer context/proof card.
- `hook-punch`: loud yellow hook label for the first second.
- `proof-pill`: compact proof/credibility pill.
- `metric-badge`: big number/proof badge.
- `danger-crossout`: wrong-path or negative-beat callout.
- `cta-card`: final question/choice card.

Rules:

- One overlay idea per beat.
- Prefer 0.4-1.4 second overlay durations.
- Keep the caption lane clear. If captions sit in the middle, place overlays top/bottom or time them between caption-heavy beats.
- Render `--frames-only --to-frame 3` before encoding when a new overlay style or position is used.

For b-roll, use `addAgentBrollSequence` instead of manually creating media layers. It defaults to layer order `5`, which keeps it below captions and overlays.

B-roll image cues default to subtle `slow-zoom-in`. Available motion values: `none`, `slow-zoom-in`, `slow-zoom-out`, `drift-up`.

For transitions, use `addAgentTransitions` instead of manually creating SHAPE covers. It defaults to layer order `95`, so short transition covers can hide hard cuts. Available styles: `dip-to-black`, `flash`, `swipe-left`, `swipe-up`, `focus-pull`.

## Render Workflow

Use `visualfries render` after validation:

```bash
visualfries render scene.json --output out.mp4
```

For fast QA:

```bash
visualfries doctor --json
visualfries qa scene.json --output ./qa
visualfries render scene.json --output ./qa-frames --frames-only --to-frame 3
```

Renderer requirements:

- `ffmpeg` must be available on `PATH` for MP4 output.
- `vite`, `@sveltejs/vite-plugin-svelte`, and `playwright` must be resolvable. In agent environments, set `VISUALFRIES_NODE_MODULES=/path/to/node_modules` when Playwright is provided by a shared runtime.
- Local media files are copied into a temporary render root and served over the local Vite server so browser rendering does not depend on `file://` access.
- Audio is mapped from the first local VIDEO asset by default. Use `--audio none` for silent output or `--audio ./voiceover.wav` to override.

Run `visualfries doctor --json` before the first render in a new agent environment. It checks ffmpeg, Vite, Svelte Vite plugin, Playwright, Chromium executable resolution, and the temp directory.

Run `visualfries catalog --json` when an agent needs valid values for caption presets, cue presets, overlay styles, b-roll motions, transitions, transcript formats, or supported CLI commands.

Run `visualfries validate-cues ./cues.json --duration <seconds> --json` before applying hand-edited cues. It catches unknown overlay styles, b-roll motions, transition styles, invalid time ranges, and cues outside the scene duration.

Use `visualfries qa scene.json --output ./qa` as the normal agent quality gate. It writes `inspect.json`, `screenshots.json`, and sampled `frames/` into one QA directory.

## Agent Output Contract

For any generated VisualFries video package, produce:

```text
scene.json
cues.json
assets/
qa/
  inspect.json
  frames/
out.mp4
notes.md
```

For caption-only work, `scene.json` plus `inspect.json` is acceptable only when the user explicitly does not need a rendered asset yet.

## Current Limitation

The CLI covers JSON creation, validation, inspection, production plans, automatic freeze holds, deterministic SVG overlays, exact audio tracks, timeline-segmented MP4 rendering, QA frames, captions, b-roll, transitions, cue files, and one-command compose/produce. The remaining gap versus HyperFrames is a larger branded pattern registry and higher-level reusable templates—not basic production rendering.
