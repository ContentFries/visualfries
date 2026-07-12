# VisualFries Authoring System Audit

Date: 2026-07-12

Scope: schema/runtime truth, semantic component selection, visual animation, TEXT compositing, agent diagnostics, preview/final parity, and real frame QA. The current repo is authoritative. The browser/WebGL/MediaBunny worktree was evidence only; browser export was not blindly ported.

## Findings, evidence, disposition

| Severity | Finding                                                                                                                               | Evidence                                                                                     | Disposition                                                                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | Schema accepted animation data for every component although construction attached `AnimationHook` only to TEXT/SUBTITLES/IMAGE.       | Base component schema versus `ComponentDirector`; browser regression from the Funeral short. | Fixed for every visual type through a shared Pixi wrapper target; AUDIO remains explicitly nonvisual. Registry/director synchronization tests prevent silent drift.                                                                      |
| Critical | COLOR and GRADIENT validated but had no render hook.                                                                                  | `ComponentDirector` returned bare components.                                                | Fixed with canvas fills, Pixi texture/display construction, shared animation target, tests, and frame-QA scene coverage.                                                                                                                 |
| High     | IMAGE x/y bridge used absolute-center semantics that contradicted TEXT and authored drift/swipe helpers.                              | `PixiAnimationTarget`, b-roll helpers, transition helpers.                                   | Fixed: all Pixi x/y are placement-relative offsets around a fixed-center outer wrapper. Migration note added.                                                                                                                            |
| High     | Unsupported runtime fields could validate silently.                                                                                   | Base animation catchalls, permissive nested TEXT parsing, effect schemas.                    | Fixed materially: capability registry, default warnings, strict runtime-support gate, property/selector/effect/text conflict diagnostics, and pre-parse clipColor detection. Unknown string presets still need deeper static resolution. |
| High     | Production-plan visible typography defaulted to raster/SVG.                                                                           | Overlay schema/compiler.                                                                     | Fixed: native TEXT is default; SVG remains explicit documented fallback.                                                                                                                                                                 |
| High     | Transition helpers used empty TEXT as full-frame geometry.                                                                            | Agent transition helper and regressions.                                                     | Fixed: helpers now emit animated native SHAPE rectangles.                                                                                                                                                                                |
| High     | Browser HTML TEXT and final Pixi-rasterized TEXT do not share one stacking representation.                                            | `DomManager`, `HtmlTextHook`, `HtmlToCanvasHook`.                                            | Calibrated parity now passes for supported stacking in the torture scene. Arbitrary HTML/Pixi cross-layer interleaving remains an explicit architectural limitation.                                                                       |
| Critical | Generated browser harness replaced EventEmitter3 with a shim that discarded listener context, breaking Pixi WebGL prerender and texture updates. | Browser stacks at `BatchRenderer.onPrerender` (`_flushId`) and `Texture.onBaseTextureUpdated` (`noFrame`). | Fixed with a context/once/removal-compatible shim and regression. Browser IMAGE/VIDEO/GIF/SHAPE/COLOR/GRADIENT now render with zero runtime errors. |
| High     | Client seek returned before its asynchronous render and newly attached animation timelines settled.                                   | `TimelineManager.seek`, `RenderManager` queue, sparse browser captures.                       | Fixed: both renderer paths now render, re-seek after lazy construction, render again, and the harness performs an initialized seek barrier.                                                                                               |
| High     | Preview and final used different hard-coded canvas backgrounds and ignored scene background.                                          | `AppManager` renderer options.                                                               | Fixed: both paths use the solid scene background contract; gradient scene backgrounds still require a GRADIENT component.                                                                                                                |
| Medium   | Unconfigured system fonts were treated as Google Fonts, creating CORS failures and nondeterministic fallback noise.                    | Font discovery and SVG text generation.                                                      | Fixed: remote font loading is explicit; unconfigured Arial/system families stay local.                                                                                                                                                   |
| Medium   | TEXT padding, active scale, and highlight palette fields were absent/ignored.                                                         | TEXT schema/builders/highlighter builders.                                                   | Fixed: px padding, active word/line scale, solid palette cycling, reset coverage, and deterministic active-word precedence.                                                                                                              |
| Medium   | Active-line reset restored background styling instead of glyph color.                                                                 | `LineHighlighterAnimationBuilder`.                                                           | Fixed and asserted explicitly.                                                                                                                                                                                                           |
| Medium   | `clipColor` was silently stripped by permissive nested parsing and had no defined semantics.                                          | Runtime/schema search plus parse behavior.                                                   | Not invented. Warned by default, rejected by strict gate, documented as open semantic design.                                                                                                                                            |
| Medium   | `visible: false` became true in component state.                                                                                      | Truthy fallback in `_ComponentState`.                                                        | Fixed with nullish default and shared wrapper visibility enforcement.                                                                                                                                                                    |
| Medium   | Same-layer order, component teardown, structured shadow/outline, wrapper transform ownership, and radius units had confirmed defects. | Prior audit source/render tests.                                                             | Fixed in the current uncommitted audit set with regression coverage.                                                                                                                                                                     |
| High     | Scene teardown destroyed Pixi before async component hooks completed, while manager listeners could not be removed by identity.          | `SceneBuilder.destroy`, `ComponentsManager.destroy`, `EventManager.on`, `RenderManager`.       | Fixed: component/media teardown is awaited before Pixi/DOM destruction; registered callback identities are detached and covered by lifecycle regressions.                                                                                |

