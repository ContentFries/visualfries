# Architecture Patterns: DeterministicMediaManager + DeterministicMediaFrameHook Integration

**Domain:** Deterministic server media rendering in an existing Visualfries hook-chain system
**Researched:** 2026-02-21
**Confidence:** HIGH — all findings are from direct source inspection of the live codebase

---

## Component Boundaries

### DeterministicMediaManager (Singleton, per-scene)

**Responsibility:** Configuration store, provider registry, and per-component frame cache.
This class owns _all_ state that persists across render ticks for the deterministic path.
It is **not** responsible for writing to `ComponentContext.resources` — that belongs to the hook.

| Concern                                                                 | Owned here | NOT owned here         |
| ----------------------------------------------------------------------- | ---------- | ---------------------- |
| `DeterministicFrameProvider` instance                                   | ✓          |                        |
| Config: `enabled`, `strict`, `diagnostics`                              | ✓          |                        |
| Per-component `lastCacheKey` map                                        | ✓          |                        |
| Per-component decoded-resource cache (`pixiResource` keyed by cacheKey) | ✓          |                        |
| Calling `provider.getFrame(request)`                                    | ✓          |                        |
| Writing to `context.setResource('pixiResource', ...)`                   | —          | Hook only              |
| Knowing the current `ComponentContext`                                  | —          | Hook only              |
| PIXI texture lifecycle                                                  | —          | `PixiTextureHook` only |

**Recommended class shape:**

```typescript
// Plain TypeScript class — no Svelte runes (see question 3 below for rationale)
export class DeterministicMediaManager {
	readonly config: DeterministicMediaConfig; // set once at construction
	#provider: DeterministicFrameProvider | null = null;
	#lastCacheKey: Map<string, string> = new Map(); // componentId → last cacheKey
	#resourceCache: Map<string, unknown> = new Map(); // cacheKey → decoded pixiResource
	#diagnostics: DiagnosticsCollector | null = null; // null unless config.diagnostics=true

	setProvider(provider: DeterministicFrameProvider): void;
	getProvider(): DeterministicFrameProvider | null;

	/**
	 * Core method: call provider, compare cacheKey, return resolved override or null.
	 * Returns null when: no provider, provider returns null, or disabled.
	 * Throws DeterministicRenderError when: strict mode + provider expected but returned null.
	 */
	async resolveOverride(
		componentId: string,
		request: DeterministicFrameRequest
	): Promise<DeterministicFrameOverride | null>;

	/**
	 * True when the cacheKey for componentId differs from what was last committed.
	 * Used by the hook to decide whether to call setResource + markDirty.
	 */
	isCacheKeyChanged(componentId: string, cacheKey: string): boolean;

	commitCacheKey(componentId: string, cacheKey: string): void;

	/** Used by RenderFrameCommand cache guard to fingerprint current deterministic state */
	getFingerprint(): string;

	destroy(): void;
}
```

### DeterministicMediaFrameHook (Transient, per-component)

**Responsibility:** Intercept the `update` tick for VIDEO/GIF components in server mode,
call `DeterministicMediaManager.resolveOverride()`, and write results into `ComponentContext.resources`.

| Concern                                  | Owned here | NOT owned here               |
| ---------------------------------------- | ---------- | ---------------------------- |
| Deciding activation (env + feature flag) | ✓          |                              |
| Calling `resolveOverride()`              | ✓          |                              |
| Writing `pixiResource` into context      | ✓          |                              |
| Calling `state.markDirty()`              | ✓          |                              |
| Storing provider / cache state           | —          | Manager only                 |
| PIXI texture creation                    | —          | `PixiTextureHook` only       |
| PIXI sprite/display object               | —          | `PixiDisplayObjectHook` only |

The hook is intentionally thin. Its sole job is the "detect override → write resource" bridge.
All book-keeping lives in `DeterministicMediaManager`.

---

## Data Flow

### Per-frame update cycle (server + deterministic enabled)

