# Proposed VisualFries Skill Update (Review Only)

This is a repo-local proposal. It does not modify `/Users/lukasgregor/.agents/skills/visualfries/SKILL.md`.

Apply these sections to the installed skill only after review/approval.

## Replace the agent rule

```text
inspect inputs and actual runtime capability
-> choose native semantic components
-> author scene JSON
-> validate + inspect structure
-> frame-QA entry, settled, exit, and deterministic reseeks
-> final deterministic render
```

## Add: Semantic component policy

- Visible/editable typography defaults to native `TEXT`, including metrics, labels, badges, verdicts, cards, hooks, and CTAs.
- Transcript-timed typography uses `SUBTITLES`.
- A TEXT badge owns its background/gradient/radius/alignment/outline/shadow/animation when those treatments are runtime-supported.
- Do not create a separate `SHAPE` merely as an ordinary text background. SHAPE is independent geometry, decoration, progress, mask-like layout, or transition content.
- Transition covers use native animated `SHAPE`; do not use empty TEXT as geometry.
- Use `IMAGE` for real image assets: photos, screenshots, logos, illustrations, or supplied raster/vector artwork.
- Raster/SVG typography is an explicit fallback. Record which native limitation requires it and frame-QA it.
- Production-plan overlays default to native TEXT. Use `renderAs: "SVG"` only for a documented compatibility fallback.

## Add: Runtime truth

- Validation is not rendering proof.
- Confirmed visual targets: `TEXT`, `SUBTITLES`, `IMAGE`, `VIDEO`, `GIF`, `SHAPE`, `COLOR`, and `GRADIENT`. AUDIO is nonvisual.
- Pixi animation `x`/`y` are placement-relative offsets. Pivot is fixed center. Supported properties: x, y, opacity, rotation (degrees), scale, scaleX, scaleY.
- `clipColor` is unsupported and strict runtime validation rejects it.
- `appearance.text.padding` supports pixels; absent element-target padding preserves the legacy `0.22em` fallback.
- Active word/line scale and solid `highlightColors` cycling work. Active word wins when both word and line modes are enabled.
- Gradient text should use wrapper-target background when a card background is also needed.
- Browser HTML TEXT and final Pixi-rasterized TEXT can stack differently; verify risky cross-type compositions in final mode.

## Replace QA guidance

For every animated component:

1. Render a pre-entry frame.
2. Render first-active or mid-entry frame.
3. Render settled frame.
4. Render exit frame when applicable.
5. Seek away and back to the same frame; compare state/pixels.

Uniform three-frame QA is not enough for short or late events. Prefer exact production-plan `qa.framesAt` or explicit `--from-frame`/`--to-frame` windows.

```bash
visualfries doctor --json
visualfries catalog --component TEXT --capabilities --json
visualfries validate scene.json --strict-runtime-support
visualfries inspect scene.json --json
visualfries explain scene.json --component <id> --frame <n> --json
visualfries parity scene.json --frames <csv> --output qa/parity --json
visualfries render scene.json --frames-only --from-frame 5 --to-frame 20 --output qa/entry
visualfries render scene.json --frames-only --from-frame 35 --to-frame 36 --output qa/settled
visualfries render scene.json --stream-encode --output out.mp4
```

## Replace the current limitation section

- Cookbook depth is not the only remaining gap.
- Open engine gaps include authorable transform origin, browser/final TEXT stacking parity, clipColor semantics, gradient highlight palettes, generic effects, VIDEO/GIF playback parity, advanced animation anchors/setup, and calibrated preview/final parity metrics.
- Link the installed skill to `docs/AUTHORING_BEST_PRACTICES.md` in the package/repository.
