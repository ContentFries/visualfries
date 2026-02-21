# Architecture

**Analysis Date:** 2026-02-21

## Pattern Overview

**Overall:** Plugin-based Media Scene Renderer with IoC / DI container — published as an npm library

**Key Characteristics:**

- Awilix DI container (`src/lib/DIContainer.ts`) wires all singletons and transients per-scene instance; each `Scene` object gets its own isolated container scoped by `scene.id`
- Managers own domain state; `SceneBuilder` is the public façade that delegates every operation to managers via a Command pattern
- Components are assembled via a Builder/Director pattern: `ComponentDirector` selects hooks based on component type; `PixiComponentBuilder` attaches them; `Component` runs them
- All visual output is a dual-surface: a PIXI.js WebGL/Canvas stage (`AppManager`) overlaid with an HTML DOM layer (`DomManager`) for text and HTML animations
- Svelte 5 runes (`$state`, `$derived`) are used inside managers (`.svelte.ts` files) to make state reactive — not Svelte components

## Layers

**Public API Layer:**

- Purpose: What library consumers call
- Location: `src/lib/index.ts`, `src/lib/factories/SceneBuilderFactory.ts`
- Contains: `createSceneBuilder()`, composers, `StyleBuilder`, font providers, schemas, seeds
- Depends on: DI layer, Schema layer
- Used by: external consumers and the docs routes

**DI / Wiring Layer:**

- Purpose: Constructs and connects all services for one scene instance
- Location: `src/lib/DIContainer.ts`
- Contains: `registerNewContainer()`, `removeContainer()`; registers every singleton/transient via Awilix
- Depends on: all managers, builders, commands, hooks
- Used by: `SceneBuilderFactory`

**Façade Layer:**

- Purpose: Single stable public object for all scene operations
- Location: `src/lib/SceneBuilder.svelte.ts`
- Contains: `SceneBuilder` class (implements `ISceneBuilder`)
- Depends on: managers, `CommandRunner`
- Used by: library consumers; constructed only via `SceneBuilderFactory`

**Manager Layer:**

- Purpose: Domain-specific state and logic; managers are singletons per container
- Location: `src/lib/managers/`
- Contains: `StateManager`, `TimelineManager`, `AppManager`, `DomManager`, `LayersManager`, `ComponentsManager`, `RenderManager`, `MediaManager`, `SubtitlesManager`, `EventManager`, `TimeManager`
- Depends on: each other via DI cradle injection; PIXI, GSAP
- Used by: `SceneBuilder`, Commands, `RenderManager`

**Command Layer:**

- Purpose: Encapsulates operations (play, pause, seek, render, renderFrame, updateComponent) for clean async dispatch
- Location: `src/lib/commands/`
- Contains: `Command` interface, `SyncCommand` interface, `CommandRunner`, concrete command classes
- Depends on: Manager layer
- Used by: `SceneBuilder.run()` / `SceneBuilder.runSync()`

**Component Assembly Layer:**

- Purpose: Constructs typed `Component` instances with the correct hooks for their media type
- Location: `src/lib/directors/`, `src/lib/builders/`
- Contains: `ComponentDirector` (selects hook chain by type), `PixiComponentBuilder` (Builder pattern, fluent API), `ComponentState` (reactive component data)
- Depends on: Hook layer, Manager layer
- Used by: `ComponentsManager.create()`

**Hook Layer:**

- Purpose: Stateless, composable units of behavior (setup/update/refresh/destroy) attached to components
- Location: `src/lib/components/hooks/`
- Contains: 19 hook classes — media (`MediaHook`, `MediaSeekingHook`), image (`ImageHook`), GIF (`PixiGifHook`), texture (`PixiTextureHook`), display object (`PixiDisplayObjectHook`), text/HTML (`HtmlTextHook`, `HtmlAnimationHook`), animation (`AnimationHook`), subtitles (`SubtitlesHook`), shapes (`CanvasShapeHook`, `PixiProgressShapeHook`), verify/guard hooks (`VerifyMediaHook`, `VerifyImageHook`, `VerifyGifHook`), split-screen (`PixiSplitScreenDisplayObjectHook`), server rendering (`HtmlToCanvasHook`)
- Depends on: `ComponentContext`, `MediaManager`, PIXI, GSAP
- Used by: Components via `Component.addHook()`

