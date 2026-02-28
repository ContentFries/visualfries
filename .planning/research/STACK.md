# Technology Stack: Deterministic Server-Side Media Rendering

**Project:** Visualfries — DeterministicMediaManager milestone  
**Researched:** 2026-02-21  
**Scope:** Adding `DeterministicFrameProvider`, `DeterministicMediaManager`, `DeterministicMediaFrameHook`, and `renderFrameRange()` to the existing Visualfries animation library.

---

## Existing Stack (Verified from `package.json` + `node_modules`)

| Technology       | Version        | Role                                                                    |
| ---------------- | -------------- | ----------------------------------------------------------------------- |
| `pixi.js-legacy` | 7.4.3          | Canvas/WebGL renderer — canvas forced on server via `forceCanvas: true` |
| `gsap`           | 3.13.0         | Animation timeline, drives `seek()`                                     |
| `svelte`         | ^5.0.0 (runes) | Reactive state via `.svelte.ts` files                                   |
| `awilix`         | ^12.0.3        | IoC/DI — cradle pattern throughout                                      |
| `vitest`         | ^2.0.4         | Test runner                                                             |
| `jsdom`          | ^26.1.0        | DOM environment for tests                                               |
| `hls.js`         | ^1.5.17        | HLS video streaming                                                     |

**No new npm dependencies are required.** Everything needed for `DeterministicMediaManager` is achievable with existing packages and native platform APIs.

---

## Recommended Additions to the Stack

### None — Zero New Dependencies

All of the following capabilities are already present:

| Capability                     | What provides it                                                | Confidence                                          |
| ------------------------------ | --------------------------------------------------------------- | --------------------------------------------------- |
| Raw pixel → PixiJS texture     | `PIXI.BufferResource` + `PIXI.BaseTexture.fromBuffer()` (7.4.3) | HIGH — confirmed in `node_modules/@pixi/core` types |
| ImageBitmap → PixiJS texture   | `PIXI.ImageBitmapResource` (7.4.3)                              | HIGH — confirmed in type definitions                |
| Hot-swap texture data          | `PIXI.BaseTexture.setResource(resource)` (7.4.3)                | HIGH — confirmed in type definitions                |
| Canvas pixels → PixiJS texture | `PIXI.CanvasResource` (7.4.3)                                   | HIGH — confirmed; canonical server path             |
| Frame cache storage            | `Map<string, FramePayload>` — plain TypeScript                  | HIGH                                                |
| DI/lifecycle                   | `awilix` cradle (already used by all managers)                  | HIGH                                                |
| Reactive state                 | Svelte 5 runes (`.svelte.ts`) — already used by `StateManager`  | HIGH                                                |
| Testing                        | `vitest` + `jsdom` — already configured                         | HIGH                                                |

---

## Key PixiJS 7.4.3 APIs for Dynamic Texture Injection

These were verified directly from `node_modules/.pnpm/@pixi+core@7.4.3/`.

### 1. `PIXI.BufferResource` — Primary injection path for raw RGBA frames

```typescript
import { BufferResource, BaseTexture, Texture } from 'pixi.js-legacy';

// From a pre-decoded RGBA Uint8ClampedArray (e.g. from ImageData or ffmpeg output)
const resource = new BufferResource(uint8ClampedArray, { width, height });
const baseTexture = new BaseTexture(resource);
const texture = new Texture(baseTexture);
```

- `BufferType` = `Uint8Array | Uint8ClampedArray | Float32Array | Int8Array | Uint16Array | Int16Array | Int32Array | Uint32Array | Float64Array`
- Has `upload()`, `dispose()`, and static `test()`
- **Confidence: HIGH**

### 2. `PIXI.BaseTexture.fromBuffer()` — Static factory

```typescript
import { BaseTexture } from 'pixi.js-legacy';

const baseTexture = BaseTexture.fromBuffer(uint8ClampedArray, width, height, options);
```

- Cleanest path from a typed array directly to a `BaseTexture<BufferResource>`
- **Confidence: HIGH**

### 3. `PIXI.BaseTexture.setResource()` — In-place hot-swap

```typescript
// Update a texture already in use without destroying it or rebuilding the Sprite
existingBaseTexture.setResource(newBufferResource);
existingBaseTexture.update(); // push to GPU
```

