# Same brief, two agents

The comparison on [visualfries.com](https://visualfries.com/#compare): three briefs, each given word for word to
Claude Opus 5.5 and to GPT-6.1 Sol. Every folder holds exactly what the agent wrote. Nobody edited the results.

| brief | size | Opus 5.5 | Sol 6.1 |
| --- | --- | --- | --- |
| Stat post that also works as a 4-second video | 1080×1350 | [`stat/opus`](stat/opus) | [`stat/sol`](stat/sol) |
| 5-slide carousel, one 3-second clip per slide | 1080×1350 | [`carousel/opus`](carousel/opus) | [`carousel/sol`](carousel/sol) |
| 12-second explainer, no footage | 1920×1080 | [`explainer/opus`](explainer/opus) | [`explainer/sol`](explainer/sol) |

## How it was run

- Each agent started a fresh session in its own folder with `PROMPT.md` (the brief plus a shared setup section),
  the same fonts, the same 17-second talking-head take with its matte and transcript, and the VisualFries agent
  skill. No other context.
- **Opus 5.5** ran in Claude Code and used the CLI itself: `check`, `still`, looking at the stills, fixing, `render`.
- **Sol 6.1** ran in Codex with `-m gpt-6.1-sol -c model_reasoning_effort="high" -s workspace-write`. Codex's
  sandbox cannot start Chromium, so Sol could compile its blocks but not see them. To make up for that we ran
  `check --determinism` and `still` for it and sent the output back into the same session, without comment, at most
  twice per brief (`qa/feedback*.md` are those messages; `answer*.md` are Sol's replies). Then we rendered.
- Footage, fonts and renders are not in the repository (see `.gitignore`). To re-render, put `talk.mp4`,
  `talk.matte.mp4` and `talk.transcript.json` from [the speaker-depth demo](../../static/demo/speaker-depth) and the
  fonts named in each project into the folder, then run `npx visualfries render project.vf.json --output out/`.

We recommend Opus 5.5 because it is what we build with, but judge the renders yourself.
