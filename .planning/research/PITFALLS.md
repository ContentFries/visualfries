# Domain Pitfalls: Deterministic Frame Provider Injection

**Domain:** Server-side deterministic media rendering via hook injection into a PixiJS 7.x pipeline  
**Researched:** 2026-02-21  
**Codebase version:** visualfries 0.1.1098 (pixi.js-legacy ^7.4.3)

---

## 1. Texture Injection Pitfalls

### P1.1 — Dual-Path Activation: Both Native and Deterministic Paths Run Simultaneously

**What goes wrong:**  
`ComponentDirector.constructVideo()` unconditionally calls `.withMedia().withMediaSeeking().withVideoTexture().withSplitScreen()`. If the new `DeterministicMediaFrameHook` is inserted at a lower priority number (higher priority) than `MediaHook`/`PixiVideoTextureHook` but does _not_ explicitly prevent them from executing, all three hooks fire on every `update` tick. `MediaHook` will attempt to fetch a real `HTMLVideoElement`, `MediaSeekingHook` will seek it, and `PixiVideoTextureHook` will overwrite `pixiTexture` with the native video texture — clobbering the decoded frame blob that `DeterministicMediaFrameHook` already wrote.

**Why it happens:**  
`ComponentContext.runHooks()` runs _all_ hooks that declare a given `HookType` in their `types` array. There is no early-exit or short-circuit once a hook succeeds. Priority only controls ordering, not gating.

**Consequences:**  
Frame content is wrong (native video frame replaces injected frame); double GPU texture allocation; potential media element race with seek state machine in `MediaSeekingHook`.

**Warning signs:**

- Injected frames appear for one tick then revert to black/incorrect content
- `pixiTexture` resource is a `PIXI.VideoResource`-backed texture at render time instead of an image-backed one
- GPU memory climbs per frame even when cacheKey is stable

**Prevention:**  
`DeterministicMediaFrameHook` must either:  
 a. Set a sentinel resource (e.g., `context.setResource('deterministicActive', true)`) that `MediaHook` / `PixiVideoTextureHook` check and skip on, OR  
 b. `ComponentDirector.constructVideo()` conditionally skips `.withMedia()`, `.withMediaSeeking()`, and `.withVideoTexture()` when `deterministicMedia.enabled && environment === 'server'` — replacing them with the deterministic hook.  
Option (b) is strongly preferred: it is the only pattern that completely eliminates dual-path risk without adding cross-hook coupling.

**Phase:** Core hook injection phase (the one adding `DeterministicMediaFrameHook`).

---

### P1.2 — Texture Destruction Timing: `destroy(true)` Frees Shared GPU Resources

**What goes wrong:**  
`PixiVideoTextureHook.#handleDestroy()` calls `this.#videoTexture.destroy(true)`. The `true` argument destroys the `BaseTexture`, which frees the GPU upload. If `DeterministicMediaFrameHook` creates a new `PIXI.Texture` from a blob/arraybuffer using `PIXI.Texture.from(resource)` and that same resource object is later passed again with the same cacheKey, `PIXI.Texture.from()` uses an internal texture cache keyed on the resource source string. Calling `.destroy(true)` on the first texture removes the base texture from Pixi's global cache, but a subsequent `.from()` on the same source may retrieve a dangling/partially-destroyed entry.

**Why it happens:**  
`PIXI.Texture.from()` (in pixi.js-legacy 7.x) keys its internal `TextureCache` on the `resource` argument's string representation or object identity. Destroying with `true` removes the `BaseTexture` from `BaseTextureCache` but does not always clean `TextureCache` entries pointing to it.

**Warning signs:**

- Console warnings: `"Texture added to the cache with an id [x] that already had an entry"` or `"BaseTexture destroyed without being removed from the cache"`
- Renderer warnings about invalid textures after a cache miss forces re-upload

**Prevention:**  
Do **not** use `PIXI.Texture.from()` for deterministic frames. Instead, always construct the full chain explicitly:

```typescript
const resource = new PIXI.ImageResource(blobUrl);
const baseTexture = new PIXI.BaseTexture(resource);
const texture = new PIXI.Texture(baseTexture);
```

This bypasses the global TextureCache entirely. Destroy with `texture.destroy(true)` only when the cacheKey changes — not on every frame. Revoke the object URL (`URL.revokeObjectURL()`) after `BaseTexture` finishes uploading (listen to `BaseTexture.on('loaded')`).

**Phase:** Core hook injection phase.

---

### P1.3 — `fillBackgroundBlur` Requires `imageElement`, Not `pixiTexture`

