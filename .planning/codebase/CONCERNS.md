# Codebase Concerns

**Analysis Date:** 2026-02-21

---

## Tech Debt

**Widespread `as any` type casts (43 occurrences):**

- Issue: Type safety bypassed throughout hook layer, primarily because `IComponentContext.contextData` is typed generically and each hook accesses component-type-specific fields without narrowing.
- Files: `src/lib/components/hooks/MediaHook.ts` (9 casts), `src/lib/components/hooks/MediaSeekingHook.ts`, `src/lib/builders/_ComponentState.svelte.ts`, `src/lib/components/hooks/CanvasShapeHook.ts`, `src/lib/components/hooks/SubtitlesHook.ts`, `src/lib/animations/builders/WordHighlighterAnimationBuilder.ts`, `src/lib/animations/builders/LineHighlighterAnimationBuilder.ts`, `src/lib/directors/ComponentDirector.ts`
- Impact: Compiler cannot catch property access errors; bugs surface at runtime. A comment in `MediaHook.ts:33` explicitly marks `// TODO: remove as any`.
- Fix approach: Add discriminated union helpers via `src/lib/components/ComponentContextHelpers.ts` (already partially done) and use type narrowing in each hook instead of `as any` casts.

**`ComponentState.update()` is a stub:**

- Issue: The public `update(data)` method in `src/lib/builders/_ComponentState.svelte.ts:224` logs `console.warn('update not implemented yet', data)` and does nothing. All commented-out logic remains in place.
- Files: `src/lib/builders/_ComponentState.svelte.ts:208-236`
- Impact: Callers using `component.update(appearance)` silently do nothing; callers must use `updateAppearance()` instead, but the API surface is misleading.
- Fix approach: Either implement the method or remove it and remove references from the public interface.

**`ComponentState.setStreamPath()` is a no-op stub:**

- Issue: `setStreamPath(path: string)` has an empty body with commented-out implementation.
- Files: `src/lib/builders/_ComponentState.svelte.ts:208-213`
- Impact: Any caller of this method assumes it works; completely silent failure.
- Fix approach: Implement or remove and remove from `IComponent`/`ComponentProps` interface.

**`ComponentState.asset_id` always returns empty string:**

- Issue: The `get asset_id()` getter at line 86-90 always returns `''` with the real implementation commented out.
- Files: `src/lib/builders/_ComponentState.svelte.ts:86-90`
- Impact: Any feature depending on `component.props.asset_id` will get an empty string.
- Fix approach: Restore the commented implementation once `source.assetId` typing is resolved.

**Scene version validation is disabled:**

- Issue: `SceneShape.parse(this.sceneData)` validation is commented out in `SceneBuilder` constructor.
- Files: `src/lib/SceneBuilder.svelte.ts:80-82`
- Comment: `// TODO - check scene is v2`
- Impact: Malformed or legacy scene JSON silently passes construction, causing downstream errors that are hard to attribute.
- Fix approach: Re-enable validation or implement a migration/coercion layer before construction.

**Command history (undo/redo) is commented out:**

- Issue: `this.sceneBuilder.addToHistory(command)` calls are commented out in `CommandRunner.ts`.
- Files: `src/lib/commands/CommandRunner.ts:75,98`
- Impact: No undo/redo capability exists even though the architecture anticipates it.
- Fix approach: Implement a history stack in `CommandRunner` and wire it up.

**`getDefaultLanguage()` always returns `'default'`:**

- Issue: The function in `SubtitlesManager` is a stub that ignores the `assetId` parameter and always returns the hardcoded string `'default'`.
- Files: `src/lib/managers/SubtitlesManager.svelte.ts:638-640`
- Impact: Multi-language scenes that don't have a `'default'` language code will silently return empty text from `getText()`, `getWords()`, etc.
- Fix approach: Implement logic to look up the first available language for the given asset.

**`ProgressRenderer` gradient background is unimplemented:**

- Issue: Gradient backgrounds on progress shapes fall back to solid color with a `console.warn`. The actual implementation is commented out.
- Files: `src/lib/components/hooks/shapes/progress/ProgressRenderer.ts:29-34, 38-65`
- Impact: Users setting gradient backgrounds on progress shapes silently see wrong colors.
- Fix approach: Implement gradient rendering for progress shapes or document the limitation publicly.

**`Layer.checksum` TODO comment is misleading:**

