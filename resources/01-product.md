# Songsmith Studio

## One-liner
A desktop songwriting cockpit that turns a spark into a clearly-defined song mock — structure, chords, and lyrics — fast, by co-writing with Claude as your music buddy, then hands the mock off to an AI music generator (audio) and Ableton (production).

## The problem
Solo producers lose momentum in the gap between a musical spark and a workable song idea. Two things make that gap painful:

- **No co-writer in the room.** A lot of producers work alone and don't have a bandmate, a topliner, or a theory-literate friend to bounce ideas off. Writing a song is a *collaborative* act, and going solo means staring at a blank arrangement with no one to say "try the relative minor here" or "that chorus needs a bigger lift."
- **The pipeline is fragmented and slow.** Getting from "I have a vibe" to something you can actually hear means hopping between a notebook (structure), a chord app (progressions), a lyrics doc, an AI audio tool, and finally a DAW — re-entering the key, mood, and intent at every step. Ideas die in the hand-offs. A chat tool can spit out a verse, but it won't keep the *whole song* congruent — structure, key, mood, and lyrics drifting apart — or show you the chords on the instruments you actually play.

## The value
Open Songsmith Studio, set an **artist/style preset** once (genre, mood, influences, key/tempo feel, vocal range, recurring themes), and walk a **song spec** — a stage-by-stage checklist: **Structure → Chords → Lyrics → Generation Prompt**. At each stage Claude acts as your co-writer: it drafts the section map, the chord progression per part, the lyrics in your voice — and you either **one-click accept** or **talk it through in chat** ("make the bridge darker," "give me a IV–V–vi turnaround instead"). Every approved part carries forward as context to the next, so the song stays coherent end to end.

When the session is done you have a **clearly-defined song**: labeled parts/stages (Intro · Verse · Pre · Chorus · Bridge · Outro…), a **chord progression per part** rendered for **guitar, piano, bass, and Ableton**, and **lyrics** per section — plus a **paste-ready generation prompt** for any AI music tool. That base-track mock is the front of a real pipeline that loops through the producer's DAW:

> **Songsmith Studio** (co-write the mock: structure + chords + lyrics + generation prompt) → **Ableton** (lay down a quick base track by playing the chord voicings) → **an AI music generator** (e.g. Suno, Udio — audio mockup from the lyrics + style prompt) → **back into Ableton** (recreate the final version).

The chord rendering for guitar/piano/bass/Ableton exists to serve the *"mock it in Ableton"* step — so the producer can drop the progression in fast. The "before → after": a blank DAW and scattered notes becomes, in a few minutes, a coherent song skeleton you can play in, sing, and feed to an AI music generator — built *with* a collaborator instead of alone.

## Product category
A tool / vertical workspace — an AI-orchestrated **songwriting cockpit**. More precisely it's a **harness around Claude**: a structured capability layer that wraps the model with songwriting skills (structure, progressions, topline/lyrics, prompt-craft), persistent per-project style context, chord/theory rendering for real instruments, and an enforced spark-to-mock workflow. The model is the engine; the harness turns it into a co-writer. Less a chatbot, more a writing-room buddy that a solo producer opens whenever an idea strikes. It is **not** a DAW and **not** an audio generator — it scaffolds the *idea* and hands off; an AI music generator makes the audio, Ableton makes the record.

## What success looks like
A year in: a producer opens Songsmith Studio the moment a hook lands, and in one sitting mocks several song skeletons — each with structure, chords, and lyrics — before lunch. The best ones get a generation prompt and become audio mockups via an AI music tool; the winner gets imported into Ableton to become a real track. Every idea, finished or not, is saved as a living library of song mocks the producer can revisit, reuse, or re-spin. Writing alone stops feeling lonely or slow — there's always a buddy in the room who knows the project's vibe and never runs out of ideas.

**v1 scope note:** single local user (one solo producer). The mock is **structure + chords + lyrics + a generation prompt** — no in-app audio generation (an external AI music tool's job), no DAW/recording (Ableton's job), no MIDI/stem export in v1. Chords are rendered as diagrams/voicings across guitar/piano/bass/Ableton (reusing music-theory concepts from the music-kb reference), not played back as audio. Multi-user/collaboration is later.