**What goes wrong:**  
`PixiSplitScreenDisplayObjectHook.#drawBlurredBackground()` reads from `context.getResource('videoElement') || context.getResource('imageElement')` and calls `ctx.drawImage(sourceElement, ...)` on a 2D canvas. If the deterministic hook only writes `pixiTexture` (or `pixiResource`) and does not also write `imageElement`, the blur fallback gets `undefined` and silently draws nothing — resulting in a black or missing background.

**Why it happens:**  
The blur is implemented as a Canvas 2D operation (`ctx.drawImage`) because PIXI `BlurFilter` is bypassed in server mode (lines 67–82 of `PixiSplitScreenDisplayObjectHook.ts`). The Canvas 2D path requires a DOM-drawable source (`HTMLImageElement`, `HTMLVideoElement`, `ImageBitmap`, or `HTMLCanvasElement`) — not a PIXI texture.

**Warning signs:**

- Blur background is solid black when `fillBackgroundBlur` effect is active
- No errors thrown — the `if (!sourceElement) { return; }` guard silently skips the draw

**Prevention:**  
When the provider returns a blob or arraybuffer, the deterministic hook must:

1. Decode to an `HTMLImageElement` (or `ImageBitmap`) in addition to the PIXI texture
2. Write it as `context.setResource('imageElement', decodedImg)` — or `videoElement` if the hook is replacing a VIDEO component

Alternatively, write an `ImageBitmap` and adapt `#drawBlurredBackground` to accept `ImageBitmap`. Verify with an integration test that specifically enables `fillBackgroundBlur` alongside deterministic override.

**Phase:** Core hook injection phase; must be in acceptance criteria for that phase.

---

### P1.4 — `PIXI.VideoResource` `updateFPS` Polling Continues After Texture Is "Replaced"

**What goes wrong:**  
If the native `PixiVideoTextureHook` path still runs (see P1.1), it constructs `new PIXI.VideoResource(media, { autoPlay: false, updateFPS: 30 })`. This installs a polling interval inside `VideoResource` that calls `baseTexture.resource.update()` every ~33ms regardless of whether the scene is rendering. Even if the deterministic hook's texture is the one set in `pixiTexture`, the polling keeps the native `BaseTexture` alive and consuming resources.

**Warning signs:**

- Memory does not stabilize between frames during a `renderFrameRange` loop
- CPU time anomaly on a "paused" scene that should be deterministic

**Prevention:**  
Avoid constructing any `VideoResource` in server mode. The deterministic path must completely replace the `.withMedia().withVideoTexture()` chain, not supplement it (see P1.1).

**Phase:** Core hook injection phase.

---

## 2. Cache Deduplication Pitfalls

### P2.1 — `RenderFrameCommand` `isDirty` Flag Is Not Frame-Aware

**What goes wrong:**  
`RenderFrameCommand.execute()` returns the cached `lastRenderedFrame` when `!this.sceneState.isDirty && argsMatch`. The `isDirtyFlag` in `StateManager` is set to `true` only when `markDirty()` is called explicitly by hooks. If the deterministic hook writes a new `pixiTexture` but never calls `stateManager.markDirty()`, the frame cache bypass is skipped and the command returns the stale previous frame — even though new decoded pixel data is present.

**Why it happens:**  
`isDirtyFlag` starts as `true` and is cleared after the first render. Nothing forces it dirty when the deterministic hook writes a new resource between frames. The existing texture hooks (`PixiTextureHook`, `PixiDisplayObjectHook`) call `state.markDirty()` in some paths but not all.

**Consequences:**  
Frame N's pixel data is returned for frame N+1, N+2, … until something else marks the scene dirty. The `renderFrameRange` caller receives duplicate frames.

**Warning signs:**

- Sequential frames in `renderFrameRange` output look identical despite different cacheKeys
- Blob byte length is identical across frames that should differ

**Prevention:**  
`DeterministicMediaFrameHook` must call `context.sceneState.markDirty()` every time it writes a _new_ frame blob (cacheKey changed or first write). When the same cacheKey is reused, it must **not** call `markDirty()` — this is the desired deduplication path.

Additionally, `RenderFrameCommand` should include the deterministic media fingerprint (e.g., a hash of active cacheKeys or a provider-supplied frame ID) as part of its cache invalidation check, in case `isDirty` is cleared before the cache check runs.

**Phase:** Cache deduplication phase / `RenderFrameCommand` integration.

---

### P2.2 — Same `cacheKey` Must Not Recreate Texture (GPU Leak)

**What goes wrong:**  
If the `DeterministicMediaManager` cache compares `cacheKey` by value but the caller re-constructs the provider response object on every frame (i.e., same blob content but a new `Blob` object instance), an identity check (`===`) will see a miss and trigger `PIXI.Texture.destroy(true)` + re-upload every frame.

