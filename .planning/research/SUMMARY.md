# Research Summary: Visualfries Deterministic Server Rendering

**Synthesized:** 2026-02-21  
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md  
**Overall Confidence:** HIGH — all findings sourced directly from the live codebase or verified API documentation.

---

## Executive Summary

Visualfries needs a `DeterministicMediaManager` subsystem that lets an external caller (a Cloudflare Worker) supply pre-decoded pixel frames for VIDEO and GIF components during server-side rendering, replacing the native HTMLVideoElement path with a deterministic frame injection path. The library already has everything it needs: PixiJS 7.4.3's `BufferResource`/`ImageBitmapResource`/`BaseTexture.setResource()` APIs, an existing hook chain with a clear priority slot for the new hook, an Awilix DI container that already patterns singleton managers and transient hooks correctly, and a `SeekCommand` + `RenderFrameCommand` pair that together handle the per-frame render loop.

The recommended architecture is a **pure overlay**: a `DeterministicMediaFrameHook` at priority 4 writes `pixiResource` into `ComponentContext` before `PixiVideoTextureHook` at priority 5 reads it, with a two-line guard added to `PixiVideoTextureHook` to skip the native video path when `pixiResource` is pre-supplied. The `ComponentDirector.constructVideo()` must branch at construction time — the server+deterministic path skips `.withMedia()`, `.withMediaSeeking()`, and `.withVideoTexture()` entirely; it does not merely add the new hook on top of the native chain. This branching choice is the single most critical architectural decision, and getting it wrong causes 4 distinct pitfalls (P1.1, P1.4, P3.2, P3.4).

The public API surface is: `DeterministicFrameProvider` interface (what cf-worker implements), `SceneBuilder.setDeterministicFrameProvider()` (wiring), and `SceneBuilder.renderFrameRange(fromFrame, toFrame, sink, options)` (the render loop). `renderFrameRange` must be a direct `SceneBuilder` method — not a command — because it is multi-step orchestration with a streaming sink callback. All frame cache deduplication is driven by `cacheKey` strings supplied by the provider; same cacheKey = cached texture reuse, different cacheKey = hot-swap via `setResource()` + `markDirty()`.

---

## Key Findings

### Stack

- **Zero new npm dependencies.** Use `PIXI.BufferResource`, `PIXI.ImageBitmapResource`, and `PIXI.BaseTexture.setResource()` from the already-installed `pixi.js-legacy@7.4.3` for all frame injection. `PIXI.CanvasResource` is the canonical server path when `forceCanvas: true`.
- **Plain TypeScript, not Svelte runes.** `DeterministicMediaManager` should be a plain `.ts` class (matching `MediaManager.ts`), not `.svelte.ts`. Frame cache state is not reactive UI state; runes add runtime overhead with zero benefit here.
- **Do not use `PIXI.Texture.from()` for deterministic frames.** It hits Pixi's global TextureCache and creates destruction-order bugs. Always construct `new BufferResource() → new BaseTexture() → new Texture()` explicitly to bypass the cache.

### Table Stakes Features

1. **`DeterministicFrameProvider` interface** with `getFrame(DeterministicFrameRequest): Promise<DeterministicFramePayload | null>`, `releaseComponent(componentId)`, and `destroy()` — the typed contract cf-worker implements.
2. **`DeterministicFramePayload` with `cacheKey`** — the `cacheKey` string is the load-bearing deduplication primitive; all payload variants (blob, arraybuffer, imageBitmap, url) must carry one.
3. **`deterministicMedia.enabled` defaults to `false`** — existing consumers must be unaffected; null provider must transparently fall through to native media path, not error.
4. **`SceneBuilder.renderFrameRange(fromFrame, toFrame, sink, options)`** — sequential async frame loop with abort signal, progress callback, and `RenderFrameRangeSummary` return; must await sink before advancing to next frame (back-pressure).
5. **Server-only activation guard** — `DeterministicMediaFrameHook` must hard-exit when `environment !== 'server'`; `ComponentDirector.constructVideo()` must use a server+deterministic build branch, not additive hook insertion.

### Critical Architecture Decisions

