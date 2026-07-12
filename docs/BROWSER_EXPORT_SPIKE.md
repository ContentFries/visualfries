# Browser WebGL + MediaBunny export spike

This spike adds a separate deterministic browser export path. Existing interactive preview and local/cloud FFmpeg rendering are unchanged.

MediaBunny is pinned to `1.49.0` for this spike. The newer release available during implementation was less than 14 days old.

## Architecture and next slices

Current scene transitions are schema data only; existing agent transitions are full-frame overlay components. This milestone therefore keeps normal preview untouched and proves a separate browser export boundary: server-mode Pixi scene canvases → curated WebGL transition canvas → MediaBunny encode/mux. Next reviewable slices are: wire the curated adapter into a frame-index transition manager at the renderer's pre-present seam, adapt MediaBunny decoded samples to the deterministic media provider for real browser video inputs, then add an OPFS/File System Access target for long exports. None requires replacing the FFmpeg/cf-worker fallback.

## What it proves

- VisualFries/Pixi renders two animated 1080x1920 scenes at exact `frameIndex / 30` timestamps.
- A curated gl-transitions-compatible WebGL adapter composites `from`, `to`, `progress`, `ratio`, and whitelisted parameters. It ships `fade` and `radial-wipe`; shader compile/link failure falls back to fade.
- The final WebGL canvas is fed directly to MediaBunny `CanvasSource`. No PNG/JPEG serialization and no websocket frame transport occurs.
- MediaBunny encodes AVC/H.264 video and AAC audio and muxes MP4. The in-browser audio mix starts at timestamp zero.
- Every `CanvasSource.add()` is awaited, propagating encoder/writer backpressure. The 10-second demo uses `BufferTarget`; larger integrations can pass a positional `StreamTarget` writable that honors each chunk's `position`.

## Run interactively

```bash
pnpm dev
```

Open `http://localhost:5173/browser-export-spike`, confirm the AVC + AAC capability report, then click **Render 10-second MP4**.

## Produce the checked artifact

```bash
node scripts/render-browser-export-spike.mjs
```

Default output: `artifacts/browser-export-spike/demo.mp4`.

Inspect it:

```bash
ffprobe -v error -show_streams -show_format artifacts/browser-export-spike/demo.mp4
ffmpeg -i artifacts/browser-export-spike/demo.mp4 -vf "select='eq(n,119)+eq(n,120)+eq(n,135)+eq(n,149)+eq(n,150)'" -vsync 0 artifacts/browser-export-spike/frame-%02d.png
```

Expected: 300 frames, 10 seconds, 1080x1920 AVC video, AAC stereo audio with `start_time=0`, no blank transition samples, and zero shader fallbacks on a compatible WebGL implementation.

## Verified artifact (2026-07-11)

- H.264, 1080x1920, 30fps, 300 decoded frames, video duration `10.000000`
- AAC stereo, 48kHz, audio `start_time=0.000000` (AAC padding extends its reported duration to `10.069333`)
- First 100ms audio RMS approximately `-34.6 dB`, confirming immediate non-silent audio
- Transition-window sampled average luma ranged `38.49..50.77`; visual frame inspection found no blank/white frame
- Four motion samples produced four different decoded-frame hashes
- Runtime shader fallback count: `0`

## Capability and fallback contract

The browser path probes the exact requested dimensions and AVC/AAC configuration before work starts. It never silently changes codecs. If unavailable, the structured result names `deterministic-local-ffmpeg`, preserving the existing VisualFries/cf-worker fallback. This milestone does not promise mobile support or arbitrary user GLSL.
