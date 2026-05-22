# VisualFries Agent Patterns

Reusable building blocks for agents that need short-form videos without writing raw scene JSON from scratch.

## New Agent Package

Use when starting a self-contained work folder:

```bash
visualfries init ./video-package \
  --video ./input.mp4 \
  --transcript ./transcript.srt \
  --preset hidden-engine-center \
  --cue-preset hidden-engine-dynamic
```

Generated structure:

```text
video-package/
  scene.json
  cues.json
  assets/
  qa/
    inspect.json
    frames/
  notes.md
  transcript.example.json
```

`cues.json` is generated from the selected cue preset and should be treated as the visual timeline map for the video.

## Captioned Video

Use when the base asset already contains the main story or voiceover.

Fastest preview path:

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

Use `compose` for routine agent previews. Use the step-by-step commands when debugging a scene. Final output for scenes with `VIDEO` or `GIF` components uses the local deterministic renderer path, which predecodes media into exact frame images before the browser compositor sees the scene. Browser media rendering is intentionally treated as preview-only.

```bash
visualfries caption-scene \
  --video ./input.mp4 \
  --transcript ./transcript.srt \
  --preset hidden-engine-center \
  --output ./scene.json
```

`--transcript` accepts JSON, SRT, or VTT. Prefer SRT/VTT when the agent already has timed subtitles from another tool.

Then QA:

```bash
visualfries inspect ./scene.json --screenshots --samples 3 --output ./qa/frames --json
```

## Cue File Application

Use when an agent has a timeline map and should not write custom JavaScript.

```bash
visualfries preset-cues --duration 45 \
  --preset hidden-engine-dynamic \
  --output ./cues.json

visualfries apply-cues ./scene.json \
  --cues ./cues.json \
  --output ./scene.with-cues.json
```

Cue file:

```json
{
  "broll": [
    { "url": "./assets/profile-scroll.mp4", "start": 2, "end": 5, "type": "VIDEO" }
  ],
  "overlays": [
    { "text": "LOVE THIS 😍", "start": 0.4, "end": 1.1, "style": "hook-punch" },
    { "text": "your move", "start": 41.5, "end": 43, "style": "cta-card" }
  ],
  "transitions": [
    { "time": 2, "style": "dip-to-black" }
  ]
}
```

Use this as the normal agent path:

```text
compose
```

For debugging:

```text
caption-scene -> preset-cues -> edit cues -> apply-cues -> inspect --screenshots -> render
```

Available starter presets:

- `hidden-engine-dynamic`: cue skeleton for 40-60s story-driven shorts with hook/proof/mechanism/choice/CTA overlay beats.
- `captioned-clean`: minimal transition cues for caption-first videos.

## Timed Text Overlays

Use for quick reaction beats, keyword shocks, proof callouts, and hook emphasis.

```ts
import { addAgentTextOverlays } from 'visualfries/agent';

const withOverlays = addAgentTextOverlays({
  scene,
  overlays: [
    { text: 'LOVE THIS 😍', start: 0.4, end: 1.1, style: 'pop-label' },
    { text: 'NECK 🤯', start: 1.1, end: 1.7, style: 'shock-word' },
    { text: '1M PROFIT', start: 2.0, end: 3.0, style: 'metric-badge' }
  ]
});
```

Overlay styles:

- `hook-punch`: loud yellow hook label for the first second.
- `shock-word`: large keyword reveal.
- `metric-badge`: big number/proof badge.
- `proof-pill`: smaller credibility/proof pill.
- `danger-crossout`: negative beat / wrong path callout.
- `cta-card`: final question or choice card.
- `pop-label`: generic fast reaction label.
- `soft-card`: calmer context card.

Rules:

- one overlay idea per beat,
- 0.4-1.4 seconds per overlay,
- keep captions readable,
- render sampled screenshots before final MP4.

## B-roll Sequence

Use when an agent has portrait stock footage, generated images, screen recordings, or proof visuals.

```ts
import { addAgentBrollSequence } from 'visualfries/agent';

const withBroll = addAgentBrollSequence({
  scene,
  cues: [
    { url: './broll/profile.mp4', start: 2.0, end: 5.0, type: 'VIDEO' },
    { url: './broll/chart.png', start: 5.0, end: 7.0, type: 'IMAGE', motion: 'slow-zoom-in' }
  ]
});
```

Layer defaults:

- b-roll layer order: `5`
- captions layer from `caption-scene`: `10`
- text overlay layer: `90`

This means b-roll naturally replaces/augments the base media while captions and overlays stay visible.

Image motion:

- `slow-zoom-in` default for images,
- `slow-zoom-out`,
- `drift-up`,
- `none`.

## Beat Transitions

Use when a hard cut between b-roll/avatar/proof visuals needs a small cover at an exact beat.

```ts
import { addAgentTransitions } from 'visualfries/agent';

const withTransitions = addAgentTransitions({
  scene,
  transitions: [
    { time: 2.0, style: 'dip-to-black' },
    { time: 5.0, style: 'swipe-left', color: '#04483D' }
  ]
});
```

Available styles:

- `dip-to-black` for invisible cuts,
- `flash` for punchy hook beats,
- `swipe-left` for editorial movement,
- `swipe-up` for vertical short-form movement.

Keep transition durations short, usually `0.18-0.32s`. Overusing them makes the edit feel templated.

## Agent QA Loop

For every non-trivial scene:

```bash
visualfries doctor --json
visualfries catalog --json
visualfries validate-cues ./cues.json --duration 45 --json
visualfries validate ./scene.json
visualfries qa ./scene.json --output ./qa
visualfries render ./scene.json --render-mode preview --output ./preview.mp4
ffprobe -v error -show_entries stream=codec_type,width,height -of json ./preview.mp4
```

If `visualfries render` blocks a final VIDEO/GIF scene, that is expected. Do not bypass it for shipped output. The scene needs deterministic predecoded media frames before final encode.

For final contiguous MP4 renders, prefer streaming encode after QA:

```bash
visualfries render ./scene.with-cues.json \
  --stream-encode \
  --image-format jpg \
  --output ./out.mp4
```

This avoids writing every final frame to disk before encode.

For static-heavy agent videos, add `--skip-duplicates` after QA:

```bash
visualfries render ./scene.json --output ./out.mp4 --skip-duplicates
```

The CLI uses VisualFries `renderFrameRange()` for contiguous frame ranges. Sparse QA screenshots still use direct sampled frame renders.

If screenshot samples show overlap, fix the scene JSON or cue timing before encoding the full video.