- Issue: The comment `// TODO generate checksum` on `src/lib/layers/Layer.svelte.ts:149` is present but the checksum IS being generated via `md5`. The TODO is stale but signals uncertainty about the approach.
- Files: `src/lib/layers/Layer.svelte.ts:146-150`
- Fix approach: Remove stale TODO comment.

**`SubtitlesManager.setTimesForSubtitleInAssetAndLanguage` acknowledged as a workaround:**

- Issue: Method comment explicitly says it exists to avoid a conflict with the subtitles editor ("lol") and has `// TODO fix, refactor`.
- Files: `src/lib/managers/SubtitlesManager.svelte.ts:1534-1548`
- Impact: API surface is inconsistent; fragile coupling between consumer (subtitle timeline) and manager context state.
- Fix approach: Refactor subtitle editing operations to accept `assetId` + `language` as explicit parameters everywhere.

**Deprecated `ComponentBaseShape` not removed:**

- Issue: `ComponentBaseShape` is marked `@deprecated` but still exported from `src/lib/schemas/scene/components.ts:439-443`.
- Files: `src/lib/schemas/scene/components.ts:438-443`
- Impact: Consumers may use the deprecated shape; migration path is unclear.
- Fix approach: Audit usages, migrate to per-type shapes, then remove.

**`SubtitleCollection` backward-compat array-to-object coercion:**

- Issue: `ComponentEffectsShape` in schema accepts arrays and silently converts them to empty objects for backward compatibility.
- Files: `src/lib/schemas/scene/components.ts:386-402`
- Impact: Silently discards effects data if someone accidentally passes an array. No warning.
- Fix approach: Add a deprecation warning when array format is detected before converting.

---

## Known Bugs

**`setEndAt()` logic may clear `endAt` when setting a new value:**

- Symptoms: Setting `endAt` to a value greater than or equal to the existing `endAt` clears it to `undefined` rather than updating it.
- Files: `src/lib/managers/StateManager.svelte.ts:137-145`
- Trigger: Call `setEndAt(x)` when `x >= currentEndAt`. The condition `end >= this.data.settings.endAt ? undefined : end` resets it.
- Comment in code: `// TODO fix this because it causes bugs that shorten component duration`
- Workaround: Pass `undefined` first, then set the desired value.

**Event listeners in `SubtitlesHook` are never removed:**

- Symptoms: On component destroy, the `subtitlessettingschange` event listener registered in `SubtitlesHook` constructor is never removed.
- Files: `src/lib/components/hooks/SubtitlesHook.ts:48-50`, `#handleDestroy` at line 251 does not remove the listener.
- Trigger: Occurs every time a subtitle component is created. Over repeated scene builds/destroys, stale listeners accumulate.
- Impact: Memory leak; stale handler may fire on destroyed component context.

**`TimelineManager` `changestate` listener is never removed on destroy:**

- Symptoms: The `eventManager.on('changestate', ...)` registered in `TimelineManager.initStateSyncWatchers()` is not removed in `destroy()`.
- Files: `src/lib/managers/TimelineManager.svelte.ts:68`, `src/lib/managers/TimelineManager.svelte.ts:178-181`
- Impact: After `destroy()`, the gsap ticker may still be partially wired; potential memory leak on repeated scene instantiation.

**Media seeking has unprotected infinite recursion risk:**

- Symptoms: `MediaHook.#handleUpdate()` catches errors and retries by calling itself: `return this.#handleUpdate()` inside a `catch` block.
- Files: `src/lib/components/hooks/MediaHook.ts:264-267`
- Trigger: Persistent media error causes infinite async recursion until stack overflow.
- Workaround: None currently.

**`MediaSeekingHook.checkReadyState` has unbounded recursion:**

- Symptoms: `checkReadyState()` calls itself with a 500ms delay until `readyState >= 3`. If media never loads, this loop never terminates.
- Files: `src/lib/components/hooks/MediaSeekingHook.ts:46-63`
- Trigger: Broken or unavailable media URL causes infinite polling.
- Workaround: None currently; `#handleDestroy` sets `#mediaElement = undefined` which breaks the loop if destroy is called.

---

## Security Considerations

**`style` attribute allowed in DOMPurify text sanitizer:**