**Schema Layer:**

- Purpose: Zod schemas for all scene data structures (validation + type inference); runtime TypeScript interfaces for class instances
- Location: `src/lib/schemas/scene/`, `src/lib/schemas/runtime/`
- Contains: `SceneShape`, `ComponentShape`, and all sub-schemas; `ISceneBuilder`, `IComponent`, `ILayer`, `EventMap`, `HookType`, `ResourceTypes`
- Depends on: zod
- Used by: entire library; all types flow from here

**Animation Layer:**

- Purpose: GSAP-based animation presets, builders, and an animation preset registry
- Location: `src/lib/animations/`
- Contains: `AnimationPresetsRegister`, `AnimationHook`, `AnimationEngineAdaptor`, `GSAPEngineAdaptor`, `SplitTextCache`, preset files
- Depends on: GSAP, `ComponentContext`
- Used by: `AnimationHook`, exported presets consumed by library users

**Composer / Utility Layer:**

- Purpose: Fluent builder helpers for constructing scene/layer/component data objects before passing to `createSceneBuilder`
- Location: `src/lib/composers/`
- Contains: `createSceneComposer`, `createLayerComposer`, `createComponentComposer`
- Depends on: Schema layer
- Used by: library consumers

## Data Flow

**Scene Initialization:**

1. Consumer calls `createSceneBuilder(sceneData, containerElement, config)` in `src/lib/factories/SceneBuilderFactory.ts`
2. `registerNewContainer()` in `src/lib/DIContainer.ts` creates an Awilix container scoped to `sceneData.id` and registers all managers/hooks/commands as singletons or transients
3. Factory resolves `SceneBuilder` from the container (cradle injection pattern)
4. `instance.initialize()` is called: fonts loaded, `AppManager` init (PIXI.Application), layers/components built via `LayersManager` → `ComponentsManager` → `ComponentDirector` → `PixiComponentBuilder`
5. Each component's hooks run `setup()` then `update()`
6. `SceneBuilder` returned to consumer; `EventManager.isReady = true` opens event bus

**Render Tick (Playback):**

1. `SceneBuilder.play()` calls `TimelineManager.play()` and `gsap.ticker.add(renderTicker)`
2. GSAP ticker fires every frame; `TimelineManager.watch()` reads `timeline.time()`, updates `StateManager.currentTime`, emits `timeupdate`
3. `RenderManager` listens for `timeupdate` / `rerender` events, calls `component.update()` on all currently-visible components
4. Each component runs its hooks in priority order via `ComponentContext.runHooks()`
5. `AppManager.render()` flushes the PIXI stage to the canvas

**Seek / Frame Extraction (Server-side or scrubbing):**

1. `SceneBuilder.seek(time)` dispatches `CommandType.SEEK` → `SeekCommand`
2. `SeekCommand` calls `TimelineManager.seek(time)` and awaits media seeks on all video/audio elements via `MediaSeekingHook`
3. `SceneBuilder.renderFrame()` dispatches `CommandType.RENDER_FRAME` → `RenderFrameCommand` → `AppManager.extractBase64()`

**Component Update Flow:**

1. Consumer calls e.g. `sceneBuilder.components.update(id, data, refreshType)` on `ComponentsManager`
2. `ComponentState.updateAppearance()` merges new data into `$state` reactive store
3. If `autoRefresh` is true the component self-refreshes; otherwise `ComponentsManager.#refreshComponent()` calls `component.refresh(refreshType)`
4. Hooks with matching `types` array run; `EventManager.emit('componentchange')` triggers a rerender

**State Management:**

- `StateManager` holds the single source of truth for scene lifecycle (`playing`, `paused`, `loading`, `ended`), current time, loading-component tracking, and dirty flag
- Svelte 5 `$state` runes are used inside manager classes (`.svelte.ts` files) for reactivity; no Svelte component context is required

## Key Abstractions

**`ISceneBuilder` / `SceneBuilder`:**

- Purpose: Public façade for all scene operations
- Location: `src/lib/SceneBuilder.svelte.ts`, interface at `src/lib/schemas/runtime/types.ts`
- Pattern: Façade + Command dispatcher

**`Component` / `IComponent`:**

