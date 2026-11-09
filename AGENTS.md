# VisualFries

## Language

Write everything in this repository in English: docs, the site, skills, examples and demo projects, code comments, commit messages and pull requests. In examples this covers the content too — transcripts, cue phrases, on-screen words and captions. When an example starts from a real recording in another language, translate its words and keep the timings plausible.

## Before a PR: CRAP check

Run `pnpm exec crap-check` before showing a change for approval and before opening or updating a PR
(config in `crap.config.json`). It runs the tests related to the change with coverage and scores each
changed function: CRAP = complexity² × (1 − coverage)³ + complexity.

- New functions must score CRAP 30 or less. Changed functions over 30 must not get more complex.
- Fix a ✗ row with tests or by splitting the function. Never raise the threshold or add excludes to
  pass.
- "Let through" lists existing functions over 30 that passed because they did not get more complex.
  Name them in the PR; a test is the fix.
- Coverage comes from the vitest process. Code that runs only in the browser page
  (`program-stage.ts`, `stage.ts`, `subject-canvas.ts`) or in the CLI's own process (`bin/`) counts
  as untested. Put new decisions there into a plain module with tests and keep the browser or CLI
  side a thin shell.
- Paste the table into the PR. Its "Suggested review" line sizes the independent review.

CI runs the same check on every pull request. The `.githooks/pre-push` hook runs it before a push. In
a new clone run `git config core.hooksPath .githooks` once (worktrees share it). Emergency only, and
say so in the PR: `CRAP_CHECK_SKIP=1 git push`.
