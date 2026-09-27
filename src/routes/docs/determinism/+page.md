---
title: Determinism rules
description: Every VisualFries frame must depend only on clip time. The rules for motion blocks, what visualfries check --determinism detects, and how the renderer makes seeking safe.
updated: 2026-09-27
---

A VisualFries frame depends only on the clip's time. Frame 240 looks the same whether it is rendered first, last, after frame 239 or on another machine. This is what lets the renderer split a clip into parallel ranges and lets an agent look at any moment without playing the video.

## Rules for blocks

- **Read time from the clip.** Use `clip.t`, `clip.p()`, `useTimeline` or `useFrame`. Never `Date.now()`, `performance.now()` or `setTimeout` for animation.
- **No CSS transitions or animations.** They run on the wall clock and ignore seeks. Drive the same properties from clip time.
- **Randomness through `noise(...keys)`.** The same keys always give the same value. `random(seed)` is only for setup.
- **No state carried between frames.** A frame function must not accumulate values that the next frame reads.
- **One owner per property.** Do not animate the same CSS property from markup and from a GSAP timeline.
- **Load before the first frame.** Declare fonts in the project; wrap other loading in `useReady`.

## Let check find mistakes

```bash
npx visualfries check project.vf.json --determinism
```

`check` mounts every block and runs it across the clip without rendering video. It reports:

- unknown cues and moments, unknown eases, `map()` points that go back in time;
- CSS animations and transitions running on wall-clock time;
- with `--determinism`, sampled frames that look different when rendered forward and backward.

```text
FAIL bad  (html-in-canvas)
  error: Frames 305, 345, 385, 425, 465 look different depending on seek order.
  warning: 1 CSS animation(s)/transition(s) run on wall-clock time (<div class="spin">).
```

## What the renderer does for you

For every frame the stage sets the clip time, flushes Svelte, seeks GSAP timelines with callbacks suppressed, runs `useFrame` callbacks, forces a fresh raster of the stage, waits for the browser's paint (a paint that does not happen within two seconds is an error, never a silent timeout) and only then captures. Fonts load before blocks mount, and each timeline is primed once so tweens record their start values regardless of seek order.

The CF004 example was verified with every frame of three clips (2 187 frames) rendered in sequential, reverse and random order: zero differing frames.