- Preferred for `update` hook path: avoids re-assigning `pixiTexture` resource on every frame
- **Confidence: HIGH**

### 4. `PIXI.ImageBitmapResource` — For `ImageBitmap` payload type

```typescript
import { ImageBitmapResource, BaseTexture, Texture } from 'pixi.js-legacy';

const resource = new ImageBitmapResource(imageBitmap);
const baseTexture = new BaseTexture(resource);
const texture = new Texture(baseTexture);
```

- Works with `createImageBitmap(blob)` in browser; available in Node 18+ via web canvas module
- `ownsImageBitmap` option controls lifecycle (whether PixiJS closes the bitmap on dispose)
- **Confidence: HIGH**

### 5. `PIXI.CanvasResource` — Canonical server path

```typescript
import { CanvasResource, BaseTexture, Texture } from 'pixi.js-legacy';

const resource = new CanvasResource(offscreenCanvas);
const baseTexture = new BaseTexture(resource);
const texture = new Texture(baseTexture);
```

- On server (`forceCanvas: true`), this is already how `AppManager` operates
- Can wrap `OffscreenCanvas` or a `node-canvas` `Canvas` instance
- **Confidence: HIGH**

### 6. `PIXI.VideoResource` — NOT used for deterministic frames

Already used in `PixiVideoTextureHook` for live `HTMLVideoElement` streaming. **Do not use** for pre-supplied frames; `BufferResource` or `ImageBitmapResource` is correct.

---

## `DeterministicMediaManager`: Plain TypeScript vs Svelte Runes

**Recommendation: Plain TypeScript (`.ts`), not `.svelte.ts`)**

Rationale:

| Concern                     | Plain `.ts`                                 | `.svelte.ts` (runes)              |
| --------------------------- | ------------------------------------------- | --------------------------------- |
| Server-side compatibility   | ✅ No Svelte compiler dependency at runtime | ⚠️ Runes require Svelte runtime   |
| Mirrors existing pattern    | ✅ `MediaManager.ts` is plain TS            | —                                 |
| Reactive UI updates needed? | ❌ No — frame cache is not UI state         | If yes, runes help                |
| Awilix DI compatibility     | ✅ Works perfectly                          | ✅ Works (used by `StateManager`) |
| Test complexity             | ✅ No Svelte test setup needed              | ⚠️ Needs Svelte environment       |

`StateManager.svelte.ts` uses runes because its state (playing, currentTime, etc.) drives reactive Svelte component rendering. `DeterministicMediaManager` manages a frame cache — it is not UI state. Use plain TypeScript.

**Confidence: HIGH** — based on direct comparison with `MediaManager.ts` and `StateManager.svelte.ts` in this codebase.

---

## TypeScript Patterns for the Provider/Sink Interface

### `DeterministicFrameProvider` — union payload type

```typescript
// Blob requires conversion; document this explicitly
export type DeterministicFramePayload =
	| { type: 'arraybuffer'; data: ArrayBuffer; width: number; height: number }
	| { type: 'uint8clampedarray'; data: Uint8ClampedArray; width: number; height: number }
	| { type: 'imagebitmap'; data: ImageBitmap }
	| { type: 'blob'; data: Blob; width: number; height: number }; // decoded on registration

export interface DeterministicFrameProvider {
	/**
	 * Called once before render. Must supply ALL frames synchronously
	 * or return a promise that resolves before renderFrameRange() is called.
	 */
	getFrame(componentId: string, frameIndex: number): DeterministicFramePayload | undefined;
}
```

### Key design decision: pre-loaded registry, not async-during-render

Remotion's `delayRender()` / `continueRender()` model is **NOT appropriate** here. Remotion pauses the React render tree and resumes it when async work finishes. Visualfries renders frame-by-frame via `seek()` + `renderFrame()` — there is no render tree to pause. The correct pattern is:

- Provider is called **before** `renderFrameRange()` begins
- All frames must be in cache before the render loop starts
- The `DeterministicMediaFrameHook` reads synchronously from cache during the `update` hook

This is closer to **Rive's asset loader callback** pattern:

```typescript
// Rive pattern (reference only):
rive.load({
	assetLoader: (asset, bytes) => {
		asset.decode(bytes);
		return true;
	}
});
```