1. **`ComponentDirector.constructVideo()` branches at construction time.** The server+deterministic path skips the entire native media chain (`.withMedia()`, `.withMediaSeeking()`, `.withVideoTexture()`). Do not insert the deterministic hook on top of the native chain — dual activation causes clobbered textures, `VideoResource` polling, and seek interference (P1.1, P1.4, P3.4).

2. **Hook at priority 4; guard added to `PixiVideoTextureHook` at priority 5.** The deterministic hook writes `pixiResource`; `PixiVideoTextureHook` checks for `pixiResource` at top of `#handleUpdate()` and skips its native path if present. `PixiDisplayObjectHook` and `PixiSplitScreenDisplayObjectHook` need zero changes. All existing hooks currently share `priority: 1` (de-facto ordered by insertion); the new hook needs an **explicit** numerical priority to guarantee ordering independent of insertion sequence.

3. **`DeterministicMediaManager` as SINGLETON; `DeterministicMediaFrameHook` as TRANSIENT.** Singleton manager = shared provider ref, shared texture cache, and shared fingerprint across all components in a scene. Transient hook = one per component with its own `ComponentContext`. Getting these lifetimes backwards produces unfixable cache miss or context corruption bugs (P5.3).

4. **`cacheKey`-keyed texture cache with LRU eviction.** Cache is keyed on `cacheKey` string only (never on Blob/ArrayBuffer object identity). Add `maxCachedTextures` config with default of `3 × active VIDEO component count`. Without eviction, a 900-frame render at 3 components = 2700 cached textures = GPU OOM (P2.4).

5. **`RenderFrameCommand` cache guard extended with `deterministicFingerprint`.** The fingerprint is `JSON.stringify([...cacheKeyMap.entries()].sort())`. Add as a fourth cache-guard check alongside `isDirty`, `format`, and `quality`. This is defence-in-depth: prevents returning stale frames if `isDirty` was cleared before the command runs (P2.3).

### Watch Out For

| #                      | Pitfall                                                                                                                | Prevention                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **P1.1**               | Dual-path activation: native hooks fire alongside deterministic hook, clobbering `pixiTexture`                         | Branch in `ComponentDirector.constructVideo()` — server+deterministic path is its own hook chain, not an addition       |
| **P1.3**               | `fillBackgroundBlur` silently draws black — reads `imageElement`/`videoElement` (not `pixiTexture`) for Canvas 2D blur | Write `imageElement` (or `ImageBitmap`) into context alongside `pixiResource` when supplying a blob payload             |
| **P2.1 / P2.3**        | `isDirtyFlag` not set when deterministic hook writes new frame → `RenderFrameCommand` returns stale cached blob        | Call `state.markDirty()` on every cacheKey change; extend cache guard with `deterministicFingerprint`                   |
| **P4.3**               | Blob URL memory leak: object URLs not revoked during long render jobs (900 frames × 6MB = 5.4GB heap)                  | Sink callback receives explicit `release()` function; `renderFrameRange` awaits sink before advancing                   |
| **P5.1 / P5.2 / P5.4** | Schema breaking change, missing `ISceneBuilder` update, or new types not exported from `index.ts`                      | Zod `.optional()` defaults everywhere; update `ISceneBuilder` interface; add to `runtime/index.ts`; run `publint` in CI |

---

## Recommended Build Order

Dependencies flow strictly bottom-to-top. Each phase is a coherent deliverable.

### Phase 1 — Types and Interfaces (no implementation deps)

Define all public types with zero implementation:

- `DeterministicMediaConfig` (Zod schema, all fields `.optional()` / `.default(false)`)
- `DeterministicFrameRequest`, `DeterministicFramePayload` (all 4 variants + `cacheKey`)
- `DeterministicFrameProvider` interface
- `DeterministicRenderError` class (strict mode error)
- Extend `createSceneBuilder` options type with `deterministicMedia?: DeterministicMediaConfig`
- Export all new public types from `src/lib/schemas/runtime/index.ts`

**Why first:** Everything downstream depends on these shapes. Defining them first lets all subsequent phases compile against stable contracts. Catches P5.1 and P5.4 before any implementation exists.

