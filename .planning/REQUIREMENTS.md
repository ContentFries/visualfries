# Requirements: Visualfries Deterministic Server Rendering

**Defined:** 2026-02-21
**Core Value:** Backend renderers can obtain a deterministic, timeline-correct frame blob with a 5-line loop — no internal patching, correct split-screen and blur effects, no trailing frames.

## v1 Requirements

### Types

- [x] **TYPE-01**: `DeterministicMediaConfig` Zod schema defined with all fields optional/defaulted (`enabled: false`, `strict: false`, `diagnostics: false`, `provider?: DeterministicFrameProvider`)
- [x] **TYPE-02**: `DeterministicFrameRequest` type defined (`componentId`, `componentType`, `frameIndex`, `fps`, `width`, `height`)
- [x] **TYPE-03**: `DeterministicFramePayload` union type defined — all 4 variants (`url`, `blob`, `arraybuffer`, `imageBitmap`), each with `cacheKey: string`
- [x] **TYPE-04**: `DeterministicFrameProvider` interface defined (`getFrame`, `releaseComponent?`, `destroy?`)
- [x] **TYPE-05**: `DeterministicRenderError` class defined for strict-mode errors (includes `componentId`, `frameIndex`, `sceneTime`)
- [x] **TYPE-06**: `RenderFrameRangeSummary` type defined (`framesRendered`, `framesSkipped`, `aborted`, `diagnostics?`)
- [x] **TYPE-07**: All new public types exported from `src/lib/index.ts` and `src/lib/schemas/runtime/`
- [x] **TYPE-08**: `createSceneBuilder()` config extended with `deterministicMedia?: DeterministicMediaConfig` (optional, Zod-validated)

### Manager

- [x] **MGR-01**: `DeterministicMediaManager` plain TypeScript class (not `.svelte.ts`) implements provider storage, per-component cacheKey tracking, and LRU texture cache
- [x] **MGR-02**: `resolveOverride(componentContext)` method — calls provider `getFrame()`, returns `ResolvedOverride | null`; converts blob/arraybuffer to `PixiJS BufferResource`/`ImageBitmapResource` without using `PIXI.Texture.from()`
- [x] **MGR-03**: `getFingerprint()` method — returns `JSON.stringify` of sorted cacheKey map for cache guard use
- [x] **MGR-04**: LRU texture cache keyed on `cacheKey` string with configurable `maxCachedTextures` (default: `3 × active component count`)
- [x] **MGR-05**: `destroy()` method — releases all cached textures and calls provider `destroy()`
- [x] **MGR-06**: `DeterministicMediaManager` registered as `SINGLETON` in `DIContainer.ts`
- [x] **MGR-07**: `SceneBuilder.setDeterministicFrameProvider(provider | null)` and `getDeterministicFrameProvider()` façade methods added
- [x] **MGR-08**: `SceneBuilder.getDiagnosticsReport()` returns `DiagnosticsReport | null` (aggregate counters: hit/miss, cache hit ratio, per-frame latency min/max; null when diagnostics disabled)

### Hook

- [x] **HOOK-01**: `DeterministicMediaFrameHook` class — server-only hook at explicit numerical priority; handles `setup`, `update` hook types
- [x] **HOOK-02**: On update: calls `DeterministicMediaManager.resolveOverride()`, writes `pixiResource` into `ComponentContext` resource registry when override present
- [x] **HOOK-03**: Writes `imageElement` (or `ImageBitmap`) into context alongside `pixiResource` when payload is blob/arraybuffer, enabling `fillBackgroundBlur` to function correctly
- [x] **HOOK-04**: Calls `state.markDirty()` when cacheKey changes; no-ops when cacheKey unchanged
- [x] **HOOK-05**: Returns null/passes through when provider returns `null` (native media path fallback)
- [x] **HOOK-06**: Throws `DeterministicRenderError` in strict mode when override expected but provider returns `null`
- [x] **HOOK-07**: Hard-exits when `environment !== 'server'` — zero overhead in client mode
- [x] **HOOK-08**: `DeterministicMediaFrameHook` registered as `TRANSIENT` in `DIContainer.ts`
- [x] **HOOK-09**: `PixiVideoTextureHook.#handleUpdate()` gains a pre-supply guard — skips native video path if `pixiResource` is already present in context
- [x] **HOOK-10**: `ComponentDirector.constructVideo()` and `constructGif()` branch at construction time: server+deterministic path attaches `DeterministicMediaFrameHook` chain instead of native media chain (`.withMedia()`, `.withMediaSeeking()`, `.withVideoTexture()` omitted)

