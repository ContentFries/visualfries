---
title: Transcripts
description: Transcript formats VisualFries reads for motion projects, how words are normalized for matching, and the planned speech-to-text adapters and setup.
updated: 2026-11-14
---

A transcript gives every spoken word a start and an end. VisualFries reads word-level JSON from speech-to-text services; it does not call those services itself.

## Which service

Every timing in VisualFries is a word, so word timestamps decide how tightly cuts, captions and words behind the head land. We use and recommend [Soniox](https://soniox.com): accurate word times in many languages, and inexpensive. Any tool with word-level times works once its words are converted to one of the formats below: Soniox returns sub-word tokens (`text`, `start_ms`, `end_ms`) to join into words, WhisperX lists them under `word_segments`. Plain Whisper estimates word times and can drift, so when you need a local or free option, prefer WhisperX (forced alignment) and give words it could not align a time from their neighbours. Look at a still on a cut before you render.

## Formats

Soniox-style JSON with milliseconds:

```json
{ "words": [{ "text": "extra,", "startMs": 58170, "endMs": 58590 }] }
```

Or a plain list in seconds, with `text` or `word`:

```json
[{ "word": "extra", "start": 58.17, "end": 58.59 }]
```

Each word gets a stable id (`w812`), the transcribed `raw` text and a display `text` with edge punctuation removed.

## Matching

Phrases are compared word by word, ignoring case and punctuation at word edges, and keeping diacritics (`café` and `cafe` are different words). A phrase must match consecutive words.

## Speech to text <span class="tag plan">planned</span>

Planned additions:

- adapters that convert Deepgram, AssemblyAI and Whisper output into the word format above;
- `visualfries setup`, which asks which providers you use, stores API keys in `.env` (never in the project) and verifies them with a short test transcription;
- a check that the transcript belongs to the audio it is used with.

Until then, export word-level JSON from your provider and convert it to one of the formats above.