**Pitfalls to avoid:** P5.1 (non-optional config), P5.4 (missing exports)

---

### Phase 2 — `DeterministicMediaManager` (depends on Phase 1)

Implement the singleton manager:

- Plain `.ts` class with `#provider`, `#lastCacheKey` map, `#resourceCache` (LRU with `maxCachedTextures`), optional `DiagnosticsCollector`
- `resolveOverride()`, `isCacheKeyChanged()`, `commitCacheKey()`, `getFingerprint()`
- Register as `SINGLETON` in `DIContainer.ts`
- Wire into `SceneBuilder` via cradle; add `setDeterministicFrameProvider()` + `getDeterministicFrameProvider()` façade
- Unit tests: same cacheKey returns cached texture (no re-upload), null provider returns null, strict mode throws `DeterministicRenderError`

**Why second:** Hook and `RenderFrameCommand` both depend on this. Must be stable before they are built. LRU eviction logic is easiest to test in isolation before the hook adds complexity.

**Pitfalls to avoid:** P2.2 (object identity vs cacheKey string), P2.4 (unbounded cache), P5.3 (SINGLETON lifetime)

---

### Phase 3 — `DeterministicMediaFrameHook` + `ComponentDirector` branch (depends on Phase 2)

Implement the hook and wire it into component construction:

- `DeterministicMediaFrameHook`: server-only, priority 0 (or explicit pre-native number), `types: ['setup', 'update']`
- `#handleUpdate()`: calls `manager.resolveOverride()`, writes `pixiResource` + `imageElement`/`ImageBitmap` into context, calls `markDirty()` on cacheKey change
- `ComponentDirector.constructVideo()` + `constructGif()`: add server+deterministic branch that uses `deterministicMediaFrameHook` instead of the native media chain
- Register hook as `TRANSIENT` in `DIContainer.ts`
- Add `withDeterministicMedia()` to `PixiComponentBuilder`

**Why third:** This is the core feature implementation. Depends on the manager being complete. The branching decision here prevents the most dangerous pitfalls.

**Pitfalls to avoid:** P1.1, P1.3, P1.4, P3.1, P3.2, P3.3, P3.4, P5.3

---

### Phase 4 — `PixiVideoTextureHook` guard (depends on Phase 3 ordering logic)

Minimal two-line change to `PixiVideoTextureHook.#handleUpdate()`:

- Check `context.getResource('pixiResource')` at top of method
- If present: create texture from pre-supplied resource, set `pixiTexture`, return early
- No other existing hooks require modification

**Why fourth:** Separated from Phase 3 because it touches existing production code. Keeping it isolated makes the diff reviewable and the change minimal. `PixiDisplayObjectHook` and `PixiSplitScreenDisplayObjectHook` stay completely untouched.

**Pitfalls to avoid:** P1.2 (texture destruction timing — do not use `Texture.from()` here; construct explicitly)

---

### Phase 5 — `RenderFrameCommand` fingerprint integration (depends on Phase 2)

Extend the server cache guard:

- Inject `DeterministicMediaManager` into `RenderFrameCommand` (nullable — safe when `enabled: false`)
- Add `lastDeterministicFingerprint: string` field
- Add fourth cache-guard check: `lastDeterministicFingerprint === manager.getFingerprint()`
- Update fingerprint on successful render

**Why fifth:** Can be built in parallel with Phase 3/4 since it only depends on Phase 2's `getFingerprint()` API. Addresses the P2.3 cache staleness pitfall separately from the hook's `markDirty()` call — defence in depth.

**Pitfalls to avoid:** P2.1, P2.3

---

### Phase 6 — `renderFrameRange()` on `SceneBuilder` (depends on all prior phases)

Implement the public render loop method:

- Direct `SceneBuilder` method (not a command — see ARCHITECTURE.md Q4)
- Signature: `renderFrameRange(fromFrame, toFrame, sink, options?): Promise<RenderFrameRangeSummary>`
- Sequential `await sink(frameIndex, frame, release)` before advancing — provides back-pressure and enables `release()` for blob URL cleanup
- `AbortSignal` support: check `signal.aborted` before each frame
- Returns `RenderFrameRangeSummary { framesRendered, framesSkipped, aborted, diagnostics? }`
- Use `f < toFrame` (exclusive end), NOT `f <= toFrame`
- Add `renderFrameRange` to `ISceneBuilder` interface

