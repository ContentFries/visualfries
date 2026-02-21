# Testing Patterns

**Analysis Date:** 2026-02-21

## Test Framework

**Runner:**

- Vitest v2 (configured via `vite.config.ts`)
- Config: `vite.config.ts` (inline `test:` block, no separate `vitest.config.ts`)

**Assertion Library:**

- Vitest built-in (`expect`)

**Environment:**

- `jsdom` with `resources: 'usable'`
- Setup file: `vitest.setup.ts` — mocks Canvas 2D context and WebGL for PIXI.js compatibility
- Pool: `forks`, `singleFork: true` (single process for all tests)
- Browser conditions resolved when running under Vitest (`conditions: ['browser']`)

**Run Commands:**

```bash
pnpm test               # Run all tests once (--run)
pnpm test:unit          # Run in watch mode (vitest)
# No coverage command configured in package.json
```

## Test File Organization

**Location:**

- All tests live in `tests/` at the project root (not co-located with source)
- Mirror the source structure under `src/lib/`

**Naming:**

- Regular unit tests: `*.test.ts`
- Tests involving Svelte 5 reactivity (`$effect`, `$state`): `*.svelte.test.ts`

**Structure:**

```
tests/
├── components/              # Component class and helpers tests
│   ├── Component.test.ts
│   ├── ComponentContextHelpers.test.ts
│   ├── ComponentEventFiltering.test.ts
│   ├── ComponentMethodChaining.test.ts
│   ├── ComponentState.test.ts
│   └── ComponentStateTextPreservation.test.ts
├── composer/                # Fluent composer/builder tests
│   ├── component-composer.test.ts
│   ├── layer-composer.test.ts
│   └── scene-composer.test.ts
├── hooks/                   # PIXI hook tests
│   ├── PixiSplitScreenDisplayObjectHook.test.ts
│   └── PixiVideoTextureHook.test.ts
├── schemas/                 # Zod schema validation tests
│   ├── components.test.ts
│   ├── core.test.ts
│   └── properties.test.ts
├── seeds/                   # SeedFactory determinism tests
│   └── SeedFactory.test.ts
├── subtitlesManager.svelte.test.ts
├── subtitles-settings-integration.svelte.test.ts
├── subtitles-settings-usage-example.svelte.test.ts
├── subtitles-split-by-chars.svelte.test.ts
├── subtitles-text-chunk-timing.svelte.test.ts
└── subtitles-text-chunk-timing-data.ts  # shared test fixture data
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ClassName or Feature', () => {
	// Optional: shared state declared here

	beforeEach(() => {
		// Reset state and mocks
		vi.clearAllMocks();
	});

	describe('Sub-feature or method group', () => {
		it('should do something specific', () => {
			// arrange, act, assert
		});
	});
});
```

**Patterns:**

- `describe` blocks used for class name, then sub-`describe` for feature/method groups
- `it()` and `test()` are both used interchangeably (schema tests prefer `test()`, component tests prefer `it()`)
- `beforeEach` used at multiple nesting levels to set up fresh instances and clear mocks
- No `afterEach` / `afterAll` observed — cleanup via `vi.clearAllMocks()` in `beforeEach`

## Mocking

**Framework:** Vitest built-in (`vi`)

**Module-level mocking (before imports):**

```typescript
// Mock entire module before importing the subject under test
vi.mock('$lib/components/ComponentContext.svelte.ts', () => ({
	ComponentContext: vi.fn().mockImplementation(() => ({
		setComponentProps: vi.fn(),
		getResource: vi.fn(),
		runHooks: vi.fn()
	}))
}));

// Mock with partial override of real implementation
vi.mock('pixi.js-legacy', async (importOriginal) => {
	const actual = await importOriginal<typeof import('pixi.js-legacy')>();
	return {
		...actual,
		VideoResource: vi.fn().mockImplementation(() => ({})),
		Texture: vi.fn().mockImplementation(() => ({ destroy: vi.fn() }))
	};
});
```

**Factory functions for mock dependencies:**

```typescript
const createMockTimeManager = (): TimeManager =>
	({
		transformTime: vi.fn((time: number) => time),
		duration: 100
	}) as unknown as TimeManager;

const createMockEventManager = (): EventManager =>
	({
		emit: vi.fn()
	}) as unknown as EventManager;
```

