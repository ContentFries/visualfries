# Requirements: Visualfries Deterministic Server Rendering

**Defined:** 2026-02-21
**Core Value:** Backend renderers can obtain a deterministic, timeline-correct frame blob with a 5-line loop — no internal patching, correct split-screen and blur effects, no trailing frames.

## v1 Requirements

### Types

- [ ] **TYPE-01**: `DeterministicMediaConfig` Zod schema defined with all fields optional/defaulted (`enabled: false`, `strict: false`, `diagnostics: false`, `provider?: DeterministicFrameProvider`)
- [ ] **TYPE-02**: `DeterministicFrameRequest` type defined (`componentId`, `componentType`, `frameIndex`, `fps`, `width`, `height`)
- [ ] **TYPE-03**: `DeterministicFramePayload` union type defined — all 4 variants (`url`, `blob`, `arraybuffer`, `imageBitmap`), each with `cacheKey: string`
- [ ] **TYPE-04**: `DeterministicFrameProvider` interface defined (`getFrame`, `releaseComponent?`, `destroy?`)
- [ ] **TYPE-05**: `DeterministicRenderError` class defined for strict-mode errors (includes `componentId`, `frameIndex`, `sceneTime`)
- [ ] **TYPE-06**: `RenderFrameRangeSummary` type defined (`framesRendered`, `framesSkipped`, `aborted`, `diagnostics?`)
- [ ] **TYPE-07**: All new public types exported from `src/lib/index.ts` and `src/lib/schemas/runtime/`
- [ ] **TYPE-08**: `createSceneBuilder()` config extended with `deterministicMedia?: DeterministicMediaConfig` (optional, Zod-validated)

### Manager

- [ ] **MGR-01**: `DeterministicMediaManager` plain TypeScript class (not `.svelte.ts`) implements provider storage, per-component cacheKey tracking, and LRU texture cache
- [ ] **MGR-02**: `resolveOverride(componentContext)` method — calls provider `getFrame()`, returns `ResolvedOverride | null`; converts blob/arraybuffer to `PixiJS BufferResource`/`ImageBitmapResource` without using `PIXI.Texture.from()`
- [ ] **MGR-03**: `getFingerprint()` method — returns `JSON.stringify` of sorted cacheKey map for cache guard use
- [ ] **MGR-04**: LRU texture cache keyed on `cacheKey` string with configurable `maxCachedTextures` (default: `3 × active component count`)
- [ ] **MGR-05**: `destroy()` method — releases all cached textures and calls provider `destroy()`
- [ ] **MGR-06**: `DeterministicMediaManager` registered as `SINGLETON` in `DIContainer.ts`
- [ ] **MGR-07**: `SceneBuilder.setDeterministicFrameProvider(provider | null)` and `getDeterministicFrameProvider()` façade methods added
- [ ] **MGR-08**: `SceneBuilder.getDiagnosticsReport()` returns `DiagnosticsReport | null` (aggregate counters: hit/miss, cache hit ratio, per-frame latency min/max; null when diagnostics disabled)

### Hook

- [ ] **HOOK-01**: `DeterministicMediaFrameHook` class — server-only hook at explicit numerical priority; handles `setup`, `update` hook types
- [ ] **HOOK-02**: On update: calls `DeterministicMediaManager.resolveOverride()`, writes `pixiResource` into `ComponentContext` resource registry when override present
- [ ] **HOOK-03**: Writes `imageElement` (or `ImageBitmap`) into context alongside `pixiResource` when payload is blob/arraybuffer, enabling `fillBackgroundBlur` to function correctly
- [ ] **HOOK-04**: Calls `state.markDirty()` when cacheKey changes; no-ops when cacheKey unchanged
- [ ] **HOOK-05**: Returns null/passes through when provider returns `null` (native media path fallback)
- [ ] **HOOK-06**: Throws `DeterministicRenderError` in strict mode when override expected but provider returns `null`
- [ ] **HOOK-07**: Hard-exits when `environment !== 'server'` — zero overhead in client mode
- [ ] **HOOK-08**: `DeterministicMediaFrameHook` registered as `TRANSIENT` in `DIContainer.ts`
- [ ] **HOOK-09**: `PixiVideoTextureHook.#handleUpdate()` gains a pre-supply guard — skips native video path if `pixiResource` is already present in context
- [ ] **HOOK-10**: `ComponentDirector.constructVideo()` and `constructGif()` branch at construction time: server+deterministic path attaches `DeterministicMediaFrameHook` chain instead of native media chain (`.withMedia()`, `.withMediaSeeking()`, `.withVideoTexture()` omitted)