- Risk: `sanitizeText()` allows the `style` attribute, which can be used for CSS injection (e.g., `expression()` in legacy IE, side-channel content exfiltration via `background-image: url(...)`, or UI redressing).
- Files: `src/lib/utils/html.ts:22`
- Current mitigation: DOMPurify is used; modern browsers mitigate most CSS injection. The `ALLOW_DATA_ATTR: false` and `ALLOW_UNKNOWN_PROTOCOLS: false` reduce attack surface.
- Recommendations: Evaluate whether arbitrary style values are necessary. Consider restricting to specific CSS properties via a custom sanitization hook, or use `FORCE_BODY: true` combined with a stricter allowlist.

**Subtitle URL fetched without origin validation:**

- Risk: The `fetchSubtitlesFromUrl(url)` function fetches any URL passed in scene data without restricting the origin.
- Files: `src/lib/managers/SubtitlesManager.svelte.ts:594-618`
- Current mitigation: Response is validated against `SubtitleWithCompactWordsShape` schema before use; fetch errors are caught and logged.
- Recommendations: Consider adding allowlist domain validation for subtitle URLs to prevent SSRF-adjacent abuse in server environments.

**.env file contains a plaintext bearer token (`HTML_RENDERER_TOKEN`):**

- Risk: `.env` is gitignored, but the token `HTML_RENDERER_TOKEN` for the renderer and `SIGNER_ENDPOINT` URL are stored in plaintext.
- Files: `.env`
- Current mitigation: `.gitignore` excludes `.env`.
- Recommendations: Rotate the token periodically; confirm it is not embedded in any built bundle. Audit all places in the build pipeline where env vars are inlined into client bundles.

---

## Performance Bottlenecks

**`ComponentState.checksum` runs `md5(JSON.stringify($state.snapshot(...)))` on every access:**

- Problem: Computing a full JSON snapshot + MD5 hash of all component data on every `checksum` read is O(n) in data size.
- Files: `src/lib/builders/_ComponentState.svelte.ts:108-120`
- Cause: No memoization; getter is recomputed every time `checksum` is accessed.
- Improvement path: Memoize behind a dirty flag; only recompute when component data changes.

**`getSubtitlesCharactersList()` has O(n²) inner loop:**

- Problem: For each subtitle character, `charactersList.includes(char)` is called, making the inner deduplication O(n²) where n = total characters across all subtitles.
- Files: `src/lib/managers/SubtitlesManager.svelte.ts:249-273`
- Cause: Using `Array.includes` for deduplication instead of a `Set`.
- Improvement path: Replace `charactersList` array + `.includes()` check with a `Set<string>` and convert to array at the end. The function already converts at line 271 with `[...new Set(charactersList)]` but the intermediate deduplication check at line 261 remains O(n).

**Multiple `JSON.stringify` calls per component change in `#emitChange`:**

- Problem: Every component change triggers `md5(JSON.stringify(this.#data))` to update the checksum, plus `$state.snapshot(this.#data!)` in `getData()`, plus potentially another snapshot downstream.
- Files: `src/lib/builders/_ComponentState.svelte.ts:122-125, 127-133`
- Cause: Two separate serialization passes per mutation.
- Improvement path: Compute checksum once per change and cache it.

**SVG font embedding refetched per-text-change on server:**

- Problem: `SVGGenerator.generateSVG()` fetches and base64-encodes full font files to embed in SVGs. On scene seek in server rendering, this is called for every subtitle update.
- Files: `src/lib/utils/svgGenerator.ts:48-76`
- Cause: In-flight deduplication exists via `fontDataBase64Inflight` Map, but the cache key includes `fontText`, so different text content causes new fetches.
- Improvement path: Cache by font family + weight only (not text content), since the embedded font contains all glyphs needed.

**`SeekCommand` busy-waits with up to 10 sequential render passes:**

- Problem: On server seek, the command iterates up to 10 times with 30ms sleeps (300ms+ total) waiting for loading state to clear.
- Files: `src/lib/commands/SeekCommand.ts:52-58`
- Cause: Polling loop instead of event-driven completion.
- Improvement path: Emit a `loadingcomplete` event from `StateManager` when loading components reach zero; wait on that event with a timeout.

---

## Fragile Areas

**`SubtitlesManager` (1,751 lines):**