### Render Loop

- [x] **REND-01**: `SceneBuilder.renderFrameRange(opts: { fromFrame, toFrame, format, quality?, skipDuplicates?, signal?: AbortSignal, onFrame })` direct method (not a command)
- [ ] **REND-02**: `onFrame` sink callback receives `{ frameIndex, frame, isDuplicate, release }` where `release()` revokes object URLs / frees resources
- [x] **REND-03**: `renderFrameRange` returns `Promise<RenderFrameRangeSummary>`
- [x] **REND-04**: Frame range is `[fromFrame, toFrame)` exclusive-end; output frame count equals exactly `toFrame - fromFrame`
- [x] **REND-05**: Sequential execution — awaits `onFrame` sink before advancing to next frame (back-pressure)
- [x] **REND-06**: Checks `signal.aborted` before each frame; sets `aborted: true` in summary on early exit
- [x] **REND-07**: `renderFrameRange` added to `ISceneBuilder` interface
- [x] **REND-08**: `ReplaceSourceOnTimeCommand` deleted and rebuilt as `DeterministicMediaManager` wrapper (accepts frame override data, maps to provider override; replaces empty stub)

### Cache Guard

- [x] **CACHE-01**: `RenderFrameCommand` extended with `deterministicFingerprint` field as fourth cache-guard check (alongside `isDirty`, `format`, `quality`)
- [x] **CACHE-02**: `DeterministicMediaManager` injected into `RenderFrameCommand` (nullable; no-op when `enabled: false`)

### Diagnostics

- [x] **DIAG-01**: Diagnostics mode collects aggregate counters (provider hit count, miss count, cache hit count, per-frame latency min/max/avg) — not per-frame arrays
- [x] **DIAG-02**: All diagnostic collection wrapped in `try/catch` — never throws, never interrupts render loop
- [x] **DIAG-03**: Diagnostics disabled by default (`diagnostics: false`); zero overhead when disabled

### Tests

- [x] **TEST-01**: Unit test: changed cacheKey updates `pixiResource` and marks dirty
- [x] **TEST-02**: Unit test: same cacheKey does not recreate texture (cache hit)
- [x] **TEST-03**: Unit test: null provider response falls back to native path (no error)
- [x] **TEST-04**: Unit test: strict mode throws `DeterministicRenderError` on missing required override
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

## Follow-up Requirements (Font Stability)

