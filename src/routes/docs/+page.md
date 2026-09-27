---
title: What is VisualFries
description: VisualFries is an open-source Svelte 5 engine for social video and stills. One JSON document describes what is on screen, when, and in which format; it mounts live in an editor and renders frame-exact on a server.
updated: 2026-09-27
---

VisualFries is an MIT-licensed Svelte 5 engine for making visual content for social media from code and data. A JSON document is the source of truth, visuals are Svelte components and HTML/CSS, animation is GSAP, and every frame renders the same way in a live editor and on a server. It is the engine behind [ContentFries](https://contentfries.com), which turns one long video into a week of clips, captions and posts.

## Two ways to use it

**Scenes** are JSON documents with layers of VIDEO, IMAGE, TEXT, SUBTITLES, SHAPE, GIF and AUDIO components. You mount a scene in a Svelte app with `createSceneBuilder`, edit it live, and render it headless. This is how the ContentFries editor works. Start with [Scenes in an app](/docs/scenes).

**Motion projects** are `.vf.json` documents whose clips are your own Svelte components ("blocks"), timed by the words of a transcript instead of typed seconds. They are made for explainer inserts, lower thirds and title cards that follow a voiceover, and for agents that write and repair them. Start with the [Quickstart](/docs/quickstart).

## The five ideas

Every VisualFries file is read the same way. The docs follow this order.

|     | Idea                           | What it means                                                                 |
| --- | ------------------------------ | ----------------------------------------------------------------------------- |
| 01  | [Document](/docs/project-file) | JSON describes the output. An app or an agent writes it; a diff reviews it.   |
| 02  | [Blocks](/docs/blocks)         | Any visual is a Svelte component. Text is real DOM, so it wraps and reflows.  |
| 03  | [Time](/docs/time-and-cues)    | Cues are spoken words from a transcript. A new voiceover re-times everything. |
| 04  | [Surfaces](/docs/surfaces)     | Size, frame rate and transparency come from the document.                     |
| 05  | [Render](/docs/cli)            | Any frame, in any order, gives the same pixels. MP4, ProRes 4444 with alpha.  |

## What works today

| Feature                                                                       | Status                                |
| ----------------------------------------------------------------------------- | ------------------------------------- |
| Scene JSON, composer API, live editing in an app                              | Works today                           |
| Motion projects: blocks, transcript cues, `clips`, `check`, `still`, `render` | Works today (experimental)            |
| New voiceover re-timing with `--transcript` and "Did you mean" suggestions    | Works today                           |
| Deterministic render on a CPU-only server, alpha output, NLE manifest         | Works today                           |
| Stills, carousels and quote cards on AI-generated backgrounds                 | <span class="tag plan">planned</span> |
| Editing text of a still by drag and drop without re-rendering                 | <span class="tag plan">planned</span> |
| `visualfries setup` with speech-to-text providers and keys                    | <span class="tag plan">planned</span> |
| Export in the viewer's browser                                                | <span class="tag plan">planned</span> |

## Where next

- [Install and doctor](/docs/install): what the renderer needs.
- [Quickstart](/docs/quickstart): a motion project from zero to MP4 in six steps.
- [VisualFries for agents](/docs/agents): how an AI agent should work with VisualFries.