- Files: `src/lib/managers/SubtitlesManager.svelte.ts`
- Why fragile: The file is extremely large and mixes a functional inner builder pattern with a class wrapper. The `buildSubtitlesManager()` closure captures mutable `let index = $state(...)`, making reactivity implicit and hard to trace. The `$derived.by<>` block at line 312 contains complex multi-level iteration and caching logic.
- Safe modification: Understand the `validatedSubtitles` Set and `validatedCollections` Map cache invalidation contract before touching subtitle mutation methods. Always call `markSubtitleDirty()` when modifying subtitle text or timing.
- Test coverage: Partially covered by `tests/subtitlesManager.svelte.test.ts` (991 lines), but the outer `SubtitlesManager` class wrapper has no dedicated integration tests.

**`MediaHook` + `MediaSeekingHook` coordination:**

- Files: `src/lib/components/hooks/MediaHook.ts`, `src/lib/components/hooks/MediaSeekingHook.ts`
- Why fragile: Both hooks manage the same underlying `HTMLMediaElement` in overlapping ways. `MediaHook` handles play/pause/controller logic; `MediaSeekingHook` handles seek/frame accuracy. The comment at `MediaSeekingHook.ts:186` explicitly warns about race conditions with Safari. The controller debounce at `MediaHook.ts:197-230` was added to prevent Safari issues.
- Safe modification: Never add direct media element manipulation in both hooks for the same operation. Always check which hook "owns" the operation. Server-environment branching (`state.environment === 'server'`) exists in both hooks and must stay consistent.
- Test coverage: `tests/hooks/PixiVideoTextureHook.test.ts` covers texture but NOT MediaHook/MediaSeekingHook directly.

**`HtmlToCanvasHook` SVG rendering pipeline:**

- Files: `src/lib/components/hooks/HtmlToCanvasHook.ts`, `src/lib/utils/svgGenerator.ts`
- Why fragile: Text rendering goes through HTML → SVG `<foreignObject>` → Image → PIXI Texture. Any HTML entity or character that cannot be `encodeURIComponent`-encoded (e.g., unpaired surrogates from emoji sequences) causes silent fallback at `HtmlToCanvasHook.ts:80-99`. Firefox requires `Blob` + `URL.createObjectURL` instead of data URIs due to its SVG renderer limitations.
- Safe modification: Test all text content paths through this pipeline, especially emoji sequences and special characters. Always use `Array.from(text)` for character iteration.
- Test coverage: No direct tests for `HtmlToCanvasHook`.

**`StateManager.disabledTimeZones` uses `$derived` inside a getter:**

- Files: `src/lib/managers/StateManager.svelte.ts:151-213`
- Why fragile: The getter calls `$derived()` and `$derived.by()` at call time inside a plain getter method, not inside a Svelte component or `$effect` root. This is non-standard use of Svelte 5 runes outside a reactive context and may not update correctly in all scenarios.
- Safe modification: Do not add more `$derived` calls inside class methods. Convert to a proper reactive field if behavior is uncertain.
- Test coverage: Not directly tested.

**`AnimatedGIF.destroy()` uses `null as any` for forced cleanup:**

- Files: `src/lib/components/AnimatedGIF.ts:512-518`
- Why fragile: Properties like `onComplete`, `onFrameChange`, `_frames` are set to `null as any` to force GC. Any code that accesses these after destroy will get a null reference error without TypeScript catching it.
- Safe modification: Always call `gif.destroy()` then nullify the outer reference; never call any method on a destroyed `AnimatedGIF`.

---

## Scaling Limits

**Single media element per URL in `MediaManager`:**

- Current capacity: One `HTMLVideoElement` per URL, shared via reference counting.
- Limit: Two simultaneous components using the same video URL but at different seek positions cannot both be satisfied; only the controller component's position is honoured.
- Files: `src/lib/managers/MediaManager.ts:12-19`
- Scaling path: Support multiple elements per URL keyed by `url + instanceId`.

**`SubtitlesManager` `$derived.by` block recomputes all languages on any subtitle change:**

- Current capacity: Works acceptably for scenes with one language and up to ~200 subtitles.
- Limit: With multiple languages and large subtitle counts, the `$derived.by` at line 312 validates the full dataset on each change, despite the per-subtitle dirty cache. The `validatedCollections` per-language cache partially mitigates this.
- Files: `src/lib/managers/SubtitlesManager.svelte.ts:311-412`
- Scaling path: Ensure `validatedCollections` cache invalidation is language-scoped; avoid invalidating all languages when only one language's subtitle changes.

---

## Dependencies at Risk

**`pixi.js-legacy` v7.4.3 (pinned to legacy canvas fallback branch):**

