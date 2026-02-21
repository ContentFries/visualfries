# Codebase Structure

**Analysis Date:** 2026-02-21

## Directory Layout

```
visualfries/
├── src/
│   ├── lib/                        # Library source — published as npm package
│   │   ├── index.ts                # Public barrel export
│   │   ├── DIContainer.ts          # Awilix DI container factory (per-scene)
│   │   ├── SceneBuilder.svelte.ts  # Public façade class
│   │   ├── registers.ts            # GSAP plugin registration (lazy singleton)
│   │   ├── constants.ts            # PIXI global defaults
│   │   ├── adapters/               # Helper adapters (subtitle helpers)
│   │   ├── animations/             # GSAP animation presets, builders, engines
│   │   │   ├── presets/            # Built-in animation preset objects
│   │   │   ├── builders/           # Animation timeline builders
│   │   │   ├── engines/            # Engine adaptors (GSAP abstraction)
│   │   │   └── transformers/       # Animation reference transformers
│   │   ├── builders/               # Component assembly builders
│   │   │   ├── PixiComponentBuilder.ts   # Fluent hook-attachment builder
│   │   │   ├── _ComponentState.svelte.ts # Reactive component data (Svelte 5 runes)
│   │   │   └── html/               # HTML/text builders (StyleBuilder, HtmlBuilder, etc.)
│   │   ├── commands/               # Command pattern — scene operations
│   │   ├── components/             # Component runtime classes
│   │   │   ├── Component.svelte.ts        # Core component class
│   │   │   ├── ComponentContext.svelte.ts # Shared hook context
│   │   │   └── hooks/              # Hook implementations (19 hook classes)
│   │   │       └── shapes/         # Shape-specific hook helpers
│   │   ├── composers/              # Fluent scene/layer/component data builders (public API)
│   │   ├── directors/              # ComponentDirector — selects hooks per component type
│   │   ├── examples/               # Bundled JSON scene example files
│   │   ├── factories/              # SceneBuilderFactory (main entry point)
│   │   ├── fonts/                  # Font provider types and loaders
│   │   ├── layers/                 # Layer runtime class
│   │   ├── managers/               # Domain managers (singletons per container)
│   │   ├── schemas/
│   │   │   ├── scene/              # Zod schemas for scene data structures
│   │   │   └── runtime/            # TypeScript interfaces for runtime instances
│   │   ├── seeds/                  # SeedFactory (deterministic random values)
│   │   ├── transformers/           # Data transformers (standalone utilities)
│   │   └── utils/                  # Shared utility functions
│   └── routes/                     # SvelteKit docs/demo site (not part of library)
│       ├── +page.svelte            # Root placeholder page
│       ├── +layout.svelte          # App shell
│       ├── debug/                  # Internal debug routes
│       └── docs/                   # Documentation/example pages
│           ├── components/         # Component-specific docs
│           ├── examples/           # Usage example pages
│           └── hooks/              # Hook documentation pages
├── tests/                          # Vitest test suite
│   ├── animations/                 # Animation tests
│   ├── components/                 # Component + hook tests
│   ├── composer/                   # Composer tests
│   ├── hooks/                      # Hook integration tests
│   ├── schemas/                    # Zod schema tests
│   └── seeds/                      # SeedFactory tests
├── static/                         # Static assets (example media)
│   └── examples/                   # Media files for docs examples
├── dist/                           # Built library output (svelte-package output)
├── .svelte-kit/                    # SvelteKit build artifacts (generated)
├── package.json                    # Package manifest; exports field points to dist/
├── svelte.config.js                # SvelteKit + svelte-package config
├── vite.config.ts                  # Vite + vitest config
├── tsconfig.json                   # TypeScript config
├── vitest.setup.ts                 # Vitest global setup
├── tailwind.config.js              # Tailwind (docs site only)
├── postcss.config.js               # PostCSS (docs site only)
└── VISUALFRIES_API.md              # Detailed API documentation
```

## Directory Purposes

**`src/lib/`:**

- Purpose: The entire published library. Everything here is packaged by `svelte-package` into `dist/`
- Contains: All source TypeScript; `.svelte.ts` files use Svelte 5 runes in class bodies
- Key files: `index.ts` (barrel), `DIContainer.ts` (wiring), `SceneBuilder.svelte.ts` (façade)

**`src/lib/managers/`:**

