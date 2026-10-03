# VisualFries carousel

“How to turn one talking-head take into a week of content”

Five clips, 1080 × 1350, 30 fps, 90 frames / 3 seconds each. Program range: 0–15 seconds. Silent, designed for a social carousel that also plays as a video.

1. Hook: one talking-head take → a week of content.
2. Record once: monochrome subject from `talk`, cut out using its supplied matte. Footage holds at source time 4.3 seconds after the entrance, so the finished slide stays still.
3. Agent: read the transcript → write editable Svelte blocks. The transcript sample uses the supplied take's words.
4. Render: VisualFries makes reels, carousels, and posts. The three cards have exact 9:16, 4:5, and 1:1 proportions.
5. CTA: `npm i visualfries`.

Yellow `#ffe100`, near-black `#141413`, paper `#f5f3e8`. Bricolage Grotesque headlines, Anton condensed cover, JetBrains Mono labels, Inter supporting copy. Graphic entrances settle within 1 second; the speaker freezes at 1.3 seconds. No exit animations. Every clip's last frame is the finished slide.

## Validation and visual review

- `clips`: five consecutive 90-frame clips; no diagnostics. Saved in `qa/clips.json`.
- All seven Svelte files compile with no warnings. Saved in `qa/compile.json`.
- The user ran `check --determinism` after the review edits: all five clips pass in `html-in-canvas` mode.
- Reviewed `qa/round1.png` and the final `qa/round2.png`, with each slide sampled at 0.8 and 2.9 seconds.
- Review edits: moved the cover diagram down 30 pixels; reduced the square card's headline to clear its arrow; added a two-pixel alpha inset to reduce the speaker's white matte fringe; shortened entrances to give each clip a longer reading hold.
- Final visual review: cover spacing is clear, the square card's arrow clears its headline, and the speaker's matte edge is improved. All five slides are readable at 0.8 seconds and fully settled at 2.9 seconds. No further design edits are needed.
- Final MP4 has not been rendered yet.

## Finish rendering

Run from this folder in an environment that permits Chromium to launch:

```bash
node render.mjs
```

The script runs the full determinism check, exports frame 89 from each clip, writes entrance contact sheets, renders the individual clips with the VisualFries CLI, and concatenates them into `out/out.mp4`. The motion CLI currently accepts an output directory rather than a single combined MP4 path, so assembly is a final ffmpeg stream-copy step.

Expected outputs: `out/out.mp4`, `out/clips/*.mp4`, `out/slides/*.png`, `qa/*-entrance.png`.