```
StateManager.seek(t)
  → GSAP timeline.seek(t)
    → EventManager.emit('timeupdate')
      → RenderManager.render()
        → component.update()
          → ComponentContext.runHooks(hooks, 'update')
            ┌──────────────────────────────────────────────────────┐
            │ Hook chain (sorted ascending by priority number)     │
            │                                                      │
            │ priority 1  VerifyMediaHook                         │
            │             → sets context.resources['mediaShape']  │
            │                                                      │
            │ priority 2  MediaHook                               │
            │             → on server: #handleUpdate() is no-op   │
            │               (explicit env guard at line 187)      │
            │                                                      │
            │ priority 3  MediaSeekingHook                        │
            │             → seeks HTMLVideoElement to targetTime  │
            │                                                      │
            │ priority 4  DeterministicMediaFrameHook  ◄── NEW    │
            │             → calls manager.resolveOverride()       │
            │             → if override:                          │
            │                 context.setResource('pixiResource', │
            │                                    framePayload)    │
            │                 state.markDirty() if cacheKey ≠ last│
            │             → if null: no-op (native path proceeds) │
            │             → if strict + expected + null: throw    │
            │                                                      │
            │ priority 5  PixiVideoTextureHook                    │
            │             → reads context['videoElement']         │
            │             → writes context['pixiTexture']         │
            │             GUARD NEEDED: skip if pixiResource set  │
            │             by deterministic hook (see below)       │
            │                                                      │
            │ priority 10 PixiDisplayObjectHook /                 │
            │             PixiSplitScreenDisplayObjectHook        │
            │             → reads context['pixiTexture']          │
            │             → writes context['pixiRenderObject']    │
            └──────────────────────────────────────────────────────┘
          → AppManager.render()
            → PIXI canvas draws scene
              → RenderFrameCommand.execute()
                → checks fingerprint guard
                → extracts canvas → blob/arraybuffer/base64
```

### Resource flow summary

```
DeterministicFrameProvider.getFrame(request)
  → DeterministicFramePayload { cacheKey, resource }
    → DeterministicMediaManager: cache + compare cacheKey
      → DeterministicMediaFrameHook: context.setResource('pixiResource', resource)
        → PixiTextureHook: PIXI.Texture.from(pixiResource)
          → context.setResource('pixiTexture', texture)
            → PixiDisplayObjectHook: new PIXI.Sprite(pixiTexture)
              → context.setResource('pixiRenderObject', container)
                → PIXI stage render → canvas pixel output
```

**Key insight:** `PixiTextureHook` already reads `pixiResource` from context and calls
`PIXI.Texture.from(resource)`. The deterministic hook does not need to touch PIXI at all —
it only needs to put the right value into `context.resources['pixiResource']` before
`PixiTextureHook` runs. This is why priority ordering is the critical design lever.

---

## Hook Priority Design

### Current video chain priorities (from source inspection)

All existing hooks in the video chain are registered with `priority: 1` (identical).
`ComponentContext.runHooks()` sorts ascending, but **hooks at equal priority retain insertion order**
(stable sort via `[...hooks].sort()`). The builder calls `.withMedia().withMediaSeeking().withVideoTexture().withSplitScreen()` in that order, which defines the de-facto execution sequence.

This means priority numbers are currently ornamental — all set to 1. The new hook needs
a **numerically distinct priority** to guarantee ordering regardless of insertion sequence.

### Recommended priority assignments for the deterministic chain

| Priority | Hook                                                         | HookType                                          | Notes                                                                  |
| -------- | ------------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------- |
| 1        | `VerifyMediaHook`                                            | `setup`, `refresh`                                | Sets `mediaShape` — must run first                                     |
| 2        | `MediaHook`                                                  | `setup`, `update`, `destroy`                      | Sets `videoElement`; on server `update` is no-op                       |
| 3        | `MediaSeekingHook`                                           | `setup`, `update`, `destroy`, `refresh`           | Seeks video to correct frame time                                      |
| **4**    | **`DeterministicMediaFrameHook`**                            | **`update`**                                      | **Writes `pixiResource`; must run after MediaSeeking, before texture** |
| 5        | `PixiVideoTextureHook`                                       | `update`, `destroy`, `refresh:content`            | Reads `videoElement` → writes `pixiTexture`                            |
| 10       | `PixiDisplayObjectHook` / `PixiSplitScreenDisplayObjectHook` | `update`, `destroy`, `refresh`, `refresh:content` | Reads `pixiTexture` → writes `pixiRenderObject`                        |

**Why priority 4 (not lower)?**
`DeterministicMediaFrameHook` must run _after_ `MediaSeekingHook` (priority 3) because
`MediaSeekingHook` settles the video element at the correct frame time. If the deterministic
hook runs first and there is no provider response (null → native fallback), the video element
must already be at the right position before `PixiVideoTextureHook` reads it.

