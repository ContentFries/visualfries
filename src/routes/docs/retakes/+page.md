---
title: Re-takes and a new voiceover
description: Re-time every VisualFries motion clip to a new recording with one flag. What moves automatically, what fails with a suggestion when the words change, and how the render manifest marks stale clips.
updated: 2026-09-27
---

Because clips and cues point at words, a new recording does not mean new code. Transcribe the new audio and pass the transcript: every clip and cue anchored to a phrase is resolved again and moves to where its words are now. Anchors written as seconds or frames stay where they are.

## Re-time everything

```bash
npx visualfries clips cf004.vf.json --transcript retake.transcript.json
npx visualfries check cf004.vf.json --transcript retake.transcript.json
npx visualfries render cf004.vf.json --transcript retake.transcript.json --output out/
```

A `--transcript` path is relative to the current directory, unlike paths inside the project file.

In the CF004 example a slower re-take with a longer pause moved cue `extra` from 9.20 s to 10.84 s and stretched the clip from 480 to 548 frames. No block changed. Exits written against `end` (for example `clip.out('end-0.5')`) follow the longer clip.

When the new take is final, point `transcript` in the project file at it.

## When the words change

If the speaker says something different, the affected anchors fail loudly, and when similar words were spoken the error suggests them:

```text
cues.extra: Phrase "naviac" not found inside the clip. Did you mean "navyše" at 59.80s?
```

Update the phrase in the JSON. The block stays untouched. Run `check` after the change; it takes seconds.

## Stale renders

`render` writes `manifest.json` with each clip's program start frame and a hash of the transcript it was timed against. Re-rendering a few clips keeps the others; clips timed against another transcript are marked `"stale": true` and the render prints a warning. Staleness tracks the transcript only: after changing a block, a font or the size, re-render the affected clips yourself.

```text
Warning: Languages were rendered against another transcript; their placement may be off. Re-render them.
```

Clips removed from the project drop out of the manifest.