- Purpose: Runtime instance of a media item (VIDEO, IMAGE, TEXT, AUDIO, SHAPE, GIF, SUBTITLES, COLOR, GRADIENT)
- Location: `src/lib/components/Component.svelte.ts`
- Pattern: Composite of `ComponentProps` (state), `ComponentContext` (shared context), and ordered `IComponentHook[]` list

**`ComponentHook` / `IComponentHook`:**

- Purpose: Single-responsibility behaviour unit; each hook declares which `HookType` events it handles
- Location: `src/lib/components/hooks/`, interface at `src/lib/schemas/runtime/types.ts`
- Pattern: Chain-of-responsibility; sorted by `priority` (lower = earlier)

**`ComponentContext`:**

- Purpose: Shared read-only context injected into every hook at runtime; exposes resource registry, timing info, event bus
- Location: `src/lib/components/ComponentContext.svelte.ts`
- Pattern: Context object passed to handlers; resource store via typed `ResourceTypes` Map

**`ResourceTypes` Map:**

- Purpose: Typed slot registry on `ComponentContext` for inter-hook data sharing (e.g. `pixiTexture` produced by `PixiTextureHook`, consumed by `PixiDisplayObjectHook`)
- Location: `src/lib/schemas/runtime/types.ts`
- Pattern: Typed resource registry

**`DIContainer` (Awilix):**

- Purpose: Per-scene IoC container; isolates multiple concurrent scene instances
- Location: `src/lib/DIContainer.ts`
- Pattern: Service locator / IoC container (Awilix cradle injection)

**`EventManager`:**

- Purpose: Typed event bus (extends `EventTarget`); all cross-manager communication flows through it
- Location: `src/lib/managers/EventManager.ts`
- Pattern: Typed pub/sub; `emit(event, payload)` dispatches `CustomEvent`

**Zod Schemas:**

- Purpose: Single source of type truth for all scene data structures; used for validation on input
- Location: `src/lib/schemas/scene/`
- Pattern: Schema-first; TypeScript types inferred via `z.infer<>`

## Entry Points

**Library Entry (published package):**

- Location: `src/lib/index.ts`
- Triggers: `import { createSceneBuilder } from 'visualfries'`
- Responsibilities: Exports `createSceneBuilder`, composers, `StyleBuilder`, schemas, seeds, animation presets, font utilities

**`createSceneBuilder` factory:**

- Location: `src/lib/factories/SceneBuilderFactory.ts`
- Triggers: Consumer code; `createSceneBuilder(sceneData, containerElement, config)`
- Responsibilities: Bootstraps DI container, injects config values, initializes `SceneBuilder`, optionally starts autoPlay

**SvelteKit App Entry:**

- Location: `src/routes/+page.svelte`, `src/routes/+layout.svelte`
- Triggers: HTTP request to SvelteKit dev server or static build
- Responsibilities: Documentation/demo site (placeholder + docs routes)

## Error Handling

**Strategy:** Non-throwing at hook level; propagating at manager/command level

**Patterns:**

- `ComponentContext.runHooks()` catches all hook errors, logs a warning, and emits `hookerror` event — hooks never crash the render loop
- `ComponentsManager.create()` wraps `#buildComponent()` in try/catch, logs errors, returns `null`
- `SceneComposer.safeCompose()` returns `undefined` on Zod validation failure and logs formatted errors
- Command layer uses `async/await` and lets unhandled rejections propagate to callers
- `SafeHookRunner` at `src/lib/components/SafeHookRunner.ts` provides additional defensive hook execution

## Cross-Cutting Concerns

**Logging:** `console.error` / `console.warn` used directly; no structured logging framework; `hookerror` event emitted for hook failures
**Validation:** Zod schemas in `src/lib/schemas/scene/`; validated at `createSceneBuilder` input and `addComponent`
**Authentication:** Not applicable — library-only, no auth
**Reactivity:** Svelte 5 `$state` / `$derived` runes used in `.svelte.ts` managers for reactive state; does not require Svelte component context (used in class fields)
**Dual-environment rendering:** `RenderEnvironment` (`'client'` | `'server'`) switches behavior in `AppManager` (canvas preserveDrawingBuffer), `DomManager` (off-screen HTML), and hooks like `HtmlToCanvasHook` (server: rasterize HTML to canvas)

---

_Architecture analysis: 2026-02-21_