**Why priority 4 (not higher than 5)?**
The deterministic hook writes `pixiResource`, which `PixiVideoTextureHook` at priority 5
would otherwise overwrite if it runs without a guard. Two options exist:

- **Option A (recommended):** Keep priority 4, add a guard to `PixiVideoTextureHook`:
  if `context.getResource('pixiResource')` is already set, skip the `videoElement → texture`
  path and directly assert `pixiTexture` from the pre-supplied resource. This is a
  two-line change to `PixiVideoTextureHook.#handleUpdate()`.
- **Option B:** Set deterministic hook priority > 5 and write both `pixiResource`
  _and_ call `PIXI.Texture.from()` inside the hook itself, bypassing `PixiVideoTextureHook`.
  **Reject this** — it couples the hook to PIXI texture management, duplicates destruction
  logic, and means split-screen effects that read `pixiTexture` must also be guarded.

**Option A is the correct choice.** The guard in `PixiVideoTextureHook` is minimal:

```typescript
// In PixiVideoTextureHook.#handleUpdate():
async #handleUpdate() {
  // Deterministic path: pixiResource is pre-supplied (frame already decoded).
  // Create texture from it and skip native videoElement path.
  const preSupplied = this.#context.getResource('pixiResource');
  if (preSupplied) {
    if (!this.#videoTexture || this.#lastResource !== preSupplied) {
      if (this.#videoTexture) this.#videoTexture.destroy(true);
      this.#videoTexture = PIXI.Texture.from(preSupplied);
      this.#lastResource = preSupplied;
      this.#context.setResource('pixiTexture', this.#videoTexture);
    }
    return; // Do NOT proceed to native video element path
  }
  // ... existing videoElement logic unchanged ...
}
```

This keeps `PixiDisplayObjectHook` and `PixiSplitScreenDisplayObjectHook` completely
unmodified — they only care about `pixiTexture`, which is always set by priority 5.

### Activation guard in DeterministicMediaFrameHook

```typescript
async handle(type: HookType, context: IComponentContext) {
  // Server-only; deterministic must be explicitly enabled
  if (context.sceneState.environment !== 'server') return;
  if (!this.manager.config.enabled) return;
  if (context.contextData.type !== 'VIDEO' && context.contextData.type !== 'GIF') return;

  if (type === 'update') return this.#handleUpdate(context);
}
```

The hook only handles `update`. On `setup`/`destroy`/`refresh`, it is a no-op and lets
the existing native chain run unmodified. This keeps the deterministic feature as a
pure overlay rather than a replacement.

---

## Build Order

Dependencies flow strictly from bottom to top. Build in this order:

### Phase 1 — Types and interfaces (no implementation deps)

1. `DeterministicMediaConfig` type (config shape for `createSceneBuilder`)
2. `DeterministicFrameRequest` type (what is sent to provider: `componentId`, `time`, `fps`, scene info)
3. `DeterministicFramePayload` type (what provider returns: `cacheKey`, `resource`)
4. `DeterministicFrameOverride` type (internal resolved result from manager)
5. `DeterministicFrameProvider` interface (single method: `getFrame(request): Promise<DeterministicFramePayload | null>`)
6. `DeterministicRenderError` class (extends `Error`, thrown in strict mode)
7. Add `deterministicMedia?: DeterministicMediaConfig` to `createSceneBuilder` options type

### Phase 2 — DeterministicMediaManager (depends on Phase 1 only)

8. Implement `DeterministicMediaManager` as a plain TypeScript class (not Svelte)
9. Register in `DIContainer.ts` as `SINGLETON`: `deterministicMediaManager: asClass(DeterministicMediaManager)`
10. Inject into `SceneBuilder` constructor via cradle
11. Add `SceneBuilder.setDeterministicFrameProvider()` and `getDeterministicFrameProvider()` façade methods
12. `DeterministicMediaManager.getFingerprint()` returns a string hash of current committed cacheKeys

### Phase 3 — DeterministicMediaFrameHook (depends on Phase 2)

