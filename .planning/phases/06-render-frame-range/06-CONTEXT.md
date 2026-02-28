# Phase 6: renderFrameRange() Render Loop - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement `SceneBuilder.renderFrameRange()` as the public API entry point: a sequential frame loop with back-pressure that produces exactly `toFrame - fromFrame` frames in `[fromFrame, toFrame)` exclusive-end order, awaits the sink before advancing, supports abort via `AbortSignal`, and is typed on `ISceneBuilder`. Resource cleanup via `release()` is included in this phase (REND-02).

</domain>

<decisions>
## Implementation Decisions

### Implementation state at context-gather time

The majority of Phase 6 is already implemented. The loop, back-pressure, abort signal, skip-duplicates, mimeType forwarding, image encoding options, and `ISceneBuilder` typing are all complete and tested. The single open requirement is **REND-02**: the `release()` callback body is empty (idempotency guard present, auto-fallback call present, but no actual resource cleanup).

### release() cleanup semantics

`renderFrameRange` never calls `URL.createObjectURL` — frames are returned as direct `Blob`, `ArrayBuffer`, or dataURL `string` values from `canvas.toBlob` / `canvas.toDataURL`. There are no object URLs created in the render path to revoke.

The open question left to the planner/researcher: determine what `release()` should actually free, given that:

- `Blob` and `ArrayBuffer` frames are GC-managed; no explicit revocation needed
- The `skipDuplicates` path holds a `previousFrame` reference — but that reference lives on the loop variable, not via `release()`
- The roadmap requirement says "revokes object URLs / frees resources; no blob URL memory leak" — but no object URLs are created in the current implementation

**Decision:** The planner should either (a) implement `release()` as a documented no-op with a clear code comment explaining why no cleanup is needed, or (b) identify if any upstream path (e.g. a future format variant) would create object URLs and make `release()` forward-compatible. OpenCode has discretion on the approach.

### Tests required (plan 06-02, requirement REND-08 area)

The plan `06-02` covers tests. Tests already present:

- `skipDuplicates` + dirty updates
- JPEG encoding + mimeType

Tests still missing (researcher should confirm scope against REND-08 and TEST requirements):

- `release()` called / not leaking across a long render job
- Abort signal stops at frame boundary + `aborted: true` in summary
- Frame count exactness (`toFrame - fromFrame` invocations)
- Back-pressure sequencing (slow `onFrame` does not cause pileup)

### OpenCode's Discretion

- Whether `release()` is a documented no-op or forward-compatible stub
- Exact test fixture structure for the abort and back-pressure tests
- Whether `previousFrame` reference is explicitly nulled on `release()` for GC friendliness

</decisions>

<specifics>
## Specific Ideas

- The roadmap success criterion for REND-02 is: "The `release()` function provided to `onFrame` correctly revokes object URLs / frees resources; no blob URL memory leak occurs across a long render job." The researcher should verify whether the current implementation already satisfies this (Blob in-memory, no URL to revoke) or whether additional cleanup is needed.
- Plan 06-01 implements the loop; plan 06-02 covers tests + the `ReplaceSourceOnTimeCommand` rebuild (REND-08). These are the two remaining plans.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 06-render-frame-range_
_Context gathered: 2026-02-22_
