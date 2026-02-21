# Visualfries — Deterministic Server Rendering

## What This Is

A feature addition to the Visualfries npm library that introduces a first-class deterministic server media rendering API. It adds a `DeterministicFrameProvider` interface, a new `DeterministicMediaManager` + `DeterministicMediaFrameHook`, and a `renderFrameRange()` helper so that backend renderers (e.g. cf-worker + Puppeteer) can drive VIDEO/GIF frames with full timeline correctness — without patching internals or relying on native browser media timing.

## Core Value

Backend renderers can obtain a deterministic, timeline-correct frame blob with a 5-line loop — no internal patching, correct split-screen and blur effects, no trailing frames.

## Requirements

### Validated

- ✓ `environment: 'server'` config flag — existing
- ✓ `RenderEnvironment` type and server-mode branches in `AppManager`, `DomManager`, `MediaHook`, `PixiSplitScreenDisplayObjectHook` — existing
- ✓ `RenderFrameCommand` with server cache optimization — existing
- ✓ `ReplaceSourceOnTimeCommand` compatibility wrapper into deterministic manager — implemented

### Active

- [x] `DeterministicMediaConfig` type added to `createSceneBuilder()` config
- [x] `DeterministicFrameProvider` interface defined in runtime types
- [x] `DeterministicFrameRequest` and `DeterministicFramePayload` types defined
- [x] `DeterministicMediaManager` — stores config/provider, per-component cacheKey + resource cache, strict/diagnostics flags
- [x] `DeterministicMediaFrameHook` — server-only hook for VIDEO/GIF that calls provider and writes pixiResource
- [x] `ComponentDirector` routes VIDEO/GIF through deterministic hook in server mode before texture/display hooks
- [x] `RenderFrameCommand` cache guard includes deterministic media fingerprint
- [x] `SceneBuilder.setDeterministicFrameProvider()` and `getDeterministicFrameProvider()` methods
- [x] `SceneBuilder.renderFrameRange()` helper with sink callback
- [x] `ReplaceSourceOnTimeCommand` compatibility wrapper into `DeterministicMediaManager`
- [x] Unit tests: cacheKey change → pixiResource update; same cacheKey → no recreate; null → native fallback; strict mode throws
- [ ] Integration/performance tests: 3-video scene + frame count + blob ≥30% faster benchmark
- [x] Diagnostics mode: provider hit/miss, cache hit ratio, per-frame latency — disabled by default, never throws
- [x] All new API is backward-compatible; `deterministicMedia.enabled` defaults to `false`

### Out of Scope

- WebSocket ACK protocol, retries, remote transport — owned by cf-worker
- Multi-tab/process orchestration — external orchestrator responsibility
- FFmpeg mux/merge/final encode — external
- Browser final encoding (ffmpeg.wasm, Mediabunny) — v1 interface only; plugins later
- "Offthread video" (Remotion-style) decode/cache architecture — future evolution
- OAuth/auth — not applicable (library)

## Context

**Existing server infrastructure:** `environment: 'server'` is already plumbed through `AppManager` (preserveDrawingBuffer), `DomManager` (off-screen HTML), and several hooks. `RenderFrameCommand` already has a server-side cache path. This work extends that foundation — it does not replace it.

**ReplaceSourceOnTimeCommand:** Rebuilt as a compatibility wrapper that writes one-time deterministic overrides through `DeterministicMediaManager`.

**cf-worker relationship:** cf-worker is a separate repo that consumes `visualfries` as an npm dependency. It spawns Puppeteer tabs and renders scenes into video. The goal is that after this work, cf-worker can switch to the new provider API with ~5 lines of orchestration code and get a correct blob-first render loop.

**Hook architecture:** `ComponentDirector` selects hook chains by component type. Hooks run in priority order via `ComponentContext.runHooks()`. The deterministic hook must run before `PixiTextureHook`/`PixiDisplayObjectHook` so it can write `pixiResource` into the resource registry and short-circuit native media loading — while leaving the existing texture/display hooks to handle effects (layoutSplit, fillBackgroundBlur) unchanged.

**DI wiring pattern:** All new managers and hooks follow the established Awilix pattern: register in `DIContainer.ts` as singleton/transient, inject via cradle, expose through `SceneBuilder` façade if public.

**Test infrastructure:** Vitest + jsdom; Canvas 2D context mocked in `vitest.setup.ts`. Existing test coverage at `tests/hooks/` and `tests/components/`.

## Constraints

- **Backward compatibility:** All new config fields optional; `deterministicMedia.enabled` defaults to `false`; additive API changes only (no removed signatures)
- **Server-only activation:** Deterministic hook path must be a no-op in `environment: 'client'`
- **No WS/transport code in core:** Provider interface accepts blob/arraybuffer/url/imageBitmap payloads; transport stays in consumer
- **Existing effects must remain native:** `PixiTextureHook`, `PixiDisplayObjectHook`, `PixiSplitScreenDisplayObjectHook`, `fillBackgroundBlur` must work unchanged when override is active
- **Diagnostics must never throw:** Opt-in diagnostics flag; if diagnostic logic errors, suppress silently
- **Tech stack:** TypeScript strict mode; Svelte 5 runes for any reactive state; Awilix DI; Zod for any new schema-level types; Vitest for tests

## Key Decisions

| Decision                                                                  | Rationale                                                                                                | Outcome   |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------- |
| Provider-based API over sprite/internal patching                          | Clean interface boundary; lets cf-worker stay external; keeps Visualfries testable                       | ✓ Complete |
| Blob-first transport recommendation                                       | 30%+ faster than base64 per experiment results; arraybuffer as alternative                               | ◐ Pending benchmark confirmation |
| Deterministic hook short-circuits native media only when override present | Native video/media hook chain is omitted in server deterministic mode                                     | ✓ Complete |
| Multi-tab parallelism stays external                                      | Visualfries remains single-scene; orchestration complexity belongs in cf-worker                          | ✓ Complete |
| `ReplaceSourceOnTimeCommand` fate                                         | Empty placeholder — implement as DeterministicMediaManager wrapper or delete+replace; decide at planning | ✓ Complete (wrapper implemented) |
| cacheKey deduplication for frame cache guard                              | `RenderFrameCommand` must include deterministic fingerprint to bypass stale cached frames                | ✓ Complete |
| Deterministic texture swaps in split-screen path                          | Rebuild-on-every-frame is too expensive; update sprite textures in-place on texture identity changes      | ✓ Complete |
| Shared PIXI texture destruction policy                                    | `Texture.from(source)` can return shared instances; use hook-level retain/release instead of eager destroy | ✓ Complete |

---

_Last updated: 2026-02-21 after deterministic focused fix pass + media stability follow-up (42/44 requirements complete)_