13. Implement `DeterministicMediaFrameHook` as transient hook
14. Register in `DIContainer.ts` as `TRANSIENT`: `deterministicMediaFrameHook: asClass(DeterministicMediaFrameHook)`
15. Add `withDeterministicMedia()` to `PixiComponentBuilder` and `IComponentBuilder` interface
16. Update `ComponentDirector.constructVideo()` and `constructGif()` to call `.withDeterministicMedia()` when `environment === 'server'`

### Phase 4 — Guard in PixiVideoTextureHook (depends on Phase 3 order logic)

17. Add the two-line `pixiResource` pre-supply guard to `PixiVideoTextureHook.#handleUpdate()` (see above)
18. No other existing hooks require modification

### Phase 5 — RenderFrameCommand fingerprint (depends on Phase 2)

19. Inject `DeterministicMediaManager` into `RenderFrameCommand` via cradle
20. In the server cache guard, include `manager.getFingerprint()` as part of the cache key comparison (see renderFrameRange section below)

### Phase 6 — renderFrameRange (depends on all prior phases)

21. Implement `SceneBuilder.renderFrameRange()` (see design below)
22. Add `RENDER_FRAME_RANGE` to `CommandType` enum — OR implement as a direct method
23. Update `SceneBuilder` interface type to expose `renderFrameRange()`

### Phase 7 — ReplaceSourceOnTimeCommand (can be parallel with Phase 6)

24. Implement `ReplaceSourceOnTimeCommand.execute()` as a wrapper that calls
    `deterministicMediaManager.setOneTimeOverride(componentId, time, resource)`.
    This replaces the empty placeholder without deleting the class (backward compatible).

---

## renderFrameRange Design

### Decision: Direct Method, Not a New Command

`renderFrameRange()` is a **high-level orchestration method on SceneBuilder**, not a
single-step operation. It composes several already-existing commands (`seek`, `renderFrame`)
in a loop. The Command pattern in this codebase is used for single-step, reusable, Awilix-wirable
operations (each command handles one `execute(args)`). A loop that calls multiple commands
in sequence is correctly modelled as a SceneBuilder method.

**Reject:** Adding a `RenderFrameRangeCommand` — it would violate the single-responsibility
shape all other commands follow and would require threading a callback through the Awilix DI
system with no benefit.

**Use:** A direct async method on `SceneBuilder`.

### Signature

```typescript
/**
 * Render a contiguous range of frames and deliver each to a sink callback.
 * Only available in server environment.
 *
 * @param fromFrame  First frame index (inclusive, 0-based)
 * @param toFrame    Last frame index (exclusive)
 * @param sink       Called with each (frameIndex, blob/arraybuffer/base64) pair
 * @param options    format, quality, onProgress
 */
async renderFrameRange(
  fromFrame: number,
  toFrame: number,
  sink: (frameIndex: number, frame: string | ArrayBuffer | Blob) => Promise<void>,
  options?: RenderFrameRangeOptions
): Promise<void>
```

### Implementation sketch

```typescript
async renderFrameRange(fromFrame, toFrame, sink, options = {}) {
  if (this.environment !== 'server') {
    throw new Error('renderFrameRange is only available in server environment');
  }
  const { format = 'png', quality = 1, onProgress } = options;
  const fps = this.fps;

  for (let i = fromFrame; i < toFrame; i++) {
    const time = i / fps;
    await this.seek(time);              // SeekCommand: seek + multi-pass render until !loading
    const frame = await this.renderFrame(undefined, format, quality); // RenderFrameCommand
    await sink(i, frame);
    onProgress?.(i - fromFrame, toFrame - fromFrame);
  }
}
```

`SeekCommand` already handles the multi-pass render loop and loading-state wait.
`RenderFrameCommand` already has the server-side dirty-flag cache guard.

### How the deterministic cacheKey fingerprint integrates with the cache guard

The `RenderFrameCommand` cache guard currently checks:

1. `environment === 'server'`
2. `!sceneState.isDirty`
3. `lastRenderArgs` (format + quality + target match)

Add a fourth check: 4. `lastDeterministicFingerprint === deterministicMediaManager.getFingerprint()`

`getFingerprint()` returns a stable string derived from the map of `componentId → lastCacheKey`
values. A simple implementation: `JSON.stringify([...this.#lastCacheKey.entries()].sort())`.

When the deterministic hook commits a new cacheKey via `manager.commitCacheKey()`, the
fingerprint changes. `RenderFrameCommand` detects the mismatch, skips the cache, renders
fresh, then updates `lastDeterministicFingerprint` on success.

