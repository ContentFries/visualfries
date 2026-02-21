# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-21)

**Core value:** Backend renderers can obtain a deterministic, timeline-correct frame blob with a 5-line loop — no internal patching, correct split-screen and blur effects, no trailing frames.
**Current focus:** Phase 1 — Types & Interfaces

## Current Position

Phase: 1 of 7 (Types & Interfaces)
Plan: 0 of 2 in current phase
Status: Ready to plan
Last activity: 2026-02-21 — Roadmap created (7 phases, 44 requirements mapped)

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| -     | -     | -     | -        |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

_Updated after each plan completion_

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Phase 3 (pending): `ComponentDirector` must branch at construction time — server+deterministic path omits native media chain entirely (prevents P1.1, P1.4, P3.2, P3.4)
- Phase 3 (pending): `imageElement`/`ImageBitmap` decode for blur — cache alongside texture in `DeterministicMediaManager` to avoid re-decode on same cacheKey (open question from research)
- Phase 7 (pending): `ReplaceSourceOnTimeCommand` fate — rebuild as `DeterministicMediaManager` wrapper (not delete); decision confirmed in REND-08

### Pending Todos

None yet.

### Blockers/Concerns

- **Open Q (Phase 3):** Where does blob→imageElement decode happen — inside hook or inside manager? Recommend: manager (cached alongside texture). Must be decided before Phase 3 execution starts.
- **Open Q (Phase 6):** `requestAnimationFrame` in jsdom — confirm whether existing `seekAndRenderFrame()` handles RAF timing or whether `renderFrameRange` needs a sync render variant.

## Session Continuity

Last session: 2026-02-21
Stopped at: Roadmap created and committed — all 44 v1 requirements mapped to 7 phases
Resume file: None