**Why it happens:**  
JavaScript `Blob` and `ArrayBuffer` objects do not have value equality. A new `Blob([sameBytes])` is a distinct object from an earlier one. If the cache is keyed on the _payload object_ rather than `cacheKey` string, every call misses.

**Warning signs:**

- GPU memory grows linearly with frame count even for a static scene
- PIXI `"Texture added to the cache with an id…"` repeated warnings
- CPU time for `Texture.from()` + upload visible in profiler on every `update` tick

**Prevention:**  
The `DeterministicMediaManager` frame cache must be a `Map<string, PIXI.Texture>` keyed exclusively on the caller-supplied `cacheKey` string — never on the payload object identity. Lookup is `cache.has(cacheKey)` before calling provider; texture creation only when `!cache.has(cacheKey)`.

Unit test: same `cacheKey` called twice → `pixiTexture` is the same object reference; GPU upload code path is not entered on second call.

**Phase:** Cache deduplication phase.

---

### P2.3 — Fingerprint Staleness: `RenderFrameCommand` Server Cache Returns Wrong Frame After `cacheKey` Change

**What goes wrong:**  
`RenderFrameCommand` caches the last rendered frame and returns it when `!isDirty && argsMatch`. The `argsMatch` check compares `format`, `quality`, and `target` — but not the deterministic frame content. If a new `cacheKey` is registered (meaning new decoded pixels), but `isDirty` was not set (see P2.1) or was cleared before `execute()` runs, the cache returns the old frame.

**Warning signs:**

- The first frame of a new video segment looks like the last frame of the previous segment
- Integration test: seek to new frame, provide new cacheKey, extract blob — blob is identical to previous frame

**Prevention:**  
Augment the server-cache guard to include a `deterministicFingerprint` field — a string derived from the set of active `{componentId, cacheKey}` pairs. If the fingerprint differs from `lastRenderArgs.deterministicFingerprint`, bypass the cache regardless of `isDirty`. This is the safest defence-in-depth approach beyond relying solely on `markDirty()`.

**Phase:** `RenderFrameCommand` integration / cache deduplication phase.

---

### P2.4 — Cache Eviction Strategy: Memory Unbounded in Long Render Jobs

**What goes wrong:**  
`DeterministicMediaManager` holds a `Map<cacheKey, PIXI.Texture>`. A `renderFrameRange(0, 900, ...)` call on a 30-second, 30fps scene at 3 video components generates up to 2700 unique cacheKeys. Each texture holds a GPU upload. Without eviction, GPU memory exhausts on typical server hardware (4–8GB VRAM in a Puppeteer/headless Chrome context).

**Why it happens:**  
Cache is effective only if it is bounded. Frame-by-frame rendering with unique cacheKeys per frame has no reuse benefit unless frames repeat (e.g., static video sections). Unbounded accumulation is the default if no eviction is implemented.

**Warning signs:**

- `renderFrameRange` OOM crash after several hundred frames
- `WebGL: CONTEXT_LOST_WEBGL` error mid-render (GPU memory exhaustion)

**Prevention:**  
Implement LRU eviction in `DeterministicMediaManager` with a configurable `maxCachedTextures` (suggested default: 3 × number of active VIDEO components). On eviction, call `texture.destroy(true)` to free GPU memory. Alternatively, use a frame-scoped cache that is cleared after each `renderFrame()` call — appropriate when cacheKeys change every frame and there is no cross-frame reuse.

**Phase:** Cache deduplication phase; document the `maxCachedTextures` option in API design.

---

## 3. Hook Chain Integration Pitfalls

### P3.1 — `runHooks()` Error Suppression Hides Deterministic Hook Failures

**What goes wrong:**  
`ComponentContext.runHooks()` wraps each hook in `try/catch`, emits a `hookerror` event, and continues to the next hook. If `DeterministicMediaFrameHook` throws (e.g., provider is null, network timeout, Zod validation failure on the response), execution continues to `PixiVideoTextureHook` and `PixiSplitScreenDisplayObjectHook` — which may run successfully on stale native state, producing a silently wrong frame with no error surfaced to the caller.

**Why it happens:**  
The error suppression is intentional for client-side resilience (one failing animation hook should not crash the scene). In a server rendering loop, _any_ deterministic hook failure is a correctness error that should fail the frame, not produce a wrong-but-valid-looking result.

**Warning signs:**

- `hookerror` events are emitted but the render call resolves successfully
- Frame output looks like native video (wrong) rather than injected content (right)
- CI passes but frame pixel comparisons differ from expected

