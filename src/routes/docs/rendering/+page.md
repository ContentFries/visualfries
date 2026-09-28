---
title: How rendering works
description: How VisualFries renders motion projects. Blocks are bundled with Svelte and esbuild, drawn in Chromium through HTML-in-Canvas or DOM screenshots, captured frame by frame in parallel ranges and encoded with ffmpeg.
updated: 2026-09-27
---

VisualFries renders by drawing each frame in a real browser engine. The same code that shows a block in a preview decides the pixels of the final video.

## The pipeline

1. **Resolve.** The project and transcript become clips with program times, cues and bound words.
2. **Bundle.** The project's blocks are compiled with the Svelte compiler and bundled with esbuild into one page, together with the VisualFries stage.
3. **Mount.** Headless Chromium opens the page. Fonts load first, then the clip's block mounts.
4. **Capture.** For each frame the stage sets the time, flushes Svelte, seeks GSAP, runs `useFrame`, waits for the paint and captures.
5. **Encode.** ffmpeg writes H.264 MP4 or ProRes 4444.

## Capture modes

| Mode             | When                                                    | How                                                                                                    |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `html-in-canvas` | Chromium with the `CanvasDrawElement` feature (default) | The block lives inside `<canvas layoutsubtree>` and is drawn with `drawElementImage` into a 2D canvas. |
| `dom`            | Browsers without the feature                            | The block is a normal DOM element; frames are page screenshots.                                        |

The mode is chosen automatically and reported by `check` and `render`. A 2D canvas needs no GPU and was about four times faster than software WebGL on a CPU-only server in our tests.

## Performance

| Measurement                                                                                         | Result                                                  |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| CF004 project, 16 clips, 6 593 frames at 1920×1080                                                  | about 5 min 30 s (roughly 20 frames per second overall) |
| Quickstart project, 189 frames at 1080×1350                                                         | 2.9 s                                                   |
| `check` of the 16 CF004 clips                                                                       | about 6 s                                               |
| 2D canvas vs software WebGL (SwiftShader), one test scene at 720p                                   | about 4× faster per frame                               |
| Every frame of 3 CF004 clips (2 187 frames) in sequential, reverse, random and parity-shifted order | 0 differing frames                                      |

Measured on 2026-09-27 on a server with 12 vCPUs (AMD EPYC 9645), no GPU, Chromium 154, ffmpeg 8.1, `html-in-canvas` capture, default `--jobs` (6). Each clip is split into parallel page ranges; `--jobs` sets how many. Numbers on other machines will differ.

## Audio

Motion renders are silent. They are inserts that belong on top of the program audio: `manifest.json` gives each clip's start frame so an editor or a script can place it on the voiceover.

## Running it in your own service

The browser side is one contract: load a clip, then ask for frame _n_. A server that already owns queues, uploads and scaling (like the ContentFries render service) can drive the same stage page and keep its own capture and encoding. Rendering in the viewer's browser with WebCodecs is <span class="tag plan">planned</span>.
