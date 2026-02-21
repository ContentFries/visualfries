# External Integrations

**Analysis Date:** 2026-02-21

## APIs & External Services

**Font Delivery:**

- Google Fonts API - Fetches font CSS and binary font files (woff2) at runtime for canvas text rendering
  - SDK/Client: Native `fetch` in `src/lib/fonts/GoogleFontsProvider.ts`
  - Auth: None (public API)
  - Endpoint: `https://fonts.googleapis.com/css2?family=...`
  - Fallback chain: weight fallbacks → base font family; cacheable per provider instance
  - Also used for DOM injection (non-canvas path) in `src/lib/utils/document.ts` via `<link>` tag to `https://fonts.googleapis.com/css?family=...`

**Emoji SVG CDNs:**

- Multiple CDN providers for SVG emoji rendering; selectable at component level via `src/lib/utils/emoji.ts`
  - Twemoji: `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/`
  - OpenMoji: `https://cdn.jsdelivr.net/npm/@svgmoji/openmoji@2.0.0/svg/`
  - Blobmoji: `https://cdn.jsdelivr.net/npm/@svgmoji/blob@2.0.0/svg/`
  - Noto: `https://cdn.jsdelivr.net/gh/svgmoji/svgmoji/packages/svgmoji__noto/svg/`
  - Fluent/FluentFlat: `https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/`
  - Auth: None (public CDNs)
  - Cached in module-level `emojiCache` record

**HLS Video (Mux.com aware):**

- `hls.js` handles `.m3u8` stream URLs generically; `src/lib/managers/MediaManager.ts` has a commented-out Mux monitoring hook (`muxMonitorHlsVideo`)
  - No Mux SDK dependency is installed; detection is URL-based (`mediaPath.includes('mux.com')`)
  - HLS streams from any provider are supported

**ContentFries Backend (env-configured):**

- `SIGNER_ENDPOINT=https://www.contentfries.com/api/sign-url` — URL signing endpoint referenced in `.env`
  - No active call-site found in `src/lib/` source; likely used by the consuming application or a dev/debug tool
- `HTML_RENDERER_TOKEN` — Bearer token for HTML renderer service (value in `.env`)
  - No active call-site found in `src/lib/` source

**Subtitle Source URLs:**

- `src/lib/managers/SubtitlesManager.svelte.ts` fetches subtitle data from arbitrary consumer-provided URLs at runtime via native `fetch`
  - No fixed endpoint; URL is part of scene data schema (`subtitleEntry.url`)

## Data Storage

**Databases:**

- None — this is a pure frontend library; no database connections

**File Storage:**

- Local media assets: consumer-provided URLs passed into scene data (`src`, `url` fields on components)
- No built-in file storage integration

**Caching:**

- In-memory only:
  - Font cache: closure-scoped `fontCache` record in `src/lib/fonts/GoogleFontsProvider.ts`
  - Emoji cache: module-level `emojiCache` in `src/lib/utils/emoji.ts`
  - Media elements: `Map` instances in `src/lib/managers/MediaManager.ts`
  - Split text cache: `src/lib/animations/SplitTextCache.ts` (singleton via DI container)
  - No persistent/service-based caching (Redis, etc.)

## Authentication & Identity

**Auth Provider:**

- None — no authentication system in the library
- `HTML_RENDERER_TOKEN` in `.env` is a static token for an external rendering service; not user auth

## Monitoring & Observability

**Error Tracking:**

- None — no Sentry, Datadog, etc. integrated

**Logs:**

- `console.warn` and `console.error` throughout the library for degraded states (font load failures, missing targets, etc.)
- No structured logging framework

## CI/CD & Deployment

**Hosting:**

- npm registry (`https://registry.npmjs.org`) — library published as `visualfries`
- Published on every merge to `main` via `.github/workflows/release-please.yml`

**CI Pipeline:**

- GitHub Actions
  - Workflow: `.github/workflows/release-please.yml`
  - Steps: checkout → pnpm setup (10.17.1) → Node 20 setup → `pnpm install --frozen-lockfile` → `pnpm build` → `pnpm publish --no-git-checks`
  - Release automation: `release-please` (Google) manages versioning + changelog + GitHub releases
  - Secrets required: `GITHUB_TOKEN` (built-in), `NPM_TOKEN` (repo secret for npm publish)

## Environment Configuration

**Required env vars:**

- `HTML_RENDERER_TOKEN` — Token for ContentFries HTML renderer service
- `SIGNER_ENDPOINT` — URL for ContentFries URL signing API (`https://www.contentfries.com/api/sign-url`)

**Secrets location:**

- `.env` file (gitignored) for local dev
- GitHub Actions Secrets for CI (`NPM_TOKEN`)

**Note:** Neither env var is currently consumed by the `src/lib/` library source. They appear to be dev-environment configuration for the docs/debug routes or external tooling around the project.

## Webhooks & Callbacks

**Incoming:**

- None

**Outgoing:**

- None (the library emits DOM events internally via `src/lib/managers/EventManager.ts`, but no outgoing HTTP webhooks)

---

_Integration audit: 2026-02-21_