- Risk: `pixi.js-legacy` is the Canvas2D fallback variant of PixiJS v7. PixiJS v8 (WebGPU-first) has been released, and v7 is in maintenance mode. The `legacy` suffix means it includes Canvas renderer for environments without WebGL.
- Files: All files importing from `pixi.js-legacy`; see `src/lib/SceneBuilder.svelte.ts`, `src/lib/managers/AppManager.svelte.ts`, `src/lib/components/hooks/HtmlToCanvasHook.ts`, etc.
- Impact: No new features, security fixes only for v7. Migration to v8 is a breaking change to the rendering API.
- Migration plan: Evaluate PixiJS v8 migration; the Canvas renderer fallback requirement must be validated against v8's new Canvas backend.

**`hls.js` v1.5.x — no CORS error handling on HLS stream load:**

- Risk: If an HLS source fails to load (network error or CORS block), `hls.js` emits error events that are not handled in `MediaManager.getVideoElement()`.
- Files: `src/lib/managers/MediaManager.ts:110-133`
- Impact: Video components with broken HLS URLs will hang in loading state indefinitely.
- Migration plan: Add `hls.on(Hls.Events.ERROR, ...)` handler in `getVideoElement` to propagate errors to the promise rejection path.

---

## Missing Critical Features

**No input validation on `SceneBuilder` public API:**

- Problem: `addLayer()`, `addComponent()`, `updateComponent()` etc. accept raw user input without parsing against Zod schemas before applying mutations.
- Blocks: Data integrity guarantees; schema validation only happens in `SceneComposer.build()` at initial construction time.
- Files: `src/lib/SceneBuilder.svelte.ts:302-340`

**No retry or error event for failed media loads (non-HLS):**

- Problem: `getVideoElement()` and `getAudioElement()` reject the promise on load failure, but the calling hook (`MediaHook.#handleSetup`) only logs `console.error` and returns. The component is left in an uninitialized state with no event emitted to the consumer.
- Files: `src/lib/components/hooks/MediaHook.ts:44-59`, `src/lib/managers/MediaManager.ts:85-92`

---

## Test Coverage Gaps

**`MediaHook` and `MediaSeekingHook` have no tests:**

- What's not tested: Play/pause controller logic, debounced controller checks, sync detection, Safari fallbacks, recursive error retry, unbounded `checkReadyState` loop.
- Files: `src/lib/components/hooks/MediaHook.ts`, `src/lib/components/hooks/MediaSeekingHook.ts`
- Risk: Media playback regressions (especially cross-browser) go undetected.
- Priority: High

**`AnimationHook` and `HtmlAnimationHook` have no tests:**

- What's not tested: GSAP timeline creation, animation playback coordination, `animationData` resource sharing.
- Files: `src/lib/components/hooks/AnimationHook.ts`, `src/lib/components/hooks/HtmlAnimationHook.ts`
- Risk: Animation preset changes may silently break playback.
- Priority: High

**`HtmlToCanvasHook` and SVG rendering pipeline have no tests:**

- What's not tested: SVG generation, font embedding, emoji fallback, Firefox Blob path, texture creation and destruction lifecycle.
- Files: `src/lib/components/hooks/HtmlToCanvasHook.ts`, `src/lib/utils/svgGenerator.ts`
- Risk: Text rendering regressions on specific font or character combinations go undetected.
- Priority: High

**`StateManager` core logic has no direct tests:**

- What's not tested: `setEndAt` buggy logic, `disabledTimeZones` computation, dirty flag lifecycle, loading component tracking.
- Files: `src/lib/managers/StateManager.svelte.ts`
- Risk: Timeline trimming and loading state bugs not caught before release.
- Priority: Medium

**`TimelineManager` has no tests:**

- What's not tested: GSAP timeline synchronization, disabled zone seeking, playback rate clamping, loop behaviour.
- Files: `src/lib/managers/TimelineManager.svelte.ts`
- Risk: Seek and loop regressions.
- Priority: Medium

**`ProgressRenderer` variants have no tests:**

- What's not tested: Gradient fallback warning, linear/radial/perimeter/double/custom rendering logic.
- Files: `src/lib/components/hooks/shapes/progress/` (all files)
- Risk: Silent gradient→solid fallback; shape rendering breaks go undetected.
- Priority: Low

---

_Concerns audit: 2026-02-21_
