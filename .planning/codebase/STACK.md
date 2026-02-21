# Technology Stack

**Analysis Date:** 2026-02-21

## Languages

**Primary:**

- TypeScript 5.8.x - All library source code in `src/lib/`
- Svelte 5.x - Component framework; `.svelte.ts` reactive classes and `.svelte` route files

**Secondary:**

- JavaScript - Config files (`postcss.config.js`, `tailwind.config.js`, `svelte.config.js`)
- JSON - Scene schema examples in `src/lib/examples/*.json`

## Runtime

**Environment:**

- Node.js 20 (pinned in CI via `.github/workflows/release-please.yml`)
- Local dev running Node.js 22.x

**Package Manager:**

- pnpm 10.17.1
- Lockfile: `pnpm-lock.yaml` (present, committed)
- Workspace config: `pnpm-workspace.yaml` (single package workspace, `esbuild` as only built dep)

## Frameworks

**Core:**

- SvelteKit 2.46.x - App shell / docs site at `src/routes/`; also provides the package build pipeline
- Svelte 5.x (peer dependency) - Reactive state with `.svelte.ts` rune-based classes

**Animation:**

- GSAP 3.13.x (`gsap`) - Primary animation engine; adaptor at `src/lib/animations/engines/GSAPEngineAdaptor.ts`
  - Plugins used: `PixiPlugin`, `SplitText`, `MotionPathPlugin`, `Physics2DPlugin`, `EasePack` (ExpoScaleEase, RoughEase, SlowMo)
  - Registered lazily in `src/lib/registers.ts`

**Rendering:**

- PixiJS Legacy 7.4.x (`pixi.js-legacy`) - Canvas/WebGL rendering; always runs in canvas-fallback mode for server-side; initialized in `src/lib/managers/AppManager.svelte.ts`

**CSS / UI (docs site only):**

- Tailwind CSS 3.4.x with PostCSS (`postcss.config.js`, `tailwind.config.js`)
- DaisyUI 4.x - Component theme layer on top of Tailwind
- `@tailwindcss/typography` 0.5.x
- `@tailwindcss/aspect-ratio` 0.4.x

**Testing:**

- Vitest 2.x - Test runner; config in `vite.config.ts`
- jsdom 26.x - Browser environment simulation for tests
- Setup file: `vitest.setup.ts` (mocks Canvas 2D context for PixiJS)

**Build/Dev:**

- Vite 5.x - Dev server and bundler
- `@sveltejs/package` 2.x - Library packaging; produces `dist/` from `src/lib/`
- `publint` 0.2.x - Package publish linting
- `svelte-check` 4.x - TypeScript type checking for Svelte files

## Key Dependencies

**Critical:**

- `awilix` 12.x (`awilix/browser`) - IoC / dependency injection container; all managers/hooks wired in `src/lib/DIContainer.ts`
- `zod` 4.x (peer dependency) - Runtime schema validation; used throughout `src/lib/schemas/`
- `gsap` 3.13.x - Animation timeline engine; core to all animation functionality
- `pixi.js-legacy` 7.4.x - Canvas renderer; core to visual output

**Media:**

- `hls.js` 1.5.x - HLS (.m3u8) video stream support; used in `src/lib/managers/MediaManager.ts`
- `gifuct-js` 2.1.x - Animated GIF frame parsing; used in `src/lib/components/AnimatedGIF.ts`

**Utilities:**

- `lodash-es` 4.17.x - Tree-shakeable lodash; used for `get`, `merge`, `debounce`, `omit`
- `tinycolor2` 1.6.x - Color manipulation; used in `src/lib/builders/html/TextShadowBuilder.ts` and `src/lib/schemas/scene/utils.ts`
- `uuid` 10.x - UUID v4 generation for component/scene IDs
- `dompurify` 3.3.x - HTML sanitization; used in `src/lib/utils/html.ts`

**Dev tooling:**

- `knip` 5.x - Dead code/unused exports detection; config at `knip.json`, entry `src/lib/index.ts`
- `release-please` 15.x - Automated changelog + version bumping; config at `release-please-config.json`
- `prettier` 3.x with `prettier-plugin-svelte` + `prettier-plugin-tailwindcss`
- `eslint` 9.x

## Configuration

**Environment:**

- `.env` file with two vars (see INTEGRATIONS.md for details)
- No `.env.example` present

**TypeScript:**

- `tsconfig.json` extends `.svelte-kit/tsconfig.json`
- `strict: true`, `moduleResolution: "bundler"`
- Excludes `tests/**` and `src/routes/debug/**` from type checking

**Build:**

- `svelte.config.js` - SvelteKit adapter-auto + vitePreprocess
- `vite.config.ts` - Vitest config (jsdom, forks pool, single fork, browser conditions)
- `postcss.config.js` - Tailwind + autoprefixer
- `tailwind.config.js` - Scans `./src/**/*.{html,js,svelte,ts}`

**Package exports:**

- Main entry: `dist/index.js`
- Types: `dist/index.d.ts`
- Svelte export condition: `dist/index.js`
- Published files: `dist/` (excluding test files and stories)
- `sideEffects: ["**/*.css"]`

## Platform Requirements

**Development:**

- Node.js 20+ (CI uses 20, local tested on 22)
- pnpm 10.17.1
- Peer deps must be provided by consumer: `svelte ^5.0.0`, `zod ^4.1.12`

**Production:**

- This is a **library package** published to npm as `visualfries`
- No server deployment target; consumed by downstream Svelte 5 projects
- CI auto-publishes to npm registry on merges to `main` via `.github/workflows/release-please.yml`

---

_Stack analysis: 2026-02-21_
