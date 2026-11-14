---
title: When to use VisualFries
description: VisualFries is the engine for talking-head video. Use it when a raw recording should become a finished edit, when timing comes from speech, and when an agent writes or repairs the edit. When another tool is the better choice, and how VisualFries compares with Remotion and HyperFrames.
updated: 2026-11-14
---

VisualFries is the right choice when the video starts with a person talking: one raw recording in, a finished edit out, cut by the words that were said.

## It fits when

- A **raw take should become a finished video**: pauses and retakes cut, the speaker framed, captions, transitions, sound and music, in every format. That is a [program](/docs/programs).
- **Timing comes from speech**: transcripts, retakes, word-level captions, inserts that land on a spoken word.
- **An agent writes or repairs the edit**, so JSON plus a CLI that fails loudly beats a timeline GUI.
- You need **transparent inserts** (ProRes 4444) placed on an NLE timeline through `manifest.json`.
- You render on **CPU-only servers** and need the same frame every time.
- You build in **Svelte** and want an editor and a renderer to mount the same [scene document](/docs/scenes).

## Something else may fit better when

- Your team works in **React**, the video lives inside a product, or you want a large ecosystem of components and templates. Remotion is the natural choice there.
- You want **motion design from plain HTML** with no recording at its centre, a visual editor and hosted rendering. HyperFrames targets that.
- You need a **finished editing product** rather than an engine. VisualFries is a library; ContentFries is the product built on it.

## How they differ

All three render a browser page frame by frame. They differ in what the video starts from and what you write.

|                    | VisualFries                                                | Remotion                            | HyperFrames                     |
| ------------------ | ---------------------------------------------------------- | ----------------------------------- | ------------------------------- |
| Built for          | Talking-head video: raw recording to finished edit         | Any video written in React          | Any video made from HTML        |
| You write          | One JSON program plus Svelte blocks                        | React components                    | HTML, CSS and JavaScript        |
| Primary timing     | Transcript phrases as anchors, plus seconds, frames, beats | Frame numbers                       | Seconds in data attributes      |
| Cutting a raw take | Cut list with takes, retakes and order                     | Sequences and trims you write       | Pause removal through the agent |
| Editor GUI         | None for programs; scenes mount live in your app           | Remotion Studio                     | Studio app and browser editor   |
| Rendering          | Local headless Chromium, CPU only                          | Local, server, AWS Lambda           | Local, Docker, cloud            |
| Licence            | MIT                                                        | Own licence, paid above 3 employees | Apache 2.0                      |

The full comparisons, with sources and dates: [VisualFries vs HyperFrames vs Remotion](/alternatives), [VisualFries as a HyperFrames alternative](/alternatives/hyperframes) and [VisualFries as a Remotion alternative](/alternatives/remotion).
