# VisualFries Agent Workflow

This document defines the agent-facing contract for VisualFries.

Read [Authoring Best Practices](AUTHORING_BEST_PRACTICES.md) before authoring. It defines the
native semantic component policy, runtime support matrix, effect/compositing limits, and required
entry/settled/exit/reseek frame QA. Validation and inspection are structural gates, not rendering
proof.

## Goal

Make VisualFries usable by agents without requiring the ContentFries UI:

1. create render-ready scene JSON,
2. add captions from transcripts,
3. validate and inspect scenes,
4. render fast QA previews through the CLI browser adapter,
5. hand final VIDEO/GIF scenes to the local deterministic renderer path.

## CLI

```bash
visualfries validate <scene.json> [--json]
visualfries inspect <scene.json> [--json] [--screenshots --output <dir>]
visualfries init <dir> [--video <video> --transcript <file>]
visualfries caption-scene --video <video> --transcript <file> --output <scene.json>
visualfries preset-cues --duration <seconds> --output <cues.json>
visualfries validate-cues <cues.json> [--duration <seconds>] [--json]
visualfries apply-cues <scene.json> --cues <cues.json> --output <scene.json>
visualfries qa <scene.json> --output <dir>
visualfries compose --video <video> --transcript <file> --output <out.mp4>
visualfries produce <production-plan.json> --output <out.mp4> --scene-output <scene.json> --qa-output <dir>
visualfries render <scene.json> --output <out.mp4|frames-dir> [--frames-only]
visualfries catalog [--json]
visualfries doctor [--json]
```

Use `produce` for authored edits that need more than captions plus generic cues. A production plan groups the edit into named beats and supports source trims, automatic video freeze-frame holds, native TEXT editorial overlays, exact multi-track audio, transitions, and QA frames. Visible typography compiles to native TEXT by default. `renderAs: "SVG"` is an explicit compatibility fallback for a documented native limitation. The command emits ordinary VisualFries scene JSON, renders at timeline event boundaries, then checks the finished audio lead-in.

```json
{
	"version": 1,
	"id": "proof-hook",
	"settings": { "width": 1080, "height": 1920, "duration": 6, "fps": 30 },
	"beats": [
		{
			"id": "reaction",
			"start": 0,
			"end": 3,
			"media": [
				{ "id": "reaction", "url": "./reaction.mp4", "start": 0, "end": 3, "freezeAt": 1.8 }
			],
			"overlays": [{ "text": "NOT DEAD.", "start": 1.8, "end": 3, "style": "verdict-slam" }]
		}
	],
	"audio": [{ "id": "voice", "url": "./voice.wav", "startAt": 0, "volume": 1 }],
	"transitions": [{ "time": 3, "style": "focus-pull" }],
	"qa": { "framesAt": [0.1, 1.9, 3.1], "maxLeadingSilence": 0.1, "requiredText": ["NOT DEAD."] }
}
```

```bash
visualfries produce ./production-plan.json \
  --scene-output ./scene.json \
  --qa-output ./qa \
  --output ./final.mp4
```

`render` uses a controlled Vite browser page, Playwright, and `ffmpeg` for static scenes and fast previews. It never requires opening ContentFries UI.

Important render contract:

- `--render-mode final` is the default.
- Final scenes with `VIDEO` or `GIF` components require the local deterministic renderer. Native browser media seek is not trusted for final output because it can create stale, duplicated, or shifted frames.
- Use `--render-mode preview` for quick QA frames or rough local checks.
- `--allow-browser-media-final` exists only as an escape hatch for experiments. Do not use it for shipped output.
- In final mode, the CLI predecodes active `VIDEO`/`GIF` ranges to exact frame images and injects a deterministic media provider into the render page.

Useful render options:

- `--frames-only` renders a PNG frame sequence for QA instead of MP4.
- `--render-mode preview` permits the browser preview path for VIDEO/GIF scenes.
- `--engine browser-preview` or `--engine deterministic-local` can force renderer planning when debugging.
- `--from-frame <n>` and `--to-frame <n>` render a partial range for fast checks.
- Full contiguous renders use the browser-side `renderFrameRange()` path, avoiding one Playwright round trip per frame.
- `--stream-encode` pipes rendered frames directly into local `ffmpeg` with `image2pipe`. Prefer it for final contiguous MP4 renders once QA frames look right.
- `--skip-duplicates` asks VisualFries deterministic dirty checking to reuse unchanged frames when possible.
- `--fps <number>` overrides scene FPS.
- `--audio <path|none>` overrides automatic audio mapping from the local scene audio mix.
- Without `--audio`, final contiguous renders build a local mixed audio track from active VIDEO/AUDIO components, `audioTracks`, and `settings.audio`.
- `VISUALFRIES_NODE_MODULES=/path/to/node_modules` lets agents point the CLI at an existing Playwright install.
- `doctor --json` checks ffmpeg, Vite, Svelte Vite plugin, Playwright, Chromium, and temp directory resolution before an agent starts a render.
- `catalog --json` lists supported caption presets, cue presets, overlay styles, b-roll motions, transitions, transcript formats, and CLI commands.
- `validate-cues --json` checks cue file shape, known styles/motions/transitions, and timing before an agent applies cues.
- `qa` writes `inspect.json`, `screenshots.json`, and sampled `frames/` into one QA directory.

Use `init` to create a self-contained agent working directory:

```bash
visualfries init ./video-package \
  --video ./input.mp4 \
  --transcript ./transcript.srt \
  --preset hidden-engine-center \
  --cue-preset hidden-engine-dynamic
```

It creates `scene.json`, `cues.json`, `assets/`, `qa/frames/`, `qa/inspect.json`, `notes.md`, and transcript examples. `cues.json` is generated from the selected cue preset and can be edited before compose/render.

Use `compose` when an agent should prepare the scene and, for now, produce a preview MP4 in one command:

```bash
visualfries compose \
  --video ./input.mp4 \
  --transcript ./transcript.srt \
  --cue-preset hidden-engine-dynamic \
  --cues ./cues.json \
  --scene-output ./scene.json \
  --qa-output ./qa/frames \
  --render-mode preview \
  --output ./out.mp4
```

`compose` runs the same underlying pipeline as the step-by-step workflow:

```text
caption-scene -> optional cue preset -> optional cue file -> inspect -> optional QA screenshots -> render
```

Use `apply-cues` when an agent has already planned the visual timeline:

```bash
visualfries preset-cues --duration 45 \
  --preset hidden-engine-dynamic \
  --output ./cues.json

visualfries apply-cues ./scene.json \
  --cues ./cues.json \
  --output ./scene.with-cues.json
```

Cue files can contain `broll`, `overlays`, and `transitions` arrays:

```json
{
	"broll": [
		{ "url": "./assets/profile.mp4", "start": 2, "end": 5, "type": "VIDEO" },
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

Relative b-roll URLs are resolved relative to the cue file path, so an agent package can keep cues and assets together.

`preset-cues` creates a valid starter cue file. It is not meant to replace creative judgment; agents should replace placeholder overlay text and add b-roll paths before the final render.

## Node API

Use the agent-only subpath for automations and CLIs:

```ts
import { createCaptionScene, inspectScene, normalizeTranscript } from 'visualfries/agent';
```

The root `visualfries` export includes the full library surface. Agents should use `visualfries/agent` for captioning and inspection because it avoids browser/Svelte runtime imports.

Renderer planning is also agent-safe:

```ts
import { resolveAgentRenderPlan, requiresDeterministicRender } from 'visualfries/agent';

const plan = resolveAgentRenderPlan(scene, { mode: 'final' });

if (requiresDeterministicRender(scene)) {
	// Final output needs local deterministic media predecode, not browser video seek.
}
```

For short-form overlays:

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

### `caption-scene`

Creates a vertical 9:16 scene with:

- full-frame video component,
- subtitle component,
- scene asset registry,
- `settings.subtitles.data` populated from transcript JSON.

Example:

```bash
visualfries caption-scene \
  --video ./input.mp4 \
  --transcript ./transcript.json \
  --preset hidden-engine-center \
  --output ./scene.json
```

Accepted transcript shapes:

Plain subtitle files:

```bash
visualfries caption-scene \
  --video ./input.mp4 \
  --transcript ./captions.srt \
  --preset hidden-engine-center \
  --output ./scene.json
