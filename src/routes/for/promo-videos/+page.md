---
layout: page
title: 'Promo videos and event openers made by your AI agent: VisualFries'
heading: Promo videos with no voice at all
description: Product promos, event openers and kinetic type cut to the beat of the music. Your AI agent gathers the material and builds the promo with VisualFries. Open source, MIT.
updated: 2026-11-14
faq:
  - q: Does a promo need a voiceover or a transcript?
    a: No. A promo can be timed entirely by its music. VisualFries analyses the track into bars and beats, and cuts, type and photos anchor to them the same way other videos anchor to words.
  - q: Where do the photos and footage come from?
    a: From you, or from your agent. In the two promos on this page the agent gathered the photos and b-roll itself; VisualFries places, frames and animates whatever files the program names.
  - q: Can I get the same promo for Reels and for YouTube?
    a: Yes. One program renders at 9:16, 4:5, 1:1 and 16:9, and check runs the edit in each size before you render.
  - q: Is this a template?
    a: No. The type, the layout and the motion are Svelte blocks your agent writes for the brand, so two promos do not have to share a look.
---

Not every video starts with someone talking. An opener for an event, a product film, a teaser for a launch: no voice, only pictures, type and music. Your agent builds those with VisualFries too, and these two shipped.

## A product promo, 35 seconds

<video src="/media/v4/promo-diary.mp4" poster="/media/v4/promo-diary.jpg" autoplay muted loop playsinline aria-label="A 35-second product promo for a paper planner: b-roll of a woman at a desk, large serif letters over close-ups of handwriting, kinetic lines of text and an end card with the three planners."></video>

A promo for a yearly paper planner, in Slovak. B-roll, big serif letters that sit inside the picture, lines of type that land on the beat, and an end card with the product. The agent gathered the b-roll and the product shots itself. Sound is off here; the original has a music bed.

## An event opener

<video src="/media/v4/promo-opener.mp4" poster="/media/v4/promo-opener.jpg" autoplay muted loop playsinline aria-label="An excerpt of an event opener: silhouettes in a dark hall, serif lines of text, the speaker on stage, and a gold end card."></video>

An excerpt of the 58-second opener that started a three-day live training. Event footage and photos with slow camera moves, serif type that builds line by line, and a gold end card. The agent found the material itself. The full opener also introduces the guest speakers; this page shows the parts without them.

## What your agent works with

- **Music as the timeline.** `visualfries beats` analyses a track once into bars and beats. Cuts, clips and sound effects anchor to a bar or a beat, and the music ends on a bar.
- **Photos and footage as props.** A block gets its picture from the program, so one block serves every photo, with a camera move on each.
- **Brand as tokens.** Colours, fonts and the energy of the motion live in one brand file and reach every block.
- **Motion in one line.** Entrances, exits and emphasis come from `use:motion`; type that builds word by word is a few lines of Svelte.
- **Transitions with their own sound.** `push`, `wipe`, `zoom-through`, `shape-mask`, `blinds` and `card`.
- **Every format.** 9:16, 4:5, 1:1 and 16:9 from the same program, with safe zones per platform.
- **A finished mix.** Music and effects at -14 LUFS.

## What it does not do

- It does not generate footage or images. Your agent can call a generator and hand the files to the program.
- It has no library of ready-made promo templates. The look is written for your brand.
- There is no timeline to click in. You review stills and the render.

## Start

```bash
npm install visualfries svelte playwright
npx visualfries doctor
```

Then give your agent the brief, the track and the skill that ships in the package. Timing by music is on [Program sound](/docs/program-sound), the building blocks on [Motion primitives](/docs/motion). Videos with a voice are on [YouTube videos](/for/youtube-videos) and [shorts and reels](/for/shorts-and-reels).
