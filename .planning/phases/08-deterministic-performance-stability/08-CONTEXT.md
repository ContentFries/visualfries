# Phase 8: Deterministic Performance + Stability - Context

## Objective

Deliver a native Visualfries patch that improves deterministic server rendering robustness and throughput without consumer-side hacks.

## Scope

- Crash fix: harden layer/component display-object sync to prevent `setChildIndex` out-of-bounds errors during delayed deterministic attachment and mixed child containers.
- Seek hot-path optimization: reduce deterministic server render retries and remove per-seek font wait overhead.
- Blur optimization: downscale server blur canvas and avoid redundant same-frame redraws.
- Range throughput optimization: remove redundant dirty-frame double seek in `renderFrameRange(skipDuplicates)`.
- Runtime diagnostics: expose aggregate/per-frame counters for readiness attempts, extra render passes, and blur redraws.
- Benchmark visibility: add reproducible benchmark command for single and parallel deterministic rendering scenarios.

## API and Type Changes

`DeterministicMediaConfig` additions (all optional, defaulted by schema):

- `seekMaxAttempts` (default `4`)
- `loadingMaxAttempts` (default `2`)
- `readyYieldMs` (default `0`)
- `blurDownscale` (default `0.33`)

`DeterministicDiagnosticsReport` additions:

- Aggregate counters: `readyAttempts`, `extraRenderPasses`, `blurRedraws`
- `perFrame` counters map keyed by scene frame index

## Acceptance Criteria

1. No deterministic server `setChildIndex` out-of-bounds crashes in layer sync paths.
2. Deterministic VIDEO normal + split + blur renders remain correct in integration coverage.
3. Deterministic strict readiness behavior remains intact.
4. Benchmark shows measurable throughput improvement in optimized configuration.
5. New diagnostics counters are emitted when diagnostics are enabled.

## Benchmark Protocol

Command:

- `pnpm run bench:deterministic`

Scenarios:

- Single runner (`concurrency=1`)
- Parallel runners (`concurrency=4`)
- Baseline-like config (`blurDownscale=1`)
- Optimized config (`blurDownscale=0.33`)

Output metrics:

- `fps`
- `msPerFrame`
- total frames
- blur redraw count

## Tests Added/Updated

- `tests/layers/Layer.syncDisplayObjects.test.ts` (new)
- `tests/perf/deterministic-server-render.perf.test.ts` (new)
- `tests/commands/SeekCommand.deterministic.test.ts`
- `tests/hooks/PixiSplitScreenDisplayObjectHook.test.ts`
- `tests/managers/DeterministicMediaManager.test.ts`
- `tests/sceneBuilder.deterministic.test.ts`
- `tests/schemas/deterministic-runtime.test.ts`

## Notes

- Benchmark is deterministic and informational (no strict CI performance threshold).
- Existing deterministic APIs remain backward-compatible.