- Purpose: Domain managers; each is a singleton per DI container
- Contains: 11 manager files; files ending in `.svelte.ts` use Svelte 5 `$state` runes
- Key files:
  - `StateManager.svelte.ts` — scene lifecycle, current time, dirty flag
  - `TimelineManager.svelte.ts` — GSAP timeline, seek, play/pause
  - `AppManager.svelte.ts` — PIXI.Application lifecycle and rendering
  - `DomManager.ts` — canvas + HTML container DOM setup
  - `RenderManager.ts` — render loop; routes `timeupdate`/`rerender` events to components
  - `ComponentsManager.svelte.ts` — CRUD for all Component instances
  - `LayersManager.svelte.ts` — CRUD for all Layer instances
  - `MediaManager.ts` — shared video/audio/image element pool with ref-counting
  - `SubtitlesManager.svelte.ts` — subtitle state and CRUD
  - `EventManager.ts` — typed event bus extending `EventTarget`
  - `TimeManager.svelte.ts` — time utilities and trim-zone transform

**`src/lib/components/hooks/`:**

- Purpose: Composable, single-responsibility behavior units added to components
- Contains: 19 hook classes; each implements `IComponentHook` with `types: HookType[]` and `handle(type, context)`
- Key hooks by role:
  - Media loading: `MediaHook.ts`, `ImageHook.ts`, `PixiGifHook.ts`
  - Texture/display: `PixiTextureHook.ts`, `PixiDisplayObjectHook.ts`, `PixiVideoTextureHook.ts`
  - Text/HTML: `HtmlTextHook.ts`, `HtmlAnimationHook.ts`, `HtmlToCanvasHook.ts`
  - Animation: `AnimationHook.ts`
  - Subtitles: `SubtitlesHook.ts`
  - Shapes: `CanvasShapeHook.ts`, `PixiProgressShapeHook.ts`
  - Guards/verify: `VerifyMediaHook.ts`, `VerifyImageHook.ts`, `VerifyGifHook.ts`
  - Seeking: `MediaSeekingHook.ts`
  - Layout: `PixiSplitScreenDisplayObjectHook.ts`

**`src/lib/schemas/scene/`:**

- Purpose: Zod schemas — single source of type truth; types are inferred with `z.infer<>`
- Contains: `core.ts` (Scene, SceneLayer, SceneSettings), `components.ts` (all component shapes), `properties.ts` (Appearance, Timeline, etc.), `animations.ts`, `subtitles.ts`
- Key files: `index.ts` re-exports everything

**`src/lib/schemas/runtime/`:**

- Purpose: TypeScript `interface` types for runtime class instances (not serializable data)
- Contains: `types.ts` — `ISceneBuilder`, `IComponent`, `ILayer`, `IComponentHook`, `EventMap`, `ComponentContext`, `HookType`, `ResourceTypes`, `BuilderState`

**`src/lib/commands/`:**

- Purpose: Encapsulate each async scene operation; dispatched through `CommandRunner`
- Contains: `Command.ts` (interfaces), `CommandTypes.ts` (enum), `CommandRunner.ts`, and one class per command: `PlayCommand`, `PauseCommand`, `SeekCommand`, `RenderCommand`, `RenderFrameCommand`, `UpdateComponentCommand`, `ReplaceSourceOnTimeCommand`

**`src/lib/composers/`:**

- Purpose: Fluent, validated scene data construction helpers for library consumers
- Contains: `sceneComposer.ts` → `createSceneComposer()`, `layerComposer.ts` → `createLayerComposer()`, `componentComposer.ts` → `createComponentComposer()`

**`src/lib/animations/`:**

- Purpose: GSAP animation presets and the infrastructure to build/run them
- Contains: `AnimationPresetsRegister.ts` (runtime registry), `animationPreset.ts` (preset type), `animationBuilder.ts`, `AnimationContext.ts`, `SplitTextCache.ts`, engines (`GSAPEngineAdaptor.ts`), presets (`lines.ts`, `words.ts`)

**`src/lib/examples/`:**

- Purpose: Bundled JSON scene definitions used by the docs site and tests
- Contains: 7 `.json` files (text, animated text, video, subtitles, shapes, gradient, karaoke)

**`src/routes/`:**

- Purpose: SvelteKit documentation and demo site; not part of the distributed library
- Contains: Placeholder root page + `/docs` and `/debug` sub-routes

**`tests/`:**

- Purpose: Vitest test suite, mirroring `src/lib` structure
- Contains: Tests grouped by domain: `animations/`, `components/`, `composer/`, `hooks/`, `schemas/`, `seeds/`

## Key File Locations

**Entry Points:**

- `src/lib/index.ts`: Library barrel export — all public API
- `src/lib/factories/SceneBuilderFactory.ts`: `createSceneBuilder()` — main consumer entry point
- `src/lib/DIContainer.ts`: `registerNewContainer()` — DI container bootstrap

**Core Classes:**

- `src/lib/SceneBuilder.svelte.ts`: Public façade class (`SceneBuilder`)
- `src/lib/components/Component.svelte.ts`: Component runtime class
- `src/lib/components/ComponentContext.svelte.ts`: Hook execution context
- `src/lib/layers/Layer.svelte.ts`: Layer runtime class
- `src/lib/directors/ComponentDirector.ts`: Hook chain selection by component type
- `src/lib/builders/PixiComponentBuilder.ts`: Fluent hook-attachment builder

