# Next Release Notes (Unreleased)

Recommended semver: **0.2.0**. The schemas remain additive/loadable, but confirmed ignored behavior now evaluates and can change pixels. This deserves a pre-1.0 minor release rather than pretending it is a patch-only change.

## Added

- Typed component capability registry exposed through agent exports and `catalog --component <TYPE> --capabilities --json`.
- Warning-by-default runtime-support diagnostics and `validate --strict-runtime-support` for agents/CI.
- Runtime-backed `explain --component <id> --frame <n>` computed target state.
- Shared deterministic Pixi animation target for IMAGE, VIDEO, GIF, regular/progress SHAPE, COLOR, and GRADIENT.
- Real COLOR and GRADIENT canvas-to-Pixi render paths.
- Native TEXT pixel padding, active word/line scale, and solid highlight palette cycling.

## Behavior fixes / migration notes

- Pixi animation x/y now mean placement-relative translation offsets, matching TEXT and existing swipe/drift helpers. Scenes authored against the short-lived absolute-center IMAGE bridge should subtract the component center from old x/y values.
- `addAgentTransitions` now emits native SHAPE rectangles instead of background-only empty TEXT.
- `visible: false` is preserved by component state and shared visual wrappers.
- Active word wins when active word and active line are both enabled; runtime validation reports the conflict.
- `clipColor` is diagnosed before permissive parsing can silently discard it. Strict runtime validation rejects it.

## Still limited

- Transform origin is fixed-center for Pixi visuals and not authorable across renderers.
- Client HTML TEXT stacking versus final Pixi TEXT remains an architectural parity gap.
- Native GIF timing and VIDEO/GIF loop/playback-rate parity are not guarantees yet.
- Gradient highlight palettes, clipColor semantics, generic effects, and advanced setup/anchor behavior remain unsupported.
- Radial gradient shape/position uses a centered max-radius fallback.