- [x] **FONT-01**: Auto-discover fonts for `TEXT` + `SUBTITLES` components by scene data (default on)
- [x] **FONT-02**: Include all relevant weights from base text, `activeWord`, `activeLine`, and `fontSource.variants`
- [x] **FONT-03**: Build Google CSS2 URLs with explicit weight sets and preload each descriptor via `document.fonts.load`
- [x] **FONT-04**: Keep custom font path supported using equivalent preload semantics where possible (`FontFace` + descriptor load)
- [x] **FONT-05**: Ensure preload ordering happens before scene tree build to avoid first-frame fallback metric jumps
- [x] **FONT-06**: Add regression tests for discovery, descriptor preloading, and initialization ordering in server mode

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
| TYPE-01     | Phase 1 — Types & Interfaces                       | Complete |
| TYPE-02     | Phase 1 — Types & Interfaces                       | Complete |
| TYPE-03     | Phase 1 — Types & Interfaces                       | Complete |
| TYPE-04     | Phase 1 — Types & Interfaces                       | Complete |
| TYPE-05     | Phase 1 — Types & Interfaces                       | Complete |
| TYPE-06     | Phase 1 — Types & Interfaces                       | Complete |
| TYPE-07     | Phase 1 — Types & Interfaces                       | Complete |
| TYPE-08     | Phase 1 — Types & Interfaces                       | Complete |
| MGR-01      | Phase 2 — DeterministicMediaManager                | Complete |
| MGR-02      | Phase 2 — DeterministicMediaManager                | Complete |
| MGR-03      | Phase 2 — DeterministicMediaManager                | Complete |
| MGR-04      | Phase 2 — DeterministicMediaManager                | Complete |
| MGR-05      | Phase 2 — DeterministicMediaManager                | Complete |
| MGR-06      | Phase 2 — DeterministicMediaManager                | Complete |
| MGR-07      | Phase 2 — DeterministicMediaManager                | Complete |
| MGR-08      | Phase 2 — DeterministicMediaManager                | Complete |
| HOOK-01     | Phase 3 — Hook + ComponentDirector Branch          | Complete |
| HOOK-02     | Phase 3 — Hook + ComponentDirector Branch          | Complete |
| HOOK-03     | Phase 3 — Hook + ComponentDirector Branch          | Complete |
| HOOK-04     | Phase 3 — Hook + ComponentDirector Branch          | Complete |
| HOOK-05     | Phase 3 — Hook + ComponentDirector Branch          | Complete |
| HOOK-06     | Phase 3 — Hook + ComponentDirector Branch          | Complete |
| HOOK-07     | Phase 3 — Hook + ComponentDirector Branch          | Complete |
| HOOK-08     | Phase 3 — Hook + ComponentDirector Branch          | Complete |
| HOOK-09     | Phase 4 — PixiVideoTextureHook Guard               | Complete |
| HOOK-10     | Phase 3 — Hook + ComponentDirector Branch          | Complete |
| REND-01     | Phase 6 — renderFrameRange() Render Loop           | Complete |
| REND-02     | Phase 6 — renderFrameRange() Render Loop           | Pending |
| REND-03     | Phase 6 — renderFrameRange() Render Loop           | Complete |
| REND-04     | Phase 6 — renderFrameRange() Render Loop           | Complete |
| REND-05     | Phase 6 — renderFrameRange() Render Loop           | Complete |
| REND-06     | Phase 6 — renderFrameRange() Render Loop           | Complete |
| REND-07     | Phase 6 — renderFrameRange() Render Loop           | Complete |
| REND-08     | Phase 6 — renderFrameRange() Render Loop           | Complete |
| CACHE-01    | Phase 5 — RenderFrameCommand Cache Guard           | Complete |
| CACHE-02    | Phase 5 — RenderFrameCommand Cache Guard           | Complete |
| DIAG-01     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Complete |
| DIAG-02     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Complete |
| DIAG-03     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Complete |
| TEST-01     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Complete |
| TEST-02     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Complete |
| TEST-03     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Complete |
| TEST-04     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Complete |
| TEST-05     | Phase 7 — ReplaceSourceOnTimeCommand + Diagnostics | Pending |

**Coverage:**

- v1 requirements: 44 total (8 TYPE + 8 MGR + 10 HOOK + 8 REND + 2 CACHE + 3 DIAG + 5 TEST)
- Mapped to phases: 44
- Unmapped: 0 ✓

_Note: REQUIREMENTS.md originally stated 41 total; enumeration yields 44. All 44 are mapped._

---

_Requirements defined: 2026-02-21_
_Last updated: 2026-02-21 after font stability follow-up (discovery + explicit preload + ordering tests) and deterministic integration coverage (42/44 deterministic v1 complete; open: REND-02, TEST-05)_
