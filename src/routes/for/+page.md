---
layout: page
title: 'What you can make with VisualFries: YouTube videos, shorts, reels, posts'
heading: One engine for everything you post
description: What VisualFries makes today, and how well. YouTube videos, shorts and reels edited by your AI agent from real footage, plus covers, image posts and carousel slides from the same project.
updated: 2026-11-14
faq:
  - q: Is VisualFries only for video?
    a: No. The same blocks render a single frame as a PNG at any size, so covers, thumbnails, image posts and carousel slides come from the same project and brand as the video.
  - q: Do I need to know how to code?
    a: You need a coding agent such as Claude Code or Codex. The agent writes the edit and the visuals; you say what you want and look at the result.
  - q: Does VisualFries find the best moments for clips by itself?
    a: No. Your agent reads the transcript and chooses the ranges; VisualFries cuts exactly what the program says. That is why the result is your edit and not a template.
---

VisualFries is the open-source engine for social media content, and your AI agent is the editor. It starts from your real footage and the words that were said in it. Here is what it makes today, with an honest note on how far each one goes.

## Video, edited from your footage

- **[YouTube videos](/for/youtube-videos).** A long recording becomes the finished episode: cuts, punch-ins, full-screen cards, graphics on the words, music and the final mix. One changed card redraws 15 seconds, not the whole video.
- **[Shorts and reels](/for/shorts-and-reels).** A raw take or a passage of a long video becomes a vertical clip with captions, shots, sound effects and an end card, safe on TikTok, Instagram and YouTube.
- **Podcast and interview clips.** The same cut list works on any recording with a transcript. Cutting between several camera files is yours to line up: there is no automatic multi-camera sync or speaker detection yet.
- **Promos, openers and guest intro videos.** Photos, event footage, music cut to the beat and kinetic type, in one program.
- **Explainers and inserts.** Motion graphics timed to a voiceover, as a finished video or as transparent ProRes 4444 inserts for your editing software.

## Stills, from the same project

- **Covers, thumbnails and image posts.** `still` writes any frame as a PNG at any size. The speaker can stand in front of the words, cut out by the same matte the video uses.
- **Carousel slides.** One clip per slide, one `still` per slide, same brand tokens. A single carousel command with a PDF is planned.
- **Ad creatives.** 9:16, 4:5, 1:1 and 16:9 from one project, with the Meta, TikTok and YouTube safe zones. Batches of variants are a loop your agent writes; there is no variant table built in yet.

## What every one of them shares

- **The words are the timeline.** Cuts, shots, graphics and sound effects are anchored to phrases of the transcript.
- **Your agent is the editor.** The edit is one JSON program; the CLI checks it and says what to fix.
- **Your footage, your brand.** Real recordings, your fonts and colours as tokens, visuals in Svelte with no template ceiling.
- **Open source.** MIT, renders on your machine or server, no account.

Coming from another tool? See [how VisualFries compares](/alternatives).