**Prevention:**  
Two strategies, pick one or combine:  
 a. **Strict mode**: `DeterministicMediaFrameHook` in strict mode sets a `context.setResource('deterministicFailed', errorDetail)` flag; subsequent hooks check for this and throw (propagating through `runHooks()` safely). `renderFrameRange` checks for this flag after each frame and rejects the promise.  
 b. **Rethrow flag**: Add a `throwOnError?: boolean` option to `runHooks()` or create a separate `runHooksStrict()` that is used by the server rendering path only.  
Option (a) is preferred because it does not change the existing `runHooks()` contract.

**Phase:** Hook injection phase; strict/fallback mode implementation.

---

### P3.2 — Priority Number Conflicts Between Deterministic Hook and Existing Hooks

**What goes wrong:**  
`Component.addHook()` (in `Component.svelte.ts`, line 79) auto-assigns `priority = maxPriority + 1` when no explicit priority is passed. `PixiVideoTextureHook` and `PixiSplitScreenDisplayObjectHook` are both registered with `priority: 1`. If `DeterministicMediaFrameHook` is added via `ComponentDirector.constructVideo()` via `.withDeterministicMedia()` without an explicit priority, and the native hooks are already added first, the deterministic hook gets `priority = 2` and runs _after_ `PixiVideoTextureHook` — meaning the native texture is already in `pixiTexture` when the deterministic hook runs. The deterministic hook would need to detect and overwrite it, which is messy.

**Why it happens:**  
`addHook()` assigns `maxPriority + 1`, so insertion order determines priority. Hooks added earlier get lower numbers (higher priority).

**Warning signs:**

- Deterministic hook's `setResource('pixiTexture', ...)` call is a no-op because `PixiSplitScreenDisplayObjectHook.#handleUpdate()` already read `pixiTexture` in the same tick

**Prevention:**  
Always pass an explicit priority when adding the deterministic hook:

```typescript
// In PixiComponentBuilder or ComponentDirector
component.addHook(deterministicMediaFrameHook, /* priority */ 0);
```

Priority `0` (or any value < 1) ensures it runs before all existing hooks that use priority `1`. Document this as a hard requirement in the hook's class JSDoc.

**Phase:** Hook injection phase.

---

### P3.3 — `setup` vs `update` Hook Type Coverage Gap

**What goes wrong:**  
`MediaHook` handles `['setup', 'update', 'destroy']`. `PixiVideoTextureHook` handles `['update', 'destroy', 'refresh:content']`. If `DeterministicMediaFrameHook` only declares `['update', 'destroy']`, its resources are not set during `setup()` — but `PixiSplitScreenDisplayObjectHook` may receive a `setup`-equivalent call and look for `pixiTexture` which is not yet present.

**Why it happens:**  
Looking at `Component.svelte.ts` line 88–91: `setup()` calls `this.#handle('setup')`, which filters hooks by `hook.types.includes('setup')`. If the deterministic hook is not in the setup chain, the first `update()` call will be the first time it writes `pixiTexture`. Any hook that caches texture state from `setup()` will have stale data.

**Warning signs:**

- First frame rendered after `initialize()` shows no content / black frame
- Second and subsequent frames are correct

