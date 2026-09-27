---
title: Install and doctor
description: Install VisualFries in a Svelte 5 project and check the render toolchain with visualfries doctor. Rendering needs ffmpeg and a Chromium that Playwright can drive.
updated: 2026-09-27
---

VisualFries is an npm package for Svelte 5 projects. Mounting scenes in an app needs only the package. Rendering video from the command line also needs ffmpeg and a Chromium browser, which `visualfries doctor` checks for you.

## Install the package

```bash
npm install visualfries
```

Svelte 5 is a peer dependency. The package ships three entry points:

| Import               | Use it for                                                                  |
| -------------------- | --------------------------------------------------------------------------- |
| `visualfries`        | Scenes in an app: `createSceneBuilder`, composers, fonts                    |
| `visualfries/agent`  | Node helpers for scene automation: captions, cues, inspection, local render |
| `visualfries/motion` | Motion blocks: `useClip`, `useTimeline`, `useFrame`                         |

The `visualfries` command is installed with the package. Run it with `npx visualfries`.

## Check the toolchain

```bash
npx visualfries doctor
```

`doctor` reports Node, ffmpeg, Vite, the Svelte Vite plugin, Playwright, a Chromium executable and a writable temp directory. Every line must be `OK` before a render.

If Chromium is installed but not found, point VisualFries to it:

```bash
export VISUALFRIES_CHROMIUM_PATH=/usr/bin/chromium
# or install Playwright's own build
npx playwright install chromium
```

## What the renderer uses

- **Chromium** draws each frame. For motion projects VisualFries starts it with the `CanvasDrawElement` feature so blocks are captured through HTML-in-Canvas; without it the renderer falls back to DOM screenshots automatically.
- **ffmpeg** encodes frames to H.264 MP4 or ProRes 4444 with alpha.
- **No GPU is needed.** The motion renderer draws with a 2D canvas, which is fast on CPUs; the CF004 example renders 6 593 frames at 1080p in about five and a half minutes on a 12-core server.

## Next

Follow the [Quickstart](/docs/quickstart) to render your first motion project.
