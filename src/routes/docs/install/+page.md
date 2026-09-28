---
title: Install and doctor
description: Install VisualFries in a Svelte 5 project and check the render toolchain with visualfries doctor. Rendering needs Playwright, ffmpeg and a Chromium browser.
updated: 2026-09-27
---

VisualFries is an npm package for Svelte 5 projects. Mounting scenes in an app needs only the package. Rendering video from the command line also needs ffmpeg and a Chromium browser, which `visualfries doctor` checks for you.

## Install the package

```bash
npm install visualfries svelte             # scenes in an app
npm install visualfries svelte playwright  # also render from the command line
```

Svelte 5 is a peer dependency. Playwright is an optional peer dependency that npm does not install on its own; the command-line renderer needs it. The main entry points:

| Import                    | Use it for                                                                  |
| ------------------------- | --------------------------------------------------------------------------- |
| `visualfries`             | Scenes in an app: `createSceneBuilder`, composers, fonts                    |
| `visualfries/agent`       | Node helpers for scene automation: captions, cues, inspection, local render |
| `visualfries/motion`      | Motion blocks: `useClip`, `useTimeline`, `useFrame`                         |
| `visualfries/motion/node` | Node API for motion projects: load, check, still, render                    |
| `visualfries/browser`     | Browser export helpers (experimental)                                       |

The `visualfries` command is installed with the package. Run it with `npx visualfries`.

## Check the toolchain

```bash
npx visualfries doctor
```

VisualFries needs Node.js 20 or newer. `doctor` reports Node, ffmpeg, Playwright, a Chromium executable and whether the temp directory is writable; fix every `FAIL` before a render. Vite and the Svelte Vite plugin are needed only to render scene JSON, so they show `WARN` when missing and do not fail the check. `--json` prints the same report with a `sceneRenders` flag.

Chromium is looked up in this order: `VISUALFRIES_CHROMIUM_PATH`, `VISUALFRIES_CHROMIUM` (older name), `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, common system locations (`/usr/bin/chromium`, Google Chrome), then Playwright's own build:

```bash
export VISUALFRIES_CHROMIUM_PATH=/usr/bin/chromium
# or install Playwright's own build
npx playwright install chromium
```

## What the renderer uses

- **Chromium** draws each frame. For motion projects VisualFries starts it with the `CanvasDrawElement` feature so blocks are captured through HTML-in-Canvas; without it the renderer falls back to DOM screenshots automatically.
- **ffmpeg** encodes frames to H.264 MP4 or ProRes 4444 with alpha.
- **No GPU is needed.** The motion renderer draws with a 2D canvas, which is fast on CPUs. See [How rendering works](/docs/rendering#performance) for measured numbers and the machine they come from.

## Next

Follow the [Quickstart](/docs/quickstart) to render your first motion project.