### Render Loop

- [ ] **REND-01**: `SceneBuilder.renderFrameRange(opts: { fromFrame, toFrame, format, quality?, skipDuplicates?, signal?: AbortSignal, onFrame })` direct method (not a command)
- [ ] **REND-02**: `onFrame` sink callback receives `{ frameIndex, frame, isDuplicate, release }` where `release()` revokes object URLs / frees resources
- [ ] **REND-03**: `renderFrameRange` returns `Promise<RenderFrameRangeSummary>`
- [ ] **REND-04**: Frame range is `[fromFrame, toFrame)` exclusive-end; output frame count equals exactly `toFrame - fromFrame`
- [ ] **REND-05**: Sequential execution — awaits `onFrame` sink before advancing to next frame (back-pressure)
- [ ] **REND-06**: Checks `signal.aborted` before each frame; sets `aborted: true` in summary on early exit
- [ ] **REND-07**: `renderFrameRange` added to `ISceneBuilder` interface
- [ ] **REND-08**: `ReplaceSourceOnTimeCommand` deleted and rebuilt as `DeterministicMediaManager` wrapper (accepts frame override data, maps to provider override; replaces empty stub)

### Cache Guard

- [ ] **CACHE-01**: `RenderFrameCommand` extended with `deterministicFingerprint` field as fourth cache-guard check (alongside `isDirty`, `format`, `quality`)
- [ ] **CACHE-02**: `DeterministicMediaManager` injected into `RenderFrameCommand` (nullable; no-op when `enabled: false`)

### Diagnostics

- [ ] **DIAG-01**: Diagnostics mode collects aggregate counters (provider hit count, miss count, cache hit count, per-frame latency min/max/avg) — not per-frame arrays
- [ ] **DIAG-02**: All diagnostic collection wrapped in `try/catch` — never throws, never interrupts render loop
- [ ] **DIAG-03**: Diagnostics disabled by default (`diagnostics: false`); zero overhead when disabled

### Tests

- [ ] **TEST-01**: Unit test: changed cacheKey updates `pixiResource` and marks dirty
- [ ] **TEST-02**: Unit test: same cacheKey does not recreate texture (cache hit)
- [ ] **TEST-03**: Unit test: null provider response falls back to native path (no error)
- [ ] **TEST-04**: Unit test: strict mode throws `DeterministicRenderError` on missing required override
- [ ] **TEST-05**: Performance test: blob render path ≥30% faster than base64 on same scene/settings in server env

## v2 Requirements

### Testing

- **V2-TEST-01**: Integration test: 3-video scene — video 1 normal (non-white), video 2 split-screen geometry matches editor, video 3 `fillBackgroundBlur` present
- **V2-TEST-02**: Integration test: output frame count equals `toFrame - fromFrame` (no trailing frames)
- **V2-TEST-03**: Diagnostics tests: hit/miss logs correct, never throws, disabled by default

### Encoding Plugins

- **ENC-01**: ffmpeg.wasm plugin package for browser-only end-to-end pipeline
- **ENC-02**: Mediabunny plugin package (MPL-2.0) integration
- **ENC-03**: "Offthread video" (Remotion-style) decode/cache architecture

## Out of Scope

| Feature                                             | Reason                                                        |
| --------------------------------------------------- | ------------------------------------------------------------- |
| WebSocket ACK protocol / retries / remote transport | cf-worker responsibility; not library concern                 |
| Multi-tab / multi-process orchestration             | External orchestrator responsibility; library is single-scene |
| FFmpeg mux / merge / final encode                   | External; out of v1 scope per spec                            |
| `environment: 'client'` deterministic path          | Server-focused first; client mode is no-op by design          |
| Real-time push (WebSocket) frame delivery           | Transport layer; not library concern                          |
| Remotion-style `delayRender` async suspension       | Fundamentally incompatible with Visualfries frame loop model  |

