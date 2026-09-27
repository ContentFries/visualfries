---
title: Scene components
description: The component types of VisualFries scenes. TEXT and SUBTITLES as HTML/CSS text, VIDEO, IMAGE and GIF media, SHAPE including progress bars, COLOR, GRADIENT and AUDIO, with their appearance, animation and effect support.
updated: 2026-09-27
---

Every scene component has an `id`, a `type`, a `timeline` with `startAt` and `endAt` in seconds, and an `appearance` with position and size. Type-specific fields add sources, text or shapes.

## Shared appearance

| Field                              | Meaning                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `x`, `y`, `width`, `height`        | Box in scene pixels.                                                                                                           |
| `offsetX`, `offsetY`               | Extra offset in pixels.                                                                                                        |
| `opacity`                          | 0 to 1 (default 1).                                                                                                            |
| `rotation`, `scaleX`, `scaleY`     | Transform of the component (defaults 0, 1, 1).                                                                                 |
| `verticalAlign`, `horizontalAlign` | Alignment of content inside the box.                                                                                           |
| `background`                       | For TEXT: `enabled`, `color` (or gradient), `target` (`wrapper` fills the box, `element` hugs the text), `radius`.             |
| `text`                             | Text styling for TEXT and SUBTITLES. `fontSize` accepts a number of pixels or `{ value, unit }` with `px`, `em`, `rem` or `%`. |

## Types

| Type            | What it draws                                        | Key fields                                                                             |
| --------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| TEXT            | HTML/CSS text rendered through SVG foreignObject     | `text`, `appearance.text` (font, size, weight, color, align, shadow, outline, padding) |
| SUBTITLES       | Word-timed captions from transcript data             | `appearance.text`, `activeWord` highlighting, optional AI emojis                       |
| VIDEO           | A video file                                         | `source` (url, assetId, trim), `volume`, `muted`, `playback`, `crop`                   |
| IMAGE           | A still image                                        | `source`, `crop`                                                                       |
| GIF             | An animated GIF                                      | `source`, `playback` (loop, speed)                                                     |
| SHAPE           | Rectangle, circle, triangle, star, or a progress bar | `shape` (`type`, `cornerRadius`, `progressConfig`)                                     |
| COLOR, GRADIENT | Solid or linear/radial gradient fills                | fill settings                                                                          |
| AUDIO           | Sound only                                           | `source`, `volume`                                                                     |

Use TEXT for visible typography. Do not rasterize badges or numbers into IMAGE, and do not add a SHAPE only as a text background when TEXT's own background can do it.

## Animations

| Component                                 | Runtime animation                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| TEXT, SUBTITLES                           | Presets and custom GSAP-style timelines targeting `container`, `lines`, `words` or `chars` |
| IMAGE, VIDEO, GIF, SHAPE, COLOR, GRADIENT | x/y offsets, opacity, rotation, scale; pivot at the center                                 |
| AUDIO                                     | None                                                                                       |

Word and line presets include `words-highlight`, `words-active-color`, `lines-highlight`, `lines-reveal-and-fade` and `lines-elastic`. List what a component supports at runtime:

```bash
npx visualfries catalog --component TEXT --capabilities --json
```

## Effects

`fillBackgroundBlur` (fill empty space with a blurred copy, for vertical video from landscape) and `layoutSplit` (split screen) render today. Text shadow and solid outline are set in `appearance.text`. Some effects exist in the schema only; `validate --strict-runtime-support` rejects them.