...where assets are decoded at load time, not at render time.

### `DeterministicMediaManager` — Map-based cache (mirrors `MediaManager.ts`)

```typescript
export class DeterministicMediaManager {
	// Keyed by `${componentId}:${frameIndex}`
	#cache = new Map<string, DeterministicFramePayload>();

	register(componentId: string, frameIndex: number, payload: DeterministicFramePayload): void {
		this.#cache.set(`${componentId}:${frameIndex}`, payload);
	}

	getFrame(componentId: string, frameIndex: number): DeterministicFramePayload | undefined {
		return this.#cache.get(`${componentId}:${frameIndex}`);
	}

	clearComponent(componentId: string): void {
		for (const key of this.#cache.keys()) {
			if (key.startsWith(`${componentId}:`)) this.#cache.delete(key);
		}
	}

	destroy(): void {
		this.#cache.clear();
	}
}
```

### `DeterministicMediaFrameHook` — mirrors `PixiGifHook` structure

```typescript
export class DeterministicMediaFrameHook implements IComponentHook {
  types: HookType[] = ['setup', 'update', 'destroy'];
  priority: number = 2;  // after texture hooks that create the BaseTexture

  constructor(cradle: { deterministicMediaManager: DeterministicMediaManager; stateManager: StateManager }) { ... }

  async #handleUpdate() {
    const frameIndex = this.state.currentFrame;
    const payload = this.#manager.getFrame(this.#context.id, frameIndex);
    if (!payload) return;

    // Convert payload to BufferResource and hot-swap via setResource()
    const resource = payloadToBufferResource(payload);
    const baseTex = (this.#context.getResource('pixiTexture') as any)?.baseTexture;
    if (baseTex) {
      baseTex.setResource(resource);
      baseTex.update();
    }
  }
}
```

---

## `ResourceTypes` Extension

Add one new key to `ResourceTypes` in `src/lib/schemas/runtime/types.ts`:

```typescript
export interface ResourceTypes {
	// ... existing keys ...
	deterministicFrame: DeterministicFramePayload | undefined;
}
```

This is optional — the hook can operate without a `ResourceTypes` entry if it reads from the manager directly — but adding it aligns with existing conventions and makes the resource inspectable.

---

## `renderFrameRange()` on `SceneBuilder`

No new dependencies. Uses existing `seekAndRenderFrame()` in a loop:

```typescript
async renderFrameRange(
  startFrame: number,
  endFrame: number,
  fps: number,
  options?: { format?: string; quality?: number }
): Promise<Array<{ frame: number; data: string | ArrayBuffer | Blob }>> {
  const results = [];
  for (let frame = startFrame; frame <= endFrame; frame++) {
    const time = frame / fps;
    const data = await this.seekAndRenderFrame(time, undefined, options?.format, options?.quality);
    results.push({ frame, data });
  }
  return results;
}
```

Signature addition to `SceneBuilder` interface in `types.ts`:

```typescript
renderFrameRange(
  startFrame: number,
  endFrame: number,
  fps: number,
  options?: { format?: string; quality?: number }
): Promise<Array<{ frame: number; data: string | ArrayBuffer | Blob }>>;
```

---

## What NOT to Use (and Why)

| Avoid                                                 | Reason                                                                                | Use instead                                                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `PIXI.VideoResource` for deterministic frames         | Requires `HTMLVideoElement`; async, non-deterministic frame timing                    | `BufferResource` or `ImageBitmapResource`                                                                               |
| `PIXI.Texture.fromURL()`                              | Async network fetch; not suitable for pre-supplied data                               | `BaseTexture.fromBuffer()` or `new Texture(new BaseTexture(new BufferResource(...)))`                                   |
| `Blob` directly as PixiJS resource                    | No `BlobResource` exists in PixiJS 7.x                                                | Convert to `ArrayBuffer` → `Uint8ClampedArray` → `BufferResource`, or `createImageBitmap(blob)` → `ImageBitmapResource` |
| `PIXI.settings.CREATE_IMAGE_BITMAP = true`            | Experimental flag in 7.4.3; defaults to `false`; affects global texture loading       | Leave at default; use `ImageBitmapResource` explicitly where needed                                                     |
| Remotion `delayRender()` / `continueRender()` pattern | React-specific render-tree suspension model; incompatible with Visualfries frame loop | Pre-loaded registry pattern: all frames supplied before `renderFrameRange()` call                                       |
| `.svelte.ts` for `DeterministicMediaManager`          | Frame cache is not UI-reactive state; adds Svelte runtime dependency unnecessarily    | Plain `.ts` class, matches `MediaManager.ts`                                                                            |
| `new PIXI.Texture()` + `destroy(true)` per frame      | Destroying and recreating textures every frame causes GPU churn                       | Keep one `BaseTexture` per component, hot-swap resource via `setResource()` + `update()`                                |