## Runtime truth

- TEXT/SUBTITLES: HTML animation target; TEXT selectors include container, words, lines, chars, and CSS.
- IMAGE/VIDEO/GIF/SHAPE/COLOR/GRADIENT: stable outer Pixi target with relative x/y, opacity, degree rotation, scale, scaleX, and scaleY. Pixi selectors support container only.
- AUDIO: no visual target and no visual animation claim.
- Visual timing is component-relative; disabled global/list entries do not evaluate; destroy reverts/kills timelines.
- Pixi transform origin is fixed component center and not authorable.
- COLOR supports CSS-color canvas fill including alpha. GRADIENT supports linear/radial canvas fills; radial shape/position currently falls back to centered max radius.

## TEXT/compositing truth

- Paint/style merge order is component background, glyph fill/gradient, then text effects. Active highlight background is a separate element behind split glyphs.
- Wrapper-target background is preferred for badges/cards and required when both background and glyph are gradients.
- Element-target gradient background plus gradient glyph fill is diagnosed because both use `background-image` on the inner element.
- Pixel padding is authorable through `appearance.text.padding`; absent element-target padding keeps the prior `0.22em` fallback.
- Active word/line scale and solid `highlightColors` work. Active word takes precedence if both modes are enabled. Gradient highlight palettes remain unsupported.
- Structured solid outline and structured shadow work. Dashed/dotted outline and generic effects remain unsupported/incomplete.

## Agent contract

```bash
visualfries catalog --component TEXT --capabilities --json
visualfries validate scene.json                    # compatible load + explicit warnings
visualfries validate scene.json --strict-runtime-support
visualfries inspect scene.json --json
visualfries explain scene.json --component <id> --frame <n> --json
```

`explain` seeks the actual browser runtime and reads the chosen HTML/Pixi target; it does not approximate easing in a separate static evaluator.

## Verification state

