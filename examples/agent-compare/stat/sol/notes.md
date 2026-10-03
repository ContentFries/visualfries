# VisualFries asset multiplier post

Source: `project.vf.json` and `blocks/AssetMultiplier.svelte`.

Format: 1080 × 1350, 30 fps, four seconds. Dark background with #ffe100 accent, Bricolage headline, Anton numeral, matte-cut speaker. The asset breakdown is exactly 1 reel, 5 caption styles, 1 cover, 1 quote card, 5 carousel slides.

All graphic entrances finish by 2.85 seconds. Speaker playback freezes at 2.8 seconds through the frame-driven Footage offset. The remaining time holds the finished composition. No source speech is included.

## Verification

Project resolution, cue resolution, Svelte compilation and VisualFries bundle compilation passed with no diagnostics. Source and supplied matte frames were inspected.

The user ran `check --determinism` for the first version outside the sandbox: all clips passed in html-in-canvas mode. The resulting contact sheet, `qa/round1.png`, was reviewed.

After that review, asset labels were enlarged from 24px to 30px, with additional row height. The speaker's lower fade now begins earlier and reaches full transparency before the source frame's bottom edge. Animation timing is unchanged. The updated version needs another browser check and still capture before rendering.

Chromium cannot launch inside this sandbox (`crashpad setsockopt: Operation not permitted`). The earlier sandbox failure records remain in `out/qa/verification.json` and `out/qa/render.log`.

## Finish on a host where Chromium can launch

```bash
node <visualfries repo>/bin/visualfries.js check project.vf.json --determinism
node <visualfries repo>/bin/visualfries.js still project.vf.json --clip out --at 0.8s --at 1.6s --at 2.85s --at 3.9666667s --output out/qa/contact-sheet.png
node <visualfries repo>/bin/visualfries.js still project.vf.json --clip out --at 3.9666667s --output out/post.png
node <visualfries repo>/bin/visualfries.js render project.vf.json --output out
```

Inspect the stills before the final render. For motion projects the CLI treats `--output` as a directory. The clip ID `out` therefore produces the requested `out/out.mp4` when the output directory is `out`.
