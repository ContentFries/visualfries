---
title: Stills, carousels, AI backgrounds
description: Planned VisualFries surfaces beyond video. Stills and carousels from the same blocks, quote cards on AI-generated backgrounds with a text safe zone, editing text without re-rendering, and turning a post into a short reel.
updated: 2026-09-27
---

<span class="tag plan">planned</span> This page describes where VisualFries is going. None of it is released yet; the pieces it builds on already work.

A still is a clip with one frame, and a carousel is several stills from the same blocks. Because text is live DOM over whatever sits behind it, a still can be edited (moved, resized, restyled) by changing only the document, and it can gain time and become a short reel without being rebuilt.

## What is planned

- **Stills and carousels.** Render one frame or a set of pages from a document, as PNG, and a carousel as images plus a PDF.
- **AI-generated backgrounds.** A block asks an image model (for example through fal.ai or OpenAI, with keys in `.env`) for a background with a declared text safe zone. The image is generated once and stored as an asset, so renders stay deterministic.
- **Editing without re-render.** An editor drags, resizes and restyles text over the image. Only the JSON changes; the background is never regenerated. Blocks declare which props are editable so an editor can build controls for them.
- **Post to reel.** The same block receives a clip time: words reveal with the voice or the beat, and the still becomes a short vertical video.
- **Variants.** One document rendered as 9:16, 4:5, 1:1 and 16:9, with blocks reflowing per size.

## What it builds on today

- Blocks are Svelte components with props and live DOM text ([Motion blocks](/docs/blocks)).
- Time is optional per block: a block that never reads `clip.t` is already a still.
- `still` renders any moment to PNG ([CLI](/docs/cli)).
- Scene apps already edit documents live without re-rendering ([Scenes in an app](/docs/scenes)).
