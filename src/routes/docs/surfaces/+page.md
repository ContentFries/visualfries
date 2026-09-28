---
title: Sizes, alpha and formats
description: Surfaces in VisualFries motion projects. Output size and frame rate from the document, opaque MP4 or transparent ProRes 4444, backgrounds, and how blocks reflow per size.
updated: 2026-09-27
---

A surface is what a clip is rendered onto: its size, frame rate and background. In a motion project the document decides all three, and because blocks are DOM, text wraps and reflows for each size instead of being scaled.

## Size and frame rate

```json
{ "size": [1080, 1920], "fps": 30 }
```

Common sizes: `[1080, 1920]` for Reels and Shorts, `[1080, 1350]` for a 4:5 feed post, `[1080, 1080]` square, `[1920, 1080]` landscape. Blocks can read `clip.width` and `clip.height` to adapt their layout.

## Opaque or transparent

| Clip setting    | Output                                       |
| --------------- | -------------------------------------------- |
| default         | H.264 `.mp4`, `yuv420p`, CRF 14              |
| `"alpha": true` | ProRes 4444 `.mov` with a real alpha channel |

Renders are silent. Transparent clips are meant for an editor's timeline: lower thirds, sign-offs, overlays over camera footage. `manifest.json` gives each clip's start frame so it can be placed exactly on the program, over the voiceover it was timed to.

## Backgrounds

`background` on the project sets the default for every opaque clip; a clip can override it. A block can also paint its own background, including images and gradients.

## One document, several formats

Today one project has one size. Render a vertical and a landscape version from two small project files that share the same blocks and theme. Variants of one document in several sizes, carousels and stills are [planned](/docs/stills).