**Prevention:**  
`DeterministicMediaFrameHook.types` should include `'setup'` and its `#handleSetup()` should call the provider for the initial frame (frame 0 or the provider's initial state). Alternatively, confirm that no downstream hook reads `pixiTexture` during `setup()` — if confirmed safe, document the assumption explicitly.

**Phase:** Hook injection phase.

---

### P3.4 — `MediaHook` Short-Circuits in Server Mode But `MediaSeekingHook` Does Not

**What goes wrong:**  
`MediaHook.#handleUpdate()` returns early when `this.state.environment === 'server'` (line 187). However, `MediaSeekingHook.#handleUpdate()` does _not_ have the same guard — it only adjusts its seek threshold (`currentFrame !== targetFrame` in server mode, line 155). If the deterministic hook replaces media entirely, `MediaSeekingHook` will still:

1. Try to read `videoElement` from the context
2. Attempt to seek it to `currentComponentTime`
3. Call `baseTex.resource.update()` on the texture it finds

If no `videoElement` is present (correct, in the deterministic path), `MediaSeekingHook` returns early (line 145). But if `videoElement` is still present from a previous tick or from incomplete teardown, it will seek a native video that is now irrelevant — wasting time and potentially corrupting the dirty flag.

**Warning signs:**

- `renderFrameRange` frames take inconsistent time (some frames 10× slower due to seek wait)
- Seek promise in `MediaSeekingHook` times out during deterministic rendering

**Prevention:**  
`ComponentDirector.constructVideo()` must not call `.withMediaSeeking()` when `deterministicMedia.enabled && environment === 'server'`. This is the same structural fix as P1.1 — the deterministic build path should be its own branch in `constructVideo()`, not an addition on top of the native path.

**Phase:** Hook injection phase.

---

## 4. `renderFrameRange()` Safety Pitfalls

### P4.1 — Off-By-One: Frame Count Must Equal `toFrame - fromFrame`, Not `toFrame - fromFrame + 1`

**What goes wrong:**  
It is natural to write `for (let f = fromFrame; f <= toFrame; f++)` which produces `toFrame - fromFrame + 1` frames. The spec states frame count must equal `toFrame - fromFrame`.

**Why it happens:**  
Convention confusion between inclusive/exclusive range semantics. `renderFrameRange(0, 30)` at 30fps should produce 30 frames (frames 0–29), not 31 frames (0–30). Using `<=` instead of `<` is a one-character mistake.

**Warning signs:**

- Integration test: `renderFrameRange(0, 30)` produces 31 frames
- The last frame of a scene appears twice (frame at `toFrame` time = end of scene = same content as previous)

**Prevention:**  
Implement as `for (let f = fromFrame; f < toFrame; f++)`. Add a unit test that asserts `result.length === toFrame - fromFrame` as the _first_ test written for `renderFrameRange`.

**Phase:** `renderFrameRange` implementation phase.

---

### P4.2 — `requestAnimationFrame` Inside `RenderFrameCommand` Breaks in Headless/Server Context

**What goes wrong:**  
`RenderFrameCommand.execute()` wraps all three render paths (`arraybuffer`, `blob`, `png`) in `requestAnimationFrame(...)` callbacks. In a headless Chrome/Puppeteer server context, `requestAnimationFrame` is available but may not fire until the browser decides the tab is "visible". In Node.js jsdom (used in tests), `requestAnimationFrame` is polyfilled as `setTimeout(cb, 16)`.

In a `renderFrameRange` loop calling `seekAndRenderFrame()` sequentially, each `requestAnimationFrame` callback introduces an extra async tick. This is benign but can cause seek state to change between the seek and the frame extraction — the dirty flag may be cleared between `seek()` and `renderFrame()` if any timer-based code runs in that gap.

**Warning signs:**

- Frame extraction returns stale content when called immediately after seek
- Test failures that are intermittent (RAF timing-dependent)

**Prevention:**  
For the server/deterministic path, consider a synchronous render variant in `AppManager.render()` followed by immediate `canvas.toBlob()` without RAF wrapping. At minimum, `seekAndRenderFrame()` should call `this.render()` (which calls `appManager.render()` synchronously) before entering the RAF for extraction, ensuring the GPU draw commands are issued before the async wait.

**Phase:** `renderFrameRange` implementation phase.

---

### P4.3 — Sink Callback Memory Leak: Blob URLs Not Revoked

**What goes wrong:**  
If `renderFrameRange()` passes `Blob` objects to the sink callback, and the sink callback does not explicitly `URL.revokeObjectURL()` them, the Blob data remains alive in the browser/Node heap for the entire render job. At 1080p, 30fps, 30 seconds: 900 frames × ~6MB per frame = ~5.4GB unreleased.

**Why it happens:**  
The `renderFrameRange` API design decision to use a sink callback makes the memory lifecycle the caller's responsibility. But callers (cf-worker) often batch-process blobs and may not revoke URLs until the entire job is done.

**Warning signs:**

- Heap growth linear with frame count during `renderFrameRange`
- OOM crash on long scenes

**Prevention:**  
The `renderFrameRange` sink callback signature should include an explicit `release()` function:

```typescript
type FrameSink = (
	frame: Blob | ArrayBuffer,
	frameIndex: number,
	release: () => void
) => void | Promise<void>;
```

`renderFrameRange` awaits the sink callback before rendering the next frame, ensuring the caller can invoke `release()` synchronously or asynchronously before more frames are generated. Document this pattern prominently in the API.

Alternatively, document clearly that the frame object passed to the sink is only valid until the callback returns, and callers must copy or consume it before returning.

**Phase:** `renderFrameRange` implementation phase.

---

### P4.4 — Frame Ordering: `Promise.all` Parallelism Breaks Sequential Seek Dependency

**What goes wrong:**  
Parallelizing `renderFrameRange` with `Promise.all([...frames.map(f => seekAndRenderFrame(f))])` would be faster, but `seekAndRenderFrame` modifies global mutable state: `stateManager.currentTime`, `isDirtyFlag`, and the component resources map. Running two seeks concurrently will corrupt these.

**Why it happens:**  
The scene is stateful. `seek()` calls `stateManager.setCurrentTime()`, which triggers `timeupdate` events, which trigger `render()` — and each hook reads from the same `ComponentContext.resources` map.

**Warning signs:**

- Frames arrive out of order when `Promise.all` is attempted
- `isDirtyFlag` is `false` when a concurrent seek's hook writes new content

**Prevention:**  
`renderFrameRange` must be strictly sequential: `await` each `seekAndRenderFrame()` before advancing. Document explicitly in the API that concurrent calls to `seekAndRenderFrame` on the same `SceneBuilder` instance are not safe. If parallel rendering is needed, it must use separate `SceneBuilder` instances (separate DI containers).

**Phase:** `renderFrameRange` implementation phase.

---

### P4.5 — `isSceneDirty()` Double-Seek Problem

**What goes wrong:**  
`SceneBuilder.isSceneDirty(time)` calls `await this.seek(time)` followed by `this.render()`. If the `renderFrameRange` loop uses `isSceneDirty()` as an optimization to skip identical frames, it introduces a _double seek_: `isSceneDirty(time)` seeks once, then the subsequent `seekAndRenderFrame(time)` seeks again. The second seek resets media state and clears some hook internal caches, potentially marking dirty things that were already rendered.

**Warning signs:**

- The "dirty" optimization produces more frames rendered than expected (dirty flag too conservative)
- Frame extraction after `isSceneDirty` is slower than without it (due to seek overhead)

**Prevention:**  
Either:  
 a. Don't use `isSceneDirty` inside `renderFrameRange` — the deterministic path always has unique content per frame when cacheKey changes  
 b. Merge the dirty check into `seekAndRenderFrame`: seek once, check dirty state before extraction, cache the frame if not dirty  
 c. If `isSceneDirty` is used, ensure `seekAndRenderFrame` detects that `stateManager.currentTime` already equals the requested time and skips the re-seek

**Phase:** `renderFrameRange` implementation phase.

---

## 5. Backward Compatibility Pitfalls

### P5.1 — New `deterministicMedia` Config Field Breaks Zod Schema If Not Optional

**What goes wrong:**  
If `DeterministicMediaConfig` is added as a required field to the scene config schema or to `createSceneBuilder()` options without `optional()` / default values, every existing consumer that does not pass the field will receive a Zod validation error on upgrade.

**Why it happens:**  
Zod fields are required by default. Adding to a schema without `.optional()` is a breaking change.

**Warning signs:**

- Existing integration tests fail after adding the new config type
- cf-worker throws on `createSceneBuilder()` after upgrading the npm package

**Prevention:**  
All new config fields must be:

```typescript
deterministicMedia: z.object({
	enabled: z.boolean().default(false),
	provider: z.unknown().optional(),
	strict: z.boolean().default(false),
	diagnostics: z.boolean().default(false),
	maxCachedTextures: z.number().optional()
}).optional();
```

Test: call `createSceneBuilder()` without `deterministicMedia` and assert no error.

**Phase:** API design / type definition phase.

---

### P5.2 — `SceneBuilder` Interface Extension Without `ISceneBuilder` Update Breaks TypeScript Consumers

**What goes wrong:**  
`setDeterministicFrameProvider()` and `renderFrameRange()` are added as concrete methods on `SceneBuilder` class. If `ISceneBuilder` (the exported interface) is not updated to include these signatures, TypeScript consumers typing their reference as `ISceneBuilder` (as recommended by the library docs) will see `Property 'renderFrameRange' does not exist on type 'ISceneBuilder'`.

**Why it happens:**  
`ISceneBuilder` and `SceneBuilder` are separate — the interface is in `src/lib/schemas/runtime/types.ts`, the class is in `SceneBuilder.svelte.ts`. It is easy to add a method to the class and forget to update the interface.

**Warning signs:**

- TypeScript errors in cf-worker after upgrading even though the feature works at runtime
- `dist/index.d.ts` does not expose the new method signatures

**Prevention:**  
After adding any public method to `SceneBuilder`, run `pnpm run check` and verify `ISceneBuilder` is updated. Add to CI: a TypeScript "consumer test" file that creates a `SceneBuilder` instance, types it as `ISceneBuilder`, and calls all new methods — this will fail to compile if the interface is not updated.

**Phase:** API surface / backward compatibility phase.

---

### P5.3 — `awilix` DI Container Registers Hooks as TRANSIENT — Singleton Anti-Pattern

**What goes wrong:**  
`DeterministicMediaManager` must be a `SINGLETON` (one per scene, holds the provider config and texture cache). If it is accidentally registered as `TRANSIENT`, each component that injects it will receive a different instance — meaning the frame cache and provider configuration are not shared. Component A and Component B would each call the provider independently, defeating deduplication.

Conversely, `DeterministicMediaFrameHook` must be `TRANSIENT` (one per component, like all other hooks). If it is accidentally registered as `SINGLETON`, all components share one hook instance — and `this.#context` (set in `handle()`) will be overwritten by whichever component ran last, causing the previous component's frame extraction to use the wrong context.

**Why it happens:**  
The DI registration in `DIContainer.ts` requires explicit `{ lifetime: Lifetime.SINGLETON }` or `TRANSIENT`. The existing pattern uses TRANSIENT for hooks and SINGLETON for managers. Missing the `lifetime` option silently defaults to transient in Awilix.

**Warning signs:**

- Two VIDEO components produce identical frames (shared SINGLETON hook with shared `#context`)
- Frame cache never hits (TRANSIENT manager: new cache instance per component, always misses)

**Prevention:**  
In `DIContainer.ts`, register exactly as:

```typescript
deterministicMediaManager: asClass(DeterministicMediaManager, { lifetime: Lifetime.SINGLETON }),
deterministicMediaFrameHook: asClass(DeterministicMediaFrameHook, { lifetime: Lifetime.TRANSIENT }),
```

Add a test: create two VIDEO components, verify both call the same `DeterministicMediaManager` instance.

**Phase:** DI wiring phase.

---

### P5.4 — `renderFrameRange` Not Exported From `index.ts` — Invisible to Consumers

**What goes wrong:**  
`renderFrameRange` added as a method on `SceneBuilder` is only accessible through the instance. But helper types like `DeterministicFrameProvider`, `DeterministicFrameRequest`, and `DeterministicFramePayload` must be re-exported from `src/lib/index.ts` for cf-worker to import them without reaching into internal paths. Failing to do so forces consumers to use `import type ... from 'visualfries/dist/...'` — brittle internal imports that break on any refactor.

**Warning signs:**

- cf-worker cannot `import type { DeterministicFrameProvider } from 'visualfries'`
- TypeScript error: `Module 'visualfries' has no exported member 'DeterministicFrameProvider'`

**Prevention:**  
After defining new public types, add them to `src/lib/schemas/runtime/index.ts` (which is re-exported via `src/lib/index.ts`). Run `publint` (already in CI) to verify the export surface is clean.

**Phase:** API surface / backward compatibility phase.

---

## 6. Diagnostics Pitfalls

### P6.1 — Diagnostics Code Path Throws and Propagates Through Hook Error Handler

**What goes wrong:**  
If diagnostics logic (e.g., `performance.now()`, `JSON.stringify(diagnosticPayload)`) throws for any reason (circular object in payload, `performance` unavailable in test environment), and that throw is inside `DeterministicMediaFrameHook.handle()`, it will be caught by `ComponentContext.runHooks()` and emit a `hookerror` event. This means a diagnostics measurement failure can suppress the actual frame extraction — the hook is marked as "failed" and subsequent hooks may not receive the correct resources.

**Why it happens:**  
The constraint is "Diagnostics must never throw" (PROJECT.md). Diagnostics code that is not individually guarded violates this. The outer `runHooks()` try/catch catches the entire hook, not just the diagnostic portion.

**Warning signs:**

- `hookerror` events with `hookName: "DeterministicMediaFrameHook"` when diagnostics is enabled
- Frames work correctly with diagnostics disabled but not enabled

**Prevention:**  
Wrap every diagnostics measurement in its own try/catch that discards the error silently:

```typescript
#recordDiagnostic(label: string, value: unknown): void {
  try {
    this.#diagnostics?.record(label, value);
  } catch {
    // Diagnostics must never throw; swallow silently
  }
}
```

Additionally, gate all diagnostics behind `if (this.#config.diagnostics)` to ensure zero overhead when disabled.

**Phase:** Diagnostics implementation phase.

---

### P6.2 — Diagnostics Accumulates Unbounded Per-Frame Data

**What goes wrong:**  
Diagnostics that record per-frame latency, cache hit/miss counts, and provider call durations accumulate in memory for the entire `renderFrameRange` call. For a 900-frame render, if each diagnostic record is ~200 bytes, this is ~180KB — negligible. But if the diagnostic object captures full frame metadata (timestamps, cacheKeys, component IDs, provider response sizes), it can grow to MBs.

**Warning signs:**

- Memory profile shows a large diagnostic object alive through the entire render job
- Diagnostics summary report takes measurable time to serialize at end of render

**Prevention:**  
Diagnostics should aggregate, not accumulate: maintain running counters (hit count, miss count, total latency, min/max latency) rather than a per-frame array. Expose a `getDiagnosticsSummary(): DiagnosticsSummary` method that returns the aggregated view. Allow `clearDiagnostics()` to reset between render jobs.

**Phase:** Diagnostics implementation phase.

---

## Phase-Specific Warning Summary

| Phase Topic         | Pitfall                                             | Mitigation                                               |
| ------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| Hook injection      | Dual-path activation (P1.1)                         | `constructVideo()` branching, not additive               |
| Hook injection      | Priority conflict (P3.2)                            | Explicit priority=0 on deterministic hook                |
| Hook injection      | `setup` type coverage (P3.3)                        | Add `'setup'` to `DeterministicMediaFrameHook.types`     |
| Hook injection      | `MediaSeekingHook` still runs (P3.4)                | Remove from deterministic build path                     |
| Texture pipeline    | `destroy(true)` cache corruption (P1.2)             | Manual BaseTexture construction, no `Texture.from()`     |
| Texture pipeline    | `imageElement` missing for blur (P1.3)              | Write `imageElement` resource alongside `pixiTexture`    |
| Cache dedup         | `isDirty` not set on new frame (P2.1)               | `markDirty()` in deterministic hook on cacheKey change   |
| Cache dedup         | Payload identity vs cacheKey (P2.2)                 | Map keyed on `cacheKey` string only                      |
| Cache dedup         | `RenderFrameCommand` stale fingerprint (P2.3)       | Add `deterministicFingerprint` to cache guard            |
| Cache dedup         | Unbounded GPU cache (P2.4)                          | LRU eviction with `maxCachedTextures`                    |
| `renderFrameRange`  | Off-by-one frame count (P4.1)                       | Use `f < toFrame`, test first                            |
| `renderFrameRange`  | RAF timing in server (P4.2)                         | Synchronous render before RAF extraction                 |
| `renderFrameRange`  | Blob URL memory leak (P4.3)                         | Sink `release()` callback pattern                        |
| `renderFrameRange`  | Parallel seek corruption (P4.4)                     | Sequential only; document no-parallel contract           |
| `renderFrameRange`  | Double-seek from `isSceneDirty` (P4.5)              | Avoid `isSceneDirty` inside deterministic range loop     |
| Backward compat     | Non-optional new config (P5.1)                      | Zod `.optional()` / `.default(false)` everywhere         |
| Backward compat     | `ISceneBuilder` interface lag (P5.2)                | Update interface + consumer TS test in CI                |
| DI wiring           | Wrong lifetime for manager/hook (P5.3)              | Explicit `SINGLETON`/`TRANSIENT` in DIContainer          |
| API surface         | Types not exported (P5.4)                           | Add to `runtime/index.ts` + run `publint`                |
| Diagnostics         | Diagnostic throw surfaces as hook error (P6.1)      | Wrap all diagnostic code in try/catch                    |
| Diagnostics         | Unbounded per-frame accumulation (P6.2)             | Aggregate counters only, not per-frame arrays            |
| Hook error handling | `runHooks` suppresses deterministic failures (P3.1) | Strict mode via resource flag or `throwOnHookError` path |

---

## Sources

All findings derived from direct codebase analysis (confidence: HIGH):

- `src/lib/components/ComponentContext.svelte.ts` — `runHooks()` error suppression behavior
- `src/lib/components/hooks/PixiVideoTextureHook.ts` — `VideoResource` construction, texture lifecycle
- `src/lib/components/hooks/PixiSplitScreenDisplayObjectHook.ts` — `imageElement`/`videoElement` for blur, server mode branch
- `src/lib/components/hooks/MediaHook.ts` — server guard at line 187, media element lifecycle
- `src/lib/components/hooks/MediaSeekingHook.ts` — seek strategy, server frame-exact threshold
- `src/lib/commands/RenderFrameCommand.ts` — `isDirty` cache guard, RAF wrapping of all paths
- `src/lib/managers/StateManager.svelte.ts` — `isDirtyFlag` initialization=true, `markDirty/clearDirty`
- `src/lib/directors/ComponentDirector.ts` — `constructVideo()` hook chain (no server branch)
- `src/lib/builders/PixiComponentBuilder.ts` — `addHook()` auto-priority assignment
- `src/lib/components/Component.svelte.ts` — `addHook()` priority auto-increment (line 76–80)
- `src/lib/DIContainer.ts` — Awilix lifetime registrations, SINGLETON vs TRANSIENT pattern
- `src/lib/schemas/runtime/types.ts` — `ResourceTypes`, `ISceneBuilder` interface, `HookType`
- `package.json` — `pixi.js-legacy: ^7.4.3`, `awilix: ^12.0.3`