```

Supported subtitle file formats:

- `.srt`
- `.vtt`

Structured JSON:

```json
{
	"segments": [
		{
			"text": "The best content asset is not always a post.",
			"start": 0,
			"end": 2.4,
			"words": [{ "text": "The", "start": 0, "end": 0.12 }]
		}
	]
}
```

```json
{
	"words": [
		{ "text": "The", "start": 0, "end": 0.12 },
		{ "text": "best", "start": 0.12, "end": 0.35 }
	]
}
```

## Presets

Initial caption presets:

- `reels-center`
- `reels-lower`
- `podcast-clean`
- `hidden-engine-center`

Initial agent overlay styles:

- `pop-label` for quick reaction labels above/below captions.
- `shock-word` for large emphatic keyword reveals.
- `soft-card` for calmer proof/context callouts.
- `hook-punch` for the first loud hook label.
- `proof-pill` for compact proof/credibility beats.
- `metric-badge` for big numbers and business proof.
- `danger-crossout` for wrong-path / negative beats.
- `cta-card` for final choice/question cards.

Initial agent b-roll helper:

- `addAgentBrollSequence` for timed portrait video/image/GIF cues below captions and overlays.
- Image cues default to subtle `slow-zoom-in`; use `motion: 'none' | 'slow-zoom-in' | 'slow-zoom-out' | 'drift-up'`.

Initial agent transition helper:

- `addAgentTransitions` for fast full-frame transition covers at exact beat times.
- Transition helper covers use animated native SHAPE rectangles.
- Supported styles: `dip-to-black`, `flash`, `swipe-left`, `swipe-up`.

Overlay rules:

- Keep the center caption lane free unless the overlay replaces captions for that moment.
- Use one overlay idea per beat. Split “LOVE THIS” and “NECK” into separate timed cues.
- Prefer 0.4-1.4 second overlay durations. Longer overlays start feeling like static slides.
- Render 1-3 QA frames before MP4 encode when a new overlay style is used.

See [AGENT_PATTERNS.md](AGENT_PATTERNS.md) for repeatable caption, overlay, b-roll, and QA patterns.

## Quality Gates

Before a scene is accepted:

```bash
visualfries validate scene.json
visualfries inspect scene.json --json
visualfries inspect scene.json --screenshots --samples 3 --output ./qa/frames --json
```

`inspect` checks schema validity, timeline bounds, missing assets, and subtitle data anchors. With `--screenshots`, it also renders sampled QA frames and returns their paths in the JSON report.

Before publishing a rendered video:

```bash
visualfries inspect scene.json --screenshots --samples 3 --output ./qa-frames --json
visualfries render scene.json --output ./out.mp4
ffprobe -v error -show_entries stream=codec_type,width,height -of json ./out.mp4
```

For static-heavy scenes, proof screenshots, and overlay sections, the faster render path is:

```bash
visualfries render scene.json --output ./out.mp4 --skip-duplicates
```

Do not use `--skip-duplicates` blindly on complex video-heavy scenes until QA frames look correct.

## Replacement Path For HyperFrames

VisualFries needs these layers to fully replace HyperFrames for agents:

1. CLI scene creation and validation. Done.
2. Caption scene generator. Done.
3. Renderer adapter: `visualfries render scene.json --output out.mp4`. Done for local browser + ffmpeg rendering.
4. Agent text overlay cues. Done for initial pop/shock/card styles.
5. Screenshot inspect: `visualfries inspect scene.json --screenshots`. Done.
6. Agent project scaffold: `visualfries init <dir>`. Done.
7. Pattern registry for transitions and b-roll layouts. Initial b-roll sequence helper, image motion, transition helper, and cookbook done.
8. Cue-file CLI application for b-roll/overlays/transitions. Done.
9. Starter cue presets: `visualfries preset-cues`. Done for `hidden-engine-dynamic` and `captioned-clean`.
10. One-command agent compose workflow: `visualfries compose`. Done.
11. Skill/cookbook examples for common agent jobs.

The current implementation supports caption-scene creation, validation, inspection, QA frame rendering, MP4 rendering, b-roll cues, text overlays, simple transition cues, cue-file application from the CLI, starter cue presets, and one-command compose. The next gap versus HyperFrames is a richer pattern registry for reusable short-form scene layouts and more branded overlay packs.