## Traceability

| Requirement | Phase                                              | Status  |
| ----------- | -------------------------------------------------- | ------- |
| TYPE-01     | Phase 1 — Types & Interfaces                       | Pending |
| TYPE-02     | Phase 1 — Types & Interfaces                       | Pending |
| TYPE-03     | Phase 1 — Types & Interfaces                       | Pending |
| TYPE-04     | Phase 1 — Types & Interfaces                       | Pending |
| TYPE-05     | Phase 1 — Types & Interfaces                       | Pending |
| TYPE-06     | Phase 1 — Types & Interfaces                       | Pending |
| TYPE-07     | Phase 1 — Types & Interfaces                       | Pending |
| TYPE-08     | Phase 1 — Types & Interfaces                       | Pending |
| MGR-01      | Phase 2 — DeterministicMediaManager                | Pending |
| MGR-02      | Phase 2 — DeterministicMediaManager                | Pending |
| MGR-03      | Phase 2 — DeterministicMediaManager                | Pending |
| MGR-04      | Phase 2 — DeterministicMediaManager                | Pending |
| MGR-05      | Phase 2 — DeterministicMediaManager                | Pending |
| MGR-06      | Phase 2 — DeterministicMediaManager                | Pending |
| MGR-07      | Phase 2 — DeterministicMediaManager                | Pending |
| MGR-08      | Phase 2 — DeterministicMediaManager                | Pending |
| HOOK-01     | Phase 3 — Hook + ComponentDirector Branch          | Pending |
| HOOK-02     | Phase 3 — Hook + ComponentDirector Branch          | Pending |
| HOOK-03     | Phase 3 — Hook + ComponentDirector Branch          | Pending |
| HOOK-04     | Phase 3 — Hook + ComponentDirector Branch          | Pending |
| HOOK-05     | Phase 3 — Hook + ComponentDirector Branch          | Pending |
| HOOK-06     | Phase 3 — Hook + ComponentDirector Branch          | Pending |
| HOOK-07     | Phase 3 — Hook + ComponentDirector Branch          | Pending |
| HOOK-08     | Phase 3 — Hook + ComponentDirector Branch          | Pending |
| HOOK-09     | Phase 4 — PixiVideoTextureHook Guard               | Pending |
| HOOK-10     | Phase 3 — Hook + ComponentDirector Branch          | Pending |
| REND-01     | Phase 6 — renderFrameRange() Render Loop           | Pending |
| REND-02     | Phase 6 — renderFrameRange() Render Loop           | Pending |
| REND-03     | Phase 6 — renderFrameRange() Render Loop           | Pending |
| REND-04     | Phase 6 — renderFrameRange() Render Loop           | Pending |
| REND-05     | Phase 6 — renderFrameRange() Render Loop           | Pending |
| REND-06     | Phase 6 — renderFrameRange() Render Loop           | Pending |
| REND-07     | Phase 6 — renderFrameRange() Render Loop           | Pending |
| REND-08     | Phase 6 — renderFrameRange() Render Loop           | Pending |
| CACHE-01    | Phase 5 — RenderFrameCommand Cache Guard           | Pending |
| CACHE-02    | Phase 5 — RenderFrameCommand Cache Guard           | Pending |
| DIAG-01     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Pending |
| DIAG-02     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Pending |
| DIAG-03     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Pending |
| TEST-01     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Pending |
| TEST-02     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Pending |
| TEST-03     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Pending |
| TEST-04     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Pending |
| TEST-05     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Pending |

**Coverage:**

- v1 requirements: 44 total (8 TYPE + 8 MGR + 10 HOOK + 8 REND + 2 CACHE + 3 DIAG + 5 TEST)
- Mapped to phases: 44
- Unmapped: 0 ✓

_Note: REQUIREMENTS.md originally stated 41 total; enumeration yields 44. All 44 are mapped._

---

_Requirements defined: 2026-02-21_
_Last updated: 2026-02-21 after initial definition_
