---
title: When to use VisualFries
description: VisualFries fits Svelte projects where an editor and a renderer share one document, where timing comes from speech, and where agents write or repair content. When another tool is a better choice.
updated: 2026-09-27
---

VisualFries is a good choice when the document matters as much as the pixels: when an editor, a server and an agent all work on the same JSON, and when timing comes from what someone says.

## It fits when

- You build in **Svelte** and want the editor and the renderer to mount the same document.
- **Timing comes from speech**: transcripts, re-takes, word-level captions, inserts that land on a spoken word.
- **Agents write or repair content**, so JSON plus a CLI that fails loudly beats a timeline GUI.
- You need **transparent inserts** (ProRes 4444) placed on an NLE timeline through `manifest.json`.
- You render on **CPU-only servers** and need the same frame every time.

## Something else may fit better when

- Your team works in **React** and wants a large ecosystem of components and templates. Remotion is the natural choice there.
- You want **framework-free HTML compositions** with a GSAP timeline and a hosted renderer. HyperFrames targets that.
- You need a **finished editing product** rather than an engine. VisualFries is a library; ContentFries is the product built on it.

## How they differ

All three render a browser page frame by frame. They differ in where the document lives and who edits it.

|                 | VisualFries                                                | Remotion                       | HyperFrames                 |
| --------------- | ---------------------------------------------------------- | ------------------------------ | --------------------------- |
| Framework       | Svelte 5                                                   | React                          | Plain HTML + GSAP           |
| Source of truth | JSON document                                              | React code                     | HTML composition            |
| Primary timing  | Transcript phrases as anchors, plus seconds and frames     | Frames, with caption utilities | Seconds and data attributes |
| Editing         | Scene documents mounted live in your app                   | Studio and input props         | Studio editor and preview   |
| Agent surface   | `clips`, `check`, `still`, `render`, scene `validate`/`qa` | CLI and skills                 | CLI and skills              |