- Typed with real interfaces using `as unknown as RealType` cast
- Created fresh per test via `beforeEach`

**Spy pattern:**

```typescript
let refreshSpy: ReturnType<typeof vi.spyOn>;
refreshSpy = vi.spyOn(component, 'refresh').mockResolvedValue();
```

**What to Mock:**

- All external service dependencies (EventManager, TimeManager, StateManager)
- Third-party renderer libraries (pixi.js-legacy) that require native bindings
- Module-level when the dependency is deeply coupled to the constructor

**What NOT to Mock:**

- Zod schemas — tested by calling `.safeParse()` / `.parse()` directly with real input data
- Pure utility functions
- Composer/builder classes — tested as a unit with real data input through to `compose()`

## Fixtures and Factories

**Test Data:**

```typescript
// Inline fixture objects at describe scope
const validTimeline = { startAt: 0, endAt: 5 };
const validAppearance = { x: 100, y: 200, width: 300, height: 200 };

// Factory functions returning typed mock instances
const createMockScene = (): Scene =>
	({
		assets: [{ id: 'test-asset-1', type: 'VIDEO', url: 'https://example.com/video.mp4' }]
	}) as Scene;
```

**Shared Fixture Data:**

- `tests/subtitles-text-chunk-timing-data.ts` — standalone file exporting large fixture data arrays used across multiple `.svelte.test.ts` files

**Location:**

- Inline in test files for small fixtures
- Separate `.ts` file in `tests/` root for large/shared fixture data

## Coverage

**Requirements:** None enforced (no coverage configuration in `vite.config.ts` or `package.json`)

**View Coverage:**

```bash
# Not configured; to add: vitest run --coverage
```

## Test Types

**Unit Tests:**

- Scope: single class, schema, or utility function
- Files: `tests/components/`, `tests/schemas/`, `tests/seeds/`, `tests/hooks/`
- Approach: mock all dependencies, test behavior in isolation

**Integration Tests:**

- Scope: multiple collaborating classes (e.g. SubtitlesManager + TimeManager + EventManager)
- Files: `tests/subtitlesManager.svelte.test.ts`, `tests/subtitles-settings-integration.svelte.test.ts`
- Approach: use factory-built mock dependencies but instantiate real manager classes

**E2E Tests:**

- Not used

## Common Patterns

**Svelte Reactive Context (required for .svelte.ts classes using `$state`):**

```typescript
it('does something with reactive state', () => {
  const cleanup = $effect.root(() => {
    const manager = new SubtitlesManager({ ... });
    // assertions here
    expect(manager.data.asset1.default[0].id).toBe('sub1');
  });

  cleanup(); // Always call cleanup to avoid reactive context leaks
});
```

- Use `$effect.root()` whenever the class under test uses Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Wrap the entire test body and always call `cleanup()` at the end

**Async Testing:**

```typescript
it('should resolve without throwing', async () => {
	await expect(hook.handle('update', mockContext)).resolves.not.toThrow();
	await expect(hook.handle('destroy', mockContext)).resolves.toBeUndefined();
});
```

**Error Testing:**

```typescript
it('should not throw on missing resource', () => {
  expect(() => new Component({ ... })).not.toThrow();
});

it('should reject invalid input', () => {
  const result = ComponentShape.safeParse(invalidData);
  expect(result.success).toBe(false);
});
```

**Schema Validation Pattern:**

```typescript
const result = SomeShape.safeParse(inputData);
expect(result.success).toBe(true);

if (result.success) {
	expect(result.data.someField).toBe(expectedValue);
}
```

- Always guard with `if (result.success)` before accessing `.data` to satisfy TypeScript narrowing

**Event Emission Verification:**

```typescript
expect(mockEventManager.emit).toHaveBeenCalledWith('subtitleschange');
expect(mockEventManager.emit).toHaveBeenCalledWith('subtitlechange', {
	assetId: 'asset1',
	language: 'default',
	subtitleId: 'sub1',
	subtitle: expect.objectContaining({ text: 'New text' })
});
```

---

_Testing analysis: 2026-02-21_
