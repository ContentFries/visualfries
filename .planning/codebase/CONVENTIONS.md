# Coding Conventions

**Analysis Date:** 2026-02-21

## Naming Patterns

**Files:**

- Classes: PascalCase, e.g. `ComponentState.svelte.ts`, `EventManager.ts`, `SafeHookRunner.ts`
- Svelte 5 reactive classes: `.svelte.ts` suffix, e.g. `SubtitlesManager.svelte.ts`, `StateManager.svelte.ts`
- Utility modules: camelCase, e.g. `html.ts`, `canvas.ts`, `svgGenerator.ts`
- Composer/factory functions: camelCase, e.g. `sceneComposer.ts`, `layerComposer.ts`
- Zod schema objects: PascalCase + `Shape` suffix, e.g. `TextComponentShape`, `SceneSettingsShape`, `BgShape`

**Classes:**

- PascalCase: `ComponentState`, `EventManager`, `SubtitlesManager`, `SafeHookRunner`
- Manager classes: `*Manager` suffix, e.g. `StateManager`, `TimeManager`
- Builder/Composer classes: `*Builder` / `*Composer` suffix

**Functions:**

- camelCase for all non-class functions: `createSceneComposer`, `safeExecuteHook`, `splitTextIntoWords`
- Factory functions: `create*` prefix, e.g. `createSceneComposer`, `createMockTimeManager`
- Boolean predicates: `is*`, `has*` prefix, e.g. `isVideoComponent`, `hasSource`, `isValidColor`
- Getter helpers: `get*` prefix, e.g. `getSource`, `getSourceUrl`, `getMuted`

**Variables/Properties:**

- camelCase for all variables and object properties
- Svelte 5 rune state fields: `$state()`, e.g. `state: BuilderState = $state('paused')`
- Private class fields: mix of ECMAScript `#field` (for reactive Svelte state) and `private` keyword (for dependency injection)
  - `#data: ComponentData = $state<ComponentData>()` — used when the field needs reactivity
  - `private eventManager: EventManager` — used for service/dependency fields

**Types and Interfaces:**

- Runtime interfaces: `I` prefix, e.g. `IComponent`, `IComponentContext`, `ILayer`, `ISceneBuilder`
- Zod-inferred types: bare PascalCase, e.g. `TextComponent`, `Scene`, `SceneLayer`
- Event interfaces grouped by domain: `StateEvents`, `TimelineEvents`, `ComponentEvents`, `SubtitlesEvents`
- Zod schemas: `*Shape` suffix, kept separate from inferred types

## Code Style

**Formatting (Prettier):**

- Tabs for indentation (not spaces)
- Single quotes for strings
- No trailing commas
- Print width: 100 characters
- Svelte and Tailwind plugins active

**Linting:**

- ESLint configured (`eslint` v9 in devDependencies, `eslint.config.*` not present — likely project-level config)
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- `checkJs: true` — JS files also type-checked

## Import Organization

**Order (observed pattern):**

1. External packages (e.g. `import { z } from 'zod'`, `import * as PIXI from 'pixi.js-legacy'`)
2. `$lib` barrel imports (`import type { ... } from '$lib'`)
3. `$lib/` deep path imports (`import { EventManager } from '$lib/managers/EventManager.js'`)
4. Relative imports (`import { normalizeSubtitle } from './subtitleHelpers.js'`)

**Path Aliases:**

- `$lib` resolves to `src/lib/` — used in all source and test files
- All imports use `.js` extensions even for TypeScript source files (ES module convention)

**Barrel Exports:**

- `src/lib/index.ts` is the public API, re-exports from:
  - `./schemas/scene/index.js` (Zod schemas + inferred types)
  - `./schemas/runtime/index.js` (runtime interfaces, prefixed with `I`)
  - `./seeds/index.js`, `./animations/presets/index.js`
  - Named factory exports: `createSceneBuilder`, `createSceneComposer`, etc.

## Error Handling

**Patterns:**

- Guard clauses with `throw new Error(...)` for missing preconditions: `if (!this.#app) throw new Error('App not initialized')`
- `try/catch` with `console.warn` for recoverable errors (auto-refresh callbacks, hook execution)
- `console.error` for fatal/unexpected errors (media load failures, parse errors)
- Zod: use `.safeParse()` for user-facing validation and log with `console.error` on failure; use `.parse()` in composer `compose()` methods to throw on invalid data
- `SafeHookRunner` (`src/lib/components/SafeHookRunner.ts`) wraps hook execution in error boundaries — emits `hookerror` event via `EventManager` and optionally continues past failures
- Error normalization: `err instanceof Error ? err : new Error(String(err))` before re-throwing or recording

## Logging

**Framework:** `console` (no structured logging library)

**Patterns:**

- `console.error(...)` — fatal/unrecoverable errors (missing resources, failed media loads, validation failures)
- `console.warn(...)` — recoverable issues (hook failures, font load errors, CSS fallbacks)
- Errors are prefixed with class or hook context: `[SafeHookRunner] Hook "..." failed...`
- Some `console.log` calls remain in tests (e.g. debugging merge output) — these are not in production source paths

## Comments

**When to Comment:**

- JSDoc on public class methods and builder methods (`SceneComposer`, `LayerComposer`)
- Inline comments for non-obvious logic: `// Note: 'subtitleschange' is NOT in this list...`
- TODO comments mark unfinished work: `// TODO fix this because it causes bugs...`
- Test helper functions and mock factories are commented

**JSDoc/TSDoc:**

- JSDoc used on public-facing fluent builder methods (`@param`, `@returns`)
- Interfaces occasionally have JSDoc on key properties

## Function Design

**Size:** Functions are generally focused; helper functions extracted (e.g. `splitTextIntoWords`, `generateWordsFromText`, `validateAndAdjustWordTiming` in `SubtitlesManager.svelte.ts`)

**Parameters:**

- Object/cradle pattern for constructor injection: `constructor(cradle: { componentData: ComponentData; eventManager: EventManager; ... })`
- Simple primitive parameters for pure functions
- Optional parameters use `?: Type` syntax

**Return Values:**

- Fluent builder methods return `this` for chaining
- Async methods return `Promise<void>` or `Promise<T>`
- Zod `.safeParse()` results always narrowed with `if (result.success)` guard

## Module Design

**Exports:**

- Named exports only (no default exports in library code)
- Public API consolidated in `src/lib/index.ts`

**Barrel Files:**

- `src/lib/index.ts` — main public API barrel
- `src/lib/schemas/scene/index.ts` — scene schema re-exports
- `src/lib/schemas/runtime/index.ts` — runtime type re-exports

## Svelte 5 Reactivity

**Rules:**

- `.svelte.ts` extension required for files using Svelte 5 runes (`$state`, `$derived`, `$effect`)
- `$state` used for reactive class fields and local variables in class bodies
- `$effect.root()` used in tests to create reactive contexts for Svelte-stateful code (always cleaned up with the returned `cleanup()` function)
- `$state.snapshot()` used to extract plain objects from reactive proxies before serialization

---

_Convention analysis: 2026-02-21_
