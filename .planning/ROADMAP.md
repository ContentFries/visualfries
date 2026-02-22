# Roadmap: Visualfries Deterministic Server Rendering

## Overview

This milestone adds a first-class deterministic server media rendering API to the Visualfries library. Starting from zero implementation (existing server infrastructure already in place), seven phases build the type contracts, manager, hook chain, cache guard, render loop, and diagnostics — in strict dependency order — so that a backend renderer can drive VIDEO/GIF frames with full timeline correctness using a 5-line loop.

## Phases

- [x] **Phase 1: Types & Interfaces** — Define all public contracts; zero implementation
- [x] **Phase 2: DeterministicMediaManager** — Singleton manager with LRU cache and fingerprint
- [x] **Phase 3: Hook + ComponentDirector Branch** — Core feature; server-only hook chain replaces native media chain
- [x] **Phase 4: PixiVideoTextureHook Guard** — Minimal two-line guard isolating touch to existing production code
- [x] **Phase 5: RenderFrameCommand Cache Guard** — Fingerprint-based cache staleness defence
- [ ] **Phase 6: renderFrameRange() Render Loop** — Public API entry point; sequential frame loop with back-pressure
- [ ] **Phase 7: ReplaceSourceOnTimeCommand + Diagnostics** — Cleanup, compat wrapper, and opt-in observability
- [x] **Phase 8: Deterministic Performance + Stability** — Server crash fix + deterministic throughput optimization + perf diagnostics

---

## Phase Details

### Phase 1: Types & Interfaces

**Goal**: All public type contracts exist and are exported; downstream phases compile against stable shapes.

**Depends on**: Nothing (first phase)

**Requirements**: TYPE-01, TYPE-02, TYPE-03, TYPE-04, TYPE-05, TYPE-06, TYPE-07, TYPE-08

**Success Criteria** (what must be TRUE):

1. `DeterministicMediaConfig` Zod schema compiles with all fields optional/defaulted — importing it with no arguments produces `{ enabled: false, strict: false, diagnostics: false }`
2. `DeterministicFrameProvider`, `DeterministicFrameRequest`, `DeterministicFramePayload` (all 4 variants with `cacheKey`), `DeterministicRenderError`, and `RenderFrameRangeSummary` are all importable from `src/lib/index.ts`
3. `createSceneBuilder()` config accepts `deterministicMedia?: DeterministicMediaConfig` without TypeScript errors; existing callers without the field continue to compile unchanged
4. TypeScript strict mode passes with zero new errors after Phase 1 changes

**Plans**: TBD

Plans:

- [x] 01-01: Define Zod schemas and TypeScript types (TYPE-01–06)
- [x] 01-02: Extend createSceneBuilder config + export all types from index (TYPE-07–08)

---

### Phase 2: DeterministicMediaManager

**Goal**: The singleton manager is implemented, tested in isolation, and wired into SceneBuilder — provider storage, per-component cacheKey tracking, LRU texture cache, and fingerprint generation all work correctly.

**Depends on**: Phase 1

**Requirements**: MGR-01, MGR-02, MGR-03, MGR-04, MGR-05, MGR-06, MGR-07, MGR-08

**Success Criteria** (what must be TRUE):

1. `resolveOverride()` called twice with the same `cacheKey` returns the cached texture on the second call (no second `getFrame()` invocation)
2. `resolveOverride()` with a null provider response returns `null` without throwing
3. LRU eviction removes the oldest entry when `maxCachedTextures` is exceeded, and `destroy()` releases all cached textures
4. `getFingerprint()` returns a deterministic string; changing one component's cacheKey produces a different fingerprint
5. `SceneBuilder.setDeterministicFrameProvider(provider)` / `getDeterministicFrameProvider()` are callable and round-trip correctly; `getDiagnosticsReport()` returns `null` when diagnostics disabled

**Plans**: TBD

Plans:

- [x] 02-01: Implement DeterministicMediaManager class with provider storage, cacheKey tracking, LRU cache, and fingerprint (MGR-01–05)
- [x] 02-02: DI registration, SceneBuilder façade, and unit tests (MGR-06–08)

---

### Phase 3: Hook + ComponentDirector Branch

**Goal**: The `DeterministicMediaFrameHook` runs server-side at correct priority, writes `pixiResource` and `imageElement`/`ImageBitmap` into ComponentContext, and `ComponentDirector` constructs VIDEO/GIF components with the deterministic chain (not the native media chain) in server+deterministic mode.

**Depends on**: Phase 2

**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04, HOOK-05, HOOK-06, HOOK-07, HOOK-08, HOOK-10

**Success Criteria** (what must be TRUE):

1. In server mode with a live provider, a VIDEO component's `pixiResource` is set from the provider's payload — native `HTMLVideoElement` loading is never triggered
2. In client mode (`environment: 'client'`), `DeterministicMediaFrameHook` is a complete no-op — zero observable overhead
3. When the provider returns `null`, the hook passes through without error and the native fallback path remains active
4. When strict mode is enabled and the provider returns `null`, `DeterministicRenderError` is thrown with `componentId`, `frameIndex`, and `sceneTime`
5. `fillBackgroundBlur` receives a usable `imageElement` or `ImageBitmap` alongside `pixiResource` when the payload is blob/arraybuffer — blur renders correctly, not black