**Schemas / Types:**

- `src/lib/schemas/scene/index.ts`: All scene data Zod schemas + inferred types
- `src/lib/schemas/runtime/types.ts`: Runtime interface types (interfaces prefixed with `I`)

**Configuration:**

- `package.json`: Exports map (`./` → `dist/index.js`), `svelte-package` config
- `svelte.config.js`: SvelteKit + `@sveltejs/package` adapter
- `vite.config.ts`: Vite + vitest config
- `tsconfig.json`: `$lib` path alias → `src/lib`

**Testing:**

- `vitest.setup.ts`: Global vitest setup (jsdom environment, mocks)
- `tests/`: Test files mirroring `src/lib/` structure

## Naming Conventions

**Files:**

- `PascalCase.ts` for all classes (e.g., `SceneBuilder`, `MediaManager`, `PixiTextureHook`)
- `camelCase.ts` for module-level functions and utilities (e.g., `sceneComposer.ts`, `animationBuilder.ts`)
- `.svelte.ts` extension for TypeScript files that use Svelte 5 runes in class bodies (e.g., `StateManager.svelte.ts`, `Component.svelte.ts`)
- `_PascalCase.svelte.ts` prefix with underscore for internal-only Svelte rune classes (e.g., `_ComponentState.svelte.ts`)

**Directories:**

- Plural for collections of same-type files: `managers/`, `commands/`, `hooks/`, `composers/`, `schemas/`
- Singular for domain concepts with one main file: `layers/`, `fonts/`

**Classes:**

- Managers end in `Manager`: `StateManager`, `AppManager`, `MediaManager`
- Hooks end in `Hook`: `MediaHook`, `PixiTextureHook`, `AnimationHook`
- Commands end in `Command`: `SeekCommand`, `RenderFrameCommand`
- Builders end in `Builder`: `PixiComponentBuilder`, `HtmlBuilder`, `StyleBuilder`
- Composers end in `Composer`: `SceneComposer`, `LayerComposer`
- Runtime interfaces prefixed with `I`: `ISceneBuilder`, `IComponent`, `ILayer`, `IComponentHook`

## Where to Add New Code

**New Component Type:**

- Hook implementation: `src/lib/components/hooks/NewTypeHook.ts`
- Register in DI container: `src/lib/DIContainer.ts` (add `asClass(NewTypeHook, { lifetime: Lifetime.TRANSIENT })`)
- Add to builder: `src/lib/builders/PixiComponentBuilder.ts` (new `withNewType()` method)
- Add to director: `src/lib/directors/ComponentDirector.ts` (new `constructNewType()` method + case in `constructAuto()`)
- Add to schema: `src/lib/schemas/scene/components.ts` (new Zod component shape)
- Add type to enum: `src/lib/schemas/runtime/types.ts` (`SCENE_LAYER_COMPONENT_TYPE`)

**New Scene Operation / Command:**

- Command class: `src/lib/commands/NewCommand.ts` (implement `Command<T>` or `SyncCommand<T>`)
- Register in DI: `src/lib/DIContainer.ts`
- Add to enum: `src/lib/commands/CommandTypes.ts`
- Inject in `CommandRunner`: `src/lib/commands/CommandRunner.ts`
- Expose on façade: `src/lib/SceneBuilder.svelte.ts`

**New Manager:**

- Implementation: `src/lib/managers/NewManager.svelte.ts` (use `.svelte.ts` if reactive state needed)
- Register in DI: `src/lib/DIContainer.ts` as singleton
- Inject via cradle into `SceneBuilder` if public access needed

**New Animation Preset:**

- Preset file: `src/lib/animations/presets/myPreset.ts`
- Export from: `src/lib/animations/presets/index.ts` (auto-registered by `AnimationPresetsRegister`)
- Export publicly: `src/lib/index.ts`

**New Utility:**

- Shared helpers: `src/lib/utils/`
- Domain-specific adapters: `src/lib/adapters/`

**New Composer (data builder):**

- Implementation: `src/lib/composers/newComposer.ts`
- Export from: `src/lib/index.ts`

## Special Directories

**`dist/`:**

- Purpose: Built library output from `pnpm run build` (`svelte-package`)
- Generated: Yes
- Committed: Yes (package ships `dist/` for npm)

**`.svelte-kit/`:**

- Purpose: SvelteKit build artifacts, generated types, SSR output
- Generated: Yes
- Committed: No (in `.gitignore`)

**`src/lib/examples/`:**

- Purpose: JSON scene fixtures for docs and tests; ships in the package
- Generated: No
- Committed: Yes

**`.planning/`:**

- Purpose: GSD planning documents
- Generated: No (manually curated)
- Committed: Yes

---

_Structure analysis: 2026-02-21_