This cleanly separates concerns:

- `DeterministicMediaFrameHook` handles cacheKey delta → `state.markDirty()` (for the
  PIXI render itself to happen)
- `RenderFrameCommand` handles cacheKey fingerprint → skip stale frame extraction cache
  (the optimization layer on top of rendering)

```typescript
// In RenderFrameCommand:
private lastDeterministicFingerprint: string = '';

async execute(args) {
  // ...
  if (this.sceneState.environment === 'server' && !this.sceneState.isDirty) {
    const currentFingerprint = this.deterministicMediaManager?.getFingerprint() ?? '';
    if (
      this.lastRenderedFrame &&
      this.lastRenderArgs &&
      argsMatch &&
      this.lastDeterministicFingerprint === currentFingerprint
    ) {
      return this.lastRenderedFrame;  // Safe cache hit
    }
  }
  // ... render ...
  this.lastDeterministicFingerprint = this.deterministicMediaManager?.getFingerprint() ?? '';
  // ...
}
```

---

## Question-by-Question Answers

### Q1: Where in priority order should DeterministicMediaFrameHook sit?

**Priority 4**, between `MediaSeekingHook` (priority 3) and `PixiVideoTextureHook` (priority 5).
This requires assigning distinct priorities to all hooks in the video chain (they all currently
sit at priority 1 with de-facto ordering by insertion). Updating priority numbers in existing
hooks is a safe, non-breaking change.

### Q2: How should the hook short-circuit native media loading?

**Write `pixiResource` at priority 4; add a guard in `PixiVideoTextureHook` at priority 5.**
`PixiVideoTextureHook` checks `context.getResource('pixiResource')` at the top of `#handleUpdate()`.
If present, it creates texture from it and returns early — skipping the `videoElement` path.
`PixiDisplayObjectHook` and `PixiSplitScreenDisplayObjectHook` need zero changes.
`MediaHook.#handleUpdate()` already no-ops on server (line 187: `if (this.state.environment === 'server') return`),
so there is no race — the videoElement is idle, not playing.

### Q3: Should DeterministicMediaManager use Svelte 5 reactive state or plain TypeScript class?

**Plain TypeScript class (no Svelte runes).**

Rationale: `DeterministicMediaManager` is a server-side singleton with no UI consumers.
Svelte runes (`$state`, `$derived`) are only beneficial when values are reactively read
by Svelte components or tracked in `.svelte` files. This manager lives entirely in
`src/lib/managers/` and is consumed only by a hook and by `RenderFrameCommand`.

Introducing `$state` in a non-.svelte.ts context (plain `.ts`) would require wrapping
in `$effect.root()` at call sites, adds unnecessary compilation overhead, and provides
zero benefit since nothing reactive depends on these values.

Compare: `StateManager.svelte.ts` uses `$state` because `stateManager.state`,
`stateManager.isPlaying`, etc. are _read in Svelte component templates_. The
deterministic manager has no template consumers.

**File name:** `DeterministicMediaManager.ts` (not `.svelte.ts`).

### Q4: How should renderFrameRange() be implemented as a command vs direct method?

**Direct method on SceneBuilder**, not a command. See "renderFrameRange Design" section above.
The Command pattern in this codebase models single-step atomic operations with a fixed `execute(args)`
interface. `renderFrameRange` is inherently multi-step orchestration with a streaming sink callback.
Forcing it into the command shape would produce a god-command that wraps the entire other commands,
adds no reuse benefit, and cannot be registered as a `CommandType` singleton without threading
a callback reference through Awilix (which is architecturally wrong for this pattern).

### Q5: What's the cleanest way to include deterministic cacheKey fingerprint in the RenderFrameCommand cache guard?

**Inject `DeterministicMediaManager` into `RenderFrameCommand`, call `getFingerprint()` as
a fourth cache guard condition, and store `lastDeterministicFingerprint` alongside
`lastRenderArgs`.**

The fingerprint is the serialized sorted `Map<componentId, cacheKey>`. It changes when any
component's frame advance commits a new cacheKey. If the fingerprint matches the last cached
render and `isDirty` is false and args match, the cached frame is safe to return.
`getFingerprint()` is a pure O(n) operation on a small map — negligible cost per frame.

