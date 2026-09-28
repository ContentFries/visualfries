---
title: What is VisualFries
description: VisualFries is an open-source Svelte 5 engine for social video and stills. Scene documents mount live in an editor; motion projects time Svelte blocks by the words of a transcript and render to MP4 or ProRes.
updated: 2026-09-27
---

VisualFries is an MIT-licensed Svelte 5 engine for making visual content for social media from code and data. A JSON document is the source of truth, visuals are Svelte components and HTML/CSS, animation is GSAP. Motion blocks are functions of time, so with the same document, fonts and browser a frame is meant to look the same whenever it is rendered; `check --determinism` verifies that ([rules](/docs/determinism)). It is the engine behind [ContentFries](https://contentfries.com), which turns one long video into a week of clips, captions and posts.

## Two ways to use it

**Scenes** are JSON documents with layers of VIDEO, IMAGE, TEXT, SUBTITLES, SHAPE, GIF and AUDIO components. You mount a scene in a Svelte app with `createSceneBuilder`, edit it live, and render it headless. This is how the ContentFries editor works. Start with [Scenes in an app](/docs/scenes).

**Motion projects** are `.vf.json` documents whose clips are your own Svelte components ("blocks"), timed by the words of a transcript instead of typed seconds. They are made for explainer inserts, lower thirds and title cards that follow a voiceover, and for agents that write and repair them. Start with the [Quickstart](/docs/quickstart).

## The five ideas

Every VisualFries file is read the same way. The docs follow this order.

|     | Idea                           | What it means                                                                        |
| --- | ------------------------------ | ------------------------------------------------------------------------------------ |
| 01  | [Document](/docs/project-file) | JSON describes the output. An app or an agent writes it; a diff reviews it.          |
| 02  | [Blocks](/docs/blocks)         | Any visual is a Svelte component. Text is real DOM, so it wraps and reflows.         |
| 03  | [Time](/docs/time-and-cues)    | Cues are spoken words from a transcript. A new voiceover re-times everything.        |
| 04  | [Surfaces](/docs/surfaces)     | Size, frame rate and transparency come from the document.                            |
| 05  | [Render](/docs/cli)            | A frame does not depend on which frames came before it. MP4, ProRes 4444 with alpha. |

## What works today

| Feature                                                                          | Status                                |
| -------------------------------------------------------------------------------- | ------------------------------------- |
| Scene JSON, composer API, live editing in an app                                 | Works today                           |
| Motion projects: blocks, transcript cues, `clips`, `check`, `still`, `render`    | Works today (experimental)            |
| New voiceover re-timing with `--transcript` and "Did you mean" suggestions       | Works today                           |
| Deterministic render on a CPU-only server, alpha output, NLE manifest            | Works today                           |
| Agent skill for scene JSON (`skills/visualfries`)                                | Works today                           |
| Stills, carousels and quote cards on AI-generated backgrounds                    | <span class="tag plan">planned</span> |
| Editing text of a still by drag and drop without re-rendering                    | <span class="tag plan">planned</span> |
| `visualfries setup` with speech-to-text providers and keys; a motion agent skill | <span class="tag plan">planned</span> |
| Live motion preview with a scrubber                                              | <span class="tag plan">planned</span> |
| Export in the viewer's browser                                                   | <span class="tag plan">planned</span> |

## Where next

- [Install and doctor](/docs/install): what the renderer needs.
- [Quickstart](/docs/quickstart): a motion project from zero to MP4 in six steps.
- [VisualFries for agents](/docs/agents): how an AI agent should work with VisualFries.
- [Troubleshooting](/docs/troubleshooting): the errors you are most likely to meet.