**Why last:** Depends on all plumbing phases. The sequential frame loop only makes sense once the hook, manager, and cache guard are all wired and tested together. Integration tests run here.

**Pitfalls to avoid:** P4.1 (off-by-one), P4.2 (RAF timing), P4.3 (blob URL leak), P4.4 (parallel seek corruption), P4.5 (double-seek), P5.2 (ISceneBuilder interface lag)

---

### Phase 7 — `ReplaceSourceOnTimeCommand` + Diagnostics (parallel with Phase 6)

Two independent cleanup items:

- `ReplaceSourceOnTimeCommand.execute()`: implement as thin wrapper calling `deterministicMediaManager.setOneTimeOverride()` — replace the empty stub without deleting the class (backward-compatible)
- Diagnostics: `DiagnosticsCollector` in `DeterministicMediaManager` with aggregate counters (hit/miss count, total latency, min/max) — **not** per-frame arrays; expose via `SceneBuilder.getDiagnosticsReport()`; wrap all diagnostic code in try/catch (P6.1)

**Pitfalls to avoid:** P6.1 (diagnostic throw propagation), P6.2 (unbounded accumulation)

---

## Open Questions

1. **`imageElement` write path for blur (P1.3):** When the provider supplies an `ArrayBuffer` or `Blob`, the deterministic hook must decode it into something `ctx.drawImage()` can consume (`HTMLImageElement` or `ImageBitmap`). Should this decoding happen inside `DeterministicMediaFrameHook` (adds async decode per frame) or inside `DeterministicMediaManager.resolveOverride()` (could be cached alongside the texture)? The cache-alongside approach avoids re-decode on same cacheKey — recommended, but needs explicit design before Phase 3 implementation starts.

2. **`frameIndex` zero-indexing contract:** `renderFrameRange(0, 30)` must emit exactly 30 frames (0–29). This is `[fromFrame, toFrame)` exclusive-end convention, matching Remotion. Must be documented in the interface JSDoc and enforced by the first test written. Confirm with cf-worker team that this matches their muxing expectations.

3. **`ReplaceSourceOnTimeCommand` fate (Phase 7):** The current empty stub has a base64-only input signature that conflicts with the new blob-first payload model. Decision needed before Phase 7: (a) implement as a `DeterministicMediaManager` wrapper that accepts base64 and converts internally, or (b) deprecate it and document migration to `setDeterministicFrameProvider`. Do not ship both as co-equal APIs.

4. **`requestAnimationFrame` in server renders (P4.2):** `RenderFrameCommand.execute()` wraps all three output paths in `requestAnimationFrame()`. In a headless/jsdom context this introduces timing indeterminism. Confirm whether the existing `seekAndRenderFrame()` already handles this correctly, or whether `renderFrameRange` needs a synchronous render variant that bypasses RAF.

5. **Diagnostics access surface:** Spec says diagnostics is disabled by default and never throws. The access path is `SceneBuilder.getDiagnosticsReport(): DiagnosticsReport | null`. Confirm this is the right surface (vs. event-based or returned in the render summary) before Phase 7 implementation.

---

## Sources

| File            | Confidence | Basis                                                                                                                |
| --------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| STACK.md        | HIGH       | Direct inspection of `node_modules/@pixi/core@7.4.3` type definitions; codebase hook files                           |
| FEATURES.md     | HIGH       | Remotion docs via Context7; Motion Canvas source from GitHub; codebase `RenderFrameCommand`, `ComponentDirector`     |
| ARCHITECTURE.md | HIGH       | Direct source inspection of all hook files, `DIContainer.ts`, `ComponentContext.svelte.ts`, `SceneBuilder.svelte.ts` |
| PITFALLS.md     | HIGH       | Direct source inspection — all pitfalls traced to specific file + line number in the live codebase                   |
