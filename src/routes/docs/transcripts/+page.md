---
title: Transcripts
description: Transcript formats VisualFries reads for motion projects, how words are normalized for matching, and the planned speech-to-text adapters and setup.
updated: 2026-09-27
---

A transcript gives every spoken word a start and an end. VisualFries reads word-level JSON from speech-to-text services; it does not call those services itself.

## Formats

Soniox-style JSON with milliseconds:

```json
{ "words": [{ "text": "naviac,", "startMs": 58170, "endMs": 58590 }] }
```

Or a plain list in seconds, with `text` or `word`:

```json
[{ "word": "naviac", "start": 58.17, "end": 58.59 }]
```

Each word gets a stable id (`w812`), the transcribed `raw` text and a display `text` with edge punctuation removed.

## Matching

Phrases are compared word by word, ignoring case and punctuation at word edges, and keeping diacritics (`sú` and `su` are different words). A phrase must match consecutive words.

## Speech to text <span class="tag plan">planned</span>

Planned additions:

- adapters that convert Deepgram, AssemblyAI and Whisper output into the word format above;
- `visualfries setup`, which asks which providers you use, stores API keys in `.env` (never in the project) and verifies them with a short test transcription;
- a check that the transcript belongs to the audio it is used with.

Until then, export word-level JSON from your provider and convert it to one of the formats above.
