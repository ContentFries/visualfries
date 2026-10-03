---
title: Determinism rules
description: A VisualFries frame should depend only on clip time. The rules for motion blocks, what visualfries check --determinism tests and what it does not, and how the renderer makes seeking safe.
updated: 2026-10-03
---

A VisualFries frame should depend only on the clip's time. With the same document, fonts, assets and Chromium version, frame 240 looks the same whether it is rendered first, last or after frame 239. This is what lets the renderer split a clip into parallel ranges and lets an agent look at any moment without playing the video. Other browser versions or operating systems can rasterize text slightly differently, so pin them for production renders.

## Rules for blocks

- **Read time from the clip.** Use `clip.t`, `clip.p()`, `useTimeline` or `useFrame`. Never `Date.now()`, `performance.now()` or `setTimeout` for animation.
- **No CSS transitions or animations.** They run on the wall clock and ignore seeks. Drive the same properties from clip time.
- **Randomness through `noise(...keys)`.** The same keys always give the same value. `random(seed)` is only for setup.
- **No state carried between frames.** A frame function must not accumulate values that the next frame reads.
- **One owner per property.** Do not animate the same CSS property from markup and from a GSAP timeline.
- **No `repeat` or `yoyo` on nested timelines that overlap other tweens of the same property.** The stage makes overlapping tweens in one timeline safe, but GSAP's per-iteration bookkeeping inside a repeating child timeline can still depend on the previous frame. Repeat by laying out the tweens, or by computing the value from `clip.t`.
- **Load before the first frame.** Declare fonts in the project; wrap other loading in `useReady`.

## Let check find mistakes

```bash
npx visualfries check project.vf.json --determinism
```

`check` mounts every block and runs it across the clip without rendering video. It reports:

- unknown cues and moments, unknown eases, `map()` points that go back in time;
- CSS animations and transitions running on wall-clock time;
- with `--determinism`, frames that look different when rendered forward and backward. It samples about a dozen frames in one browser page: it catches history-dependent blocks, it does not prove every frame on every machine.

```text
FAIL bad  (html-in-canvas)
  error: Frames 305, 345, 385, 425, 465 look different depending on seek order.
  warning: 1 CSS animation(s)/transition(s) run on wall-clock time (<div class="spin">).
```

## What the renderer does for you

For every frame the stage sets the clip time, flushes Svelte, seeks GSAP timelines with callbacks suppressed, runs `useFrame` callbacks, forces a fresh raster of the stage, waits for the browser's paint (a paint that does not happen within two seconds is an error in both capture modes, never a silent timeout) and only then captures. Fonts load before blocks mount, and each timeline is primed once so tweens record their start values regardless of seek order. Each frame then reaches its time the same way: the timeline jumps to its end, rewinds to 0 and plays forward to the frame. GSAP renders children forward when time increases and backward when it decreases, so where two tweens overlap on one property a plain seek would let the previous frame decide which one writes last.

In our tests every frame of three CF004 clips (2 187 frames), rendered in sequential, reverse, random and parity-shifted order, came out identical on one machine. The setup is listed in [How rendering works](/docs/rendering#performance).