- `pnpm exec vitest run`: 64/64 files, 439/439 tests passed.
- `pnpm run check`: 0 errors; 8 pre-existing docs/accessibility/CSS warnings.
- `pnpm run build`: passed; `pnpm run package` and standalone `pnpm exec publint` passed.
- A local runtime-truth torture scene passed strict runtime validation with 0 issues across 9 visual components. Generated QA inputs and outputs are intentionally not committed.
- Real deterministic final render: 46 frames; frames 0, 9, 18, 30, and 45 visually reviewed.
- Sparse forward/back/reseek `[18, 30, 18]`: repeated frame 18 matched exactly at SHA-256 `5e30d8dd44ed7cd9ee7ecca8dd6f48dcbf8a48adfd4ac11b47d0eb3d1645636b`.
- Runtime `explain` at SHAPE frame 18 returned the actual Pixi target and computed x/y/opacity/rotation/scales.
- Browser/final parity is green on frames 0, 9, 18, 30, and 45. Raw whole-frame SSIM is `0.926262–0.999791`; semantic SSIM is `0.967344–0.999804`. Same-Pixi settled ROIs are `0.995803–1.0` raw, TEXT/SUBTITLES are `0.997588–0.999813`, and zero browser/final runtime or resource errors were recorded.
- Forward/reverse order `[0,9,18,30,45,45,30,18,9,0]` is stable. Frames 9/18/30/45 are byte-exact in both paths; final frame 0 repeats at SSIM `0.999791` because SVG text rasterization differs by at most three luma levels.
- A local contact sheet and parity manifest were reviewed across preview, final, and amplified-difference outputs; generated files are intentionally not committed.
- `git diff --check`: clean. No commit, push, merge, publish, or global-skill modification occurred.

## Open limitations

1. Browser HTML typography is always above the shared Pixi canvas. Arbitrary TEXT/Pixi cross-layer interleaving can still differ from final ordering; the supported torture composition keeps typography above Pixi visuals.
2. Native GIF and deterministic ffmpeg decoding differ in palette dithering. Raw GIF ROI reaches `0.539`; 2px semantic SSIM is `0.977`, confirming matching structure/color fields without pretending pixels are identical.
3. Native browser VIDEO and predecoded final VIDEO use different decode/color paths; current ROI semantic SSIM is `0.939–0.998`. Exact media-frame identity needs a future PTS contract for half-frame starts.
4. Plain absolute local paths now load, but relative paths are still resolved from process cwd rather than the scene file directory, and assetId-only component sources still need runtime hydration from the asset registry.
5. Final frame-0 SVG text reseek is visually stable (`0.999791`) but not byte-exact. Other sampled forward/back reseeks are exact.
6. Transform origin is not authorable across visual renderers.
7. `clipColor` semantics, gradient highlight palettes, generic effects, dashed/dotted outline, and animation setup steps remain unsupported.
8. Unknown system animation preset names are still resolved at construction time rather than fully diagnosed statically.
9. Advanced animation center/end anchors and active-line transcript timing remain limited.
10. Radial gradient shape/position fields use a centered fallback.
11. Browser export remains a separate next phase; the MediaBunny spike was not promoted without the higher-priority runtime-truth/parity gates.

## Honest readiness score

| Dimension | Score | Reason |
| --- | ---: | --- |
| Creative speed | 8.3/10 | Semantic helpers, native transitions, and capability discovery remove substantial source-reading. |
| Runtime trust | 8.2/10 | Strict runtime gate and construction-synchronized registry close the largest silent-success gaps. Unknown preset resolution remains. |
| Editability | 8.7/10 | Native TEXT defaults, padding/highlighting, SHAPE transitions, and raw JSON output preserve authorability. |
| Determinism | 8.2/10 | Shared targets and frames 9/18/30/45 reseek exactly; frame-0 SVG text is visually stable rather than byte-exact, and native media timing caveats remain. |
| Debugging | 8.0/10 | Runtime-backed explain plus stable capability IDs are useful; deeper preset/effect state could improve. |
| Agent ergonomics | 8.1/10 | Catalog, strict validate, inspect, explain, docs, examples, and release notes form a coherent loop. |
| Preview/final parity | 8.2/10 | Zero missing visuals/errors; semantic whole-frame and all class ROIs pass. Cross-layer HTML/Pixi ordering and decoder-level pixel differences remain. |
| Production readiness | 8.0/10 | Agent-visible runtime truth plus green supported-path parity clears the 8/10 bar. Relative/assetId media hydration and arbitrary mixed stacking still block 9/10. |