**Plans**: TBD

Plans:

- [x] 03-01: Implement DeterministicMediaFrameHook (HOOK-01–08)
- [x] 03-02: ComponentDirector branch for VIDEO/GIF + DI registration (HOOK-10)

---

### Phase 4: PixiVideoTextureHook Guard

**Goal**: `PixiVideoTextureHook.#handleUpdate()` skips its native video path when `pixiResource` is already present in ComponentContext — preventing dual-path activation without touching any other existing hook.

**Depends on**: Phase 3

**Requirements**: HOOK-09

**Success Criteria** (what must be TRUE):

1. When `pixiResource` is pre-supplied in ComponentContext, `PixiVideoTextureHook` constructs a texture from it and returns early — `VideoResource` polling never fires
2. When `pixiResource` is absent, `PixiVideoTextureHook` behaves identically to before Phase 4 — no regression in client mode or native server mode

**Plans**: TBD

Plans:

- [x] 04-01: Add pre-supply guard to PixiVideoTextureHook (HOOK-09)

---

### Phase 5: RenderFrameCommand Cache Guard

**Goal**: `RenderFrameCommand` extends its cache check with a `deterministicFingerprint` field — stale frames cannot be returned after a provider cacheKey change, even if `isDirty` was cleared early.

**Depends on**: Phase 2 (`getFingerprint()` API must exist)

**Requirements**: CACHE-01, CACHE-02

**Success Criteria** (what must be TRUE):

1. After a cacheKey change on any component, the next `RenderFrameCommand.execute()` produces a fresh render — returning a stale cached blob is not possible
2. When `deterministicMedia.enabled` is `false`, the fingerprint check is a no-op — zero behavior change for existing callers

**Plans**: TBD

Plans:

- [x] 05-01: Extend RenderFrameCommand with deterministicFingerprint cache guard (CACHE-01–02)

---

### Phase 6: renderFrameRange() Render Loop

**Goal**: `SceneBuilder.renderFrameRange()` is implemented as a direct method, produces exactly `toFrame - fromFrame` frames in `[fromFrame, toFrame)` exclusive-end order, awaits the sink before advancing (back-pressure), and is added to `ISceneBuilder`.

**Depends on**: Phases 1–5 (all plumbing must be complete)

**Requirements**: REND-01, REND-02, REND-03, REND-04, REND-05, REND-06, REND-07, REND-08

**Success Criteria** (what must be TRUE):

1. `renderFrameRange({ fromFrame: 0, toFrame: 30, onFrame })` invokes `onFrame` exactly 30 times (frames 0–29); the returned summary has `framesRendered: 30`
2. The `release()` function provided to `onFrame` correctly revokes object URLs / frees resources; no blob URL memory leak occurs across a long render job
3. Aborting via `AbortSignal` mid-render stops at the next frame boundary and sets `aborted: true` in the summary
4. `onFrame` is always awaited before the next frame advances — passing a slow sink does not cause frames to pile up
5. `renderFrameRange` is present on `ISceneBuilder` interface; calling it through the interface compiles without errors

**Plans**: TBD

Plans:

- [ ] 06-01: Implement renderFrameRange() on SceneBuilder + ISceneBuilder (REND-01–07)
- [ ] 06-02: ReplaceSourceOnTimeCommand rebuild + unit/performance tests (REND-08)

---

### Phase 7: ReplaceSourceOnTimeCommand + Diagnostics

**Goal**: The empty `ReplaceSourceOnTimeCommand` stub is replaced with a working `DeterministicMediaManager` wrapper, and opt-in diagnostics collection is implemented — never throwing, disabled by default, with aggregate counters accessible via `SceneBuilder.getDiagnosticsReport()`.

**Depends on**: Phase 2 (manager must exist); can be built in parallel with Phase 6

**Requirements**: DIAG-01, DIAG-02, DIAG-03, TEST-01, TEST-02, TEST-03, TEST-04, TEST-05

**Success Criteria** (what must be TRUE):

1. With `diagnostics: true`, `getDiagnosticsReport()` returns an object with `providerHits`, `providerMisses`, `cacheHitRatio`, and `latency` fields populated after a render run
2. With `diagnostics: false` (default), `getDiagnosticsReport()` returns `null` and zero diagnostic overhead is incurred
3. A bug inside diagnostic collection code never propagates — the render loop continues normally; only the diagnostic counters are silently skipped
4. Unit tests pass: changed cacheKey → pixiResource updated + dirty; same cacheKey → cache hit (no recreate); null provider → native fallback; strict mode → `DeterministicRenderError`
5. Blob render path benchmarks ≥30% faster than base64 on the same server-mode scene

**Plans**: TBD

Plans:

- [x] 07-01: Diagnostics implementation in DeterministicMediaManager + getDiagnosticsReport() (DIAG-01–03)
- [ ] 07-02: Unit tests and blob vs base64 performance test (TEST-01–05)

---

### Phase 8: Deterministic Performance + Stability

**Goal**: Eliminate deterministic server layer ordering crashes, reduce deterministic seek/render hot-path overhead, optimize blur-heavy server rendering, and expose runtime counters for tuning and benchmark visibility.

**Depends on**: Phases 2–7

**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, PERF-05

**Success Criteria** (what must be TRUE):

1. `Layer.syncDisplayObjects()` and component reordering never throw out-of-bounds `setChildIndex` errors under delayed deterministic display object attach or mixed container children
2. Deterministic server seek path uses configurable bounded retries (`seekMaxAttempts`, `loadingMaxAttempts`, `readyYieldMs`) and avoids per-seek unconditional font readiness waits
3. Server blur path uses downscaled offscreen canvas (`blurDownscale`) and avoids redundant same-frame blur redraws
4. `renderFrameRange(skipDuplicates: true)` avoids redundant dirty-frame double seek while preserving duplicate semantics
5. Diagnostics report includes aggregate + per-frame runtime counters (`readyAttempts`, `extraRenderPasses`, `blurRedraws`) and benchmark harness reports single + parallel throughput

Plans:

- [x] 08-01: Layer sync safety + ordering hardening (PERF-01)
- [x] 08-02: SeekCommand deterministic fast path + tunables (PERF-02)
- [x] 08-03: Server blur downscale + redraw dedupe (PERF-03)
- [x] 08-04: Deterministic range loop throughput cleanup (PERF-04)
- [x] 08-05: Diagnostics counters + benchmark harness + regression tests (PERF-05)

---

## Progress

**Execution Order**: 1 → 2 → 3 → 4 → 5 → 6 → 7 (Phase 5 can run in parallel with Phases 3–4; Phase 7 can run in parallel with Phase 6)

| Phase                                       | Plans Complete | Status      | Completed |
| ------------------------------------------- | -------------- | ----------- | --------- |
| 1. Types & Interfaces                       | 2/2            | Complete    | 2026-02-21 |
| 2. DeterministicMediaManager                | 2/2            | Complete    | 2026-02-21 |
| 3. Hook + ComponentDirector Branch          | 2/2            | Complete    | 2026-02-21 |
| 4. PixiVideoTextureHook Guard               | 1/1            | Complete    | 2026-02-21 |
| 5. RenderFrameCommand Cache Guard           | 1/1            | Complete    | 2026-02-21 |
| 6. renderFrameRange() Render Loop           | 0/2            | In progress | -         |
| 7. ReplaceSourceOnTimeCommand + Diagnostics | 1/2            | In progress | -         |
| 8. Deterministic Performance + Stability    | 5/5            | Complete    | 2026-02-22 |

### Follow-up Fixes (2026-02-21)

- [x] FONT-01: Native TEXT/SUBTITLES font auto-discovery added (activeWord/activeLine weights + `fontSource.variants`)
- [x] FONT-02: Explicit variant preload implemented (`fonts.googleapis.com/css2` + per-descriptor `document.fonts.load`)
- [x] FONT-03: SceneBuilder initialization now awaits descriptor preload before app/scene build
- [x] FONT-04: Custom-font preload path implemented with `FontFace` where available; failures warn and continue
- [x] FONT-05: Added regression tests for discovery, preload calls, and initialization ordering
- [x] BLOB-01: Added explicit blob encoding options (`imageFormat`, `imageQuality`) for frame rendering APIs
- [x] BLOB-02: `RenderFrameCommand` now maps blob `jpg/png` to deterministic MIME via `canvas.toBlob(cb, mime, quality)`
- [x] BLOB-03: `renderFrameRange` now forwards blob encoding options and emits `mimeType` metadata in frame callbacks
- [x] BLOB-04: Added JPEG/PNG signature tests and deterministic `renderFrameRange` JPG-mode coverage
- [x] PERF-01: Layer/component display-object sync now clamps indexes and safely reattaches delayed deterministic display objects
- [x] PERF-02: SeekCommand deterministic server path now uses one-time font gate + configurable bounded retries
- [x] PERF-03: Server blur path now supports configurable downscale and same-frame redraw dedupe
- [x] PERF-04: `renderFrameRange(skipDuplicates)` dirty path now renders from prepared seek state (no redundant second seek)
- [x] PERF-05: Added aggregate/per-frame runtime diagnostics counters and deterministic benchmark harness (`bench:deterministic`)
- [x] PERF-06: Blur radius now scales with blur downscale factor; deterministic zero-yield retries use `setImmediate` when available

---

_Roadmap created: 2026-02-21_
_Last synced: 2026-02-22 (deterministic track: phase 8 delivered; runtime perf/stability patch complete with crash regression, seek/blur optimizations, runtime diagnostics counters, benchmark harness, and follow-up blur/yield tuning)_