---

## Blob Handling: Explicit Conversion Path

PixiJS 7.x has no `BlobResource`. When the provider supplies a `Blob`:

**Browser:**

```typescript
// Option A: ImageBitmap path (preserves color fidelity)
const bitmap = await createImageBitmap(blob);
const resource = new PIXI.ImageBitmapResource(bitmap, { ownsImageBitmap: true });

// Option B: ArrayBuffer path (works everywhere)
const ab = await blob.arrayBuffer();
const uint8 = new Uint8ClampedArray(ab);
const resource = new PIXI.BufferResource(uint8, { width, height });
```

**Server (Node.js 18+):**

- `createImageBitmap` is available in Node 18+ globally
- If using `@napi-rs/canvas` or `node-canvas`, their `Canvas`/`createImageBitmap` APIs are compatible
- `CanvasResource` wrapping a decoded-and-drawn canvas is the safest server path

**Confidence: HIGH** (negative claim — "no BlobResource" — verified by searching all resource type definitions in `node_modules/@pixi/core/lib/textures/resources/`)

---

## Awilix Registration Pattern

Follow the existing cradle pattern. Register `DeterministicMediaManager` as a singleton:

```typescript
// In the DI container setup (mirrors how MediaManager is registered)
container.register({
	deterministicMediaManager: asClass(DeterministicMediaManager).singleton()
});
```

Hook receives it via cradle:

```typescript
constructor(cradle: {
  deterministicMediaManager: DeterministicMediaManager;
  stateManager: StateManager;
}) { ... }
```

**Confidence: HIGH** — verified against all existing manager constructors in `src/lib/managers/`.

---

## Sources

| Claim                                                                                                 | Source                                                                                                 | Confidence |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------- |
| `BufferResource`, `ImageBitmapResource`, `BaseTexture.fromBuffer()`, `BaseTexture.setResource()` APIs | `node_modules/.pnpm/@pixi+core@7.4.3/node_modules/@pixi/core/lib/textures/resources/` type definitions | HIGH       |
| `CanvasResource` as server path                                                                       | `AppManager.svelte.ts` `forceCanvas: true` + type definitions                                          | HIGH       |
| No `BlobResource` in PixiJS 7                                                                         | Exhaustive search of all files in `node_modules/@pixi/core/lib/textures/resources/`                    | HIGH       |
| Hook system interface (`IComponentHook`, `HookType`, `ResourceTypes`)                                 | `src/lib/schemas/runtime/types.ts`                                                                     | HIGH       |
| `MediaManager.ts` = plain TS pattern                                                                  | `src/lib/managers/MediaManager.ts`                                                                     | HIGH       |
| `StateManager.svelte.ts` = runes pattern                                                              | `src/lib/managers/StateManager.svelte.ts`                                                              | HIGH       |
| Existing server render path                                                                           | `src/lib/managers/AppManager.svelte.ts`                                                                | HIGH       |
| `MediaSeekingHook` texture update pattern (`baseTex.resource.update()`)                               | `src/lib/components/hooks/MediaSeekingHook.ts` lines 203–211                                           | HIGH       |
| `PixiGifHook` ArrayBuffer precedent                                                                   | `src/lib/components/hooks/PixiGifHook.ts` lines 32–33                                                  | HIGH       |
| Remotion `delayRender`/`continueRender` model                                                         | Context7 Remotion docs (researched in prior session)                                                   | MEDIUM     |
| Rive asset loader callback pattern                                                                    | Rive official docs (researched in prior session)                                                       | MEDIUM     |