Note: `deterministicMediaManager` can be injected as nullable (undefined when
`deterministicMedia.enabled = false`). The guard simply treats undefined as
`fingerprint = ''` and always returns empty string — equivalent to the current behavior
where the field doesn't exist.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Writing pixiTexture directly in DeterministicMediaFrameHook

**What goes wrong:** If the hook creates a `PIXI.Texture` directly, it duplicates the
`PixiVideoTextureHook` lifecycle (creation, destruction, `#texture` field guard).
Two textures for the same component will exist briefly, leaking GPU memory. The hook
also then needs to destroy on `refresh:content` and `destroy` — growing its surface area.

**Instead:** Write only `pixiResource`. Let `PixiTextureHook`/`PixiVideoTextureHook`
create the texture from it as they already do for image components.

### Anti-Pattern 2: Registering DeterministicMediaManager as TRANSIENT

**What goes wrong:** Each hook gets its own manager instance; cacheKey state is not shared
across components in the same scene; `getFingerprint()` returns wrong data.

**Instead:** SINGLETON in `DIContainer.ts` — same manager for all hooks in a scene.

### Anti-Pattern 3: Activating the deterministic hook for client environment

**What goes wrong:** Frame provider will not be set; `resolveOverride()` returns null;
but the hook still runs code on every tick, adding overhead and error surface.

**Instead:** Hard exit guard: `if (context.sceneState.environment !== 'server') return;`
at the top of `handle()`. Make it the very first line.

### Anti-Pattern 4: Mutating MediaHook's server guard

`MediaHook.#handleUpdate()` line 187 already does `if (this.state.environment === 'server') return`.
Do not remove or alter this guard when adding the deterministic path — it is a correct
and intentional no-op for server media management. The two subsystems operate independently.

### Anti-Pattern 5: Putting renderFrameRange in CommandRunner

**What goes wrong:** `CommandRunner.run()` is a switch statement over `CommandType` enum.
Adding `RENDER_FRAME_RANGE` forces a callback parameter through `execute(args: unknown)`,
which then must be decoded (unknown → callback is not Zod-parseable), breaking the
validation pattern every other command uses.

**Instead:** Direct `SceneBuilder` method that calls existing `this.seek()` and `this.renderFrame()`.

---

## Sources

All findings are HIGH confidence from direct inspection of:

- `src/lib/components/ComponentContext.svelte.ts` — `runHooks()` sort logic (line 135), `ResourceTypes` Map
- `src/lib/components/hooks/PixiVideoTextureHook.ts` — `#handleUpdate()`, priority 1, `videoElement` → `pixiTexture`
- `src/lib/components/hooks/PixiTextureHook.ts` — `#handleUpdate()`, priority 1, `pixiResource` → `pixiTexture`
- `src/lib/components/hooks/PixiDisplayObjectHook.ts` — `#handleUpdate()`, priority 1, `pixiTexture` consumer
- `src/lib/components/hooks/MediaHook.ts` — line 187 server no-op guard; `videoElement` resource write
- `src/lib/components/hooks/MediaSeekingHook.ts` — server seeking logic, priority 1
- `src/lib/directors/ComponentDirector.ts` — `constructVideo()` hook chain: `withMedia().withMediaSeeking().withVideoTexture().withSplitScreen()`
- `src/lib/builders/PixiComponentBuilder.ts` — `withMedia()` adds both `verifyMediaHook` + `mediaHook`; `withVideoTexture()` adds `videoTextureHook`; `withSplitScreen()` adds `splitScreenHook`
- `src/lib/DIContainer.ts` — Awilix registration: all hooks TRANSIENT, all managers SINGLETON
- `src/lib/commands/RenderFrameCommand.ts` — server cache guard: `isDirty` + `lastRenderArgs`
- `src/lib/commands/SeekCommand.ts` — multi-pass render loop for server (lines 52-67)
- `src/lib/managers/StateManager.svelte.ts` — `$state` usage, `markDirty()`, `clearDirty()`, `isDirty`
- `src/lib/SceneBuilder.svelte.ts` — `seekAndRenderFrame()`, `renderFrame()`, `isSceneDirty()`
- `src/lib/commands/ReplaceSourceOnTimeCommand.ts` — confirmed empty placeholder
- `src/lib/schemas/runtime/types.ts` — `ResourceTypes`, `IComponentHook`, `HookType` definitions
