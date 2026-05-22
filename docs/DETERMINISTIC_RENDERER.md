# VisualFries Deterministic Renderer

VisualFries should own final rendering as a local, first-class capability.

## Decision

Final output for scenes containing `VIDEO` or `GIF` media must not rely on native browser media seek. Browser media seek is acceptable for preview and QA only.

The local deterministic renderer is the source-of-truth path:

```text
scene.json
  -> collect VIDEO/GIF requirements
  -> predecode media to exact frame images/manifests
  -> browser compositor receives exact frame image for each scene frame
  -> encode frames with ffmpeg
  -> mix/mux audio with ffmpeg
  -> mp4
```

ContentFries cloud workers should eventually become hosted execution wrappers around this VisualFries renderer. They own queues, uploads, progress, retries, chunking, URL signing, auth-specific asset resolution, and deployment concerns, but the render semantics should live in VisualFries.

## Preview Contract

Preview means cheap and fast:

- sampled QA frames,
- low-resolution or short-range renders,
- layout inspection,
- rough browser media playback when explicitly requested.

Preview is not a slower copy of final render. If a preview takes longer than final output, it is not a useful preview.

## Current Migration State

This package now exposes agent-safe render planning:

```ts
import { resolveAgentRenderPlan, requiresDeterministicRender } from 'visualfries/agent';

const plan = resolveAgentRenderPlan(scene, { mode: 'final' });
```

The CLI blocks final `VIDEO`/`GIF` renders unless the caller explicitly chooses preview or the legacy escape hatch:

```bash
visualfries render scene.json --render-mode preview --output preview.mp4
visualfries render scene.json --allow-browser-media-final --output unsafe-experiment.mp4
```

The package also includes the first local predecode core:

```ts
import { prepareLocalDeterministicMedia } from 'visualfries/agent';
```

`prepareLocalDeterministicMedia()` resolves `VIDEO`/`GIF` components, computes active frame windows, extracts exact image sequences with local `ffmpeg`, and returns a `visualfries-provider-predecoded` frame manifest. The CLI can inject that manifest into the render page as a deterministic media provider.

The CLI also supports image-pipe final encoding:

```bash
visualfries render scene.json --stream-encode --image-format jpg --output out.mp4
```

With `--stream-encode`, rendered frames are written directly into local `ffmpeg` through `image2pipe` instead of first creating a temporary frame sequence. If audio is present, the CLI writes a silent video first and then muxes audio with `-c:v copy`.

Audio mixing is local-first as well. The CLI now plans audio from active `VIDEO`/`AUDIO` components, `audioTracks`, and `settings.audio`, prepares each source to 48k stereo FLAC, applies timeline delay/volume, mixes with `amix`, trims to the rendered range, and muxes the mixed track into the final MP4.

The same implementation is available as an importable local render boundary:

```ts
import { renderSceneLocally } from 'visualfries/agent';
```

Hosted workers should call this boundary instead of reimplementing frame extraction, browser composition, stream encoding, or audio mixing. The scene passed into this boundary must already contain public, local, or otherwise render-accessible media URLs. URL signing, signed URL refresh, and private asset authorization are wrapper responsibilities, not VisualFries responsibilities. VisualFries must not know how to authenticate ContentFries private assets; if media URLs are not render-accessible, it should fail with useful diagnostics. The package must stay light: `ffmpeg`, Playwright/Chromium, and hosted queue/upload infrastructure are runtime dependencies of the caller, not bundled VisualFries assets.

The local renderer owns trim-aware final output. When `scene.settings.trimZones` intersects the requested contiguous frame window, VisualFries renders only the kept frame ranges and concatenates them through the stream encoder. Audio mixing uses the same kept scene-time ranges so video duration and audio duration stay aligned.

The same boundary also supports exact single-frame output with `framesOnly: true` and explicit server renderer selection through `serverRendererMode: "canvas" | "webgl"`. Hosted wrappers should pass these options through instead of maintaining separate single-frame or renderer-mode semantics.

Frame image quality accepts either browser form (`0..1`) or percent form (`0..100`) and is normalized before the browser render starts. This keeps wrappers from failing later with opaque frame extraction errors when they pass values such as `88`.

The next migration slice is making the ContentFries worker call the VisualFries core instead of carrying its own duplicate render semantics.
