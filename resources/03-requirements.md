# Functional Requirements

Capability statements derived from the product (stage 1) and the users/loop (stage 2). These say what the app must *do*, not how.

## Core features (MVP)

**Artist/style presets**
- Users must be able to create, edit, and store a **style preset**: genre/sub-genre, mood & energy, influences/reference artists, typical key & tempo feel, vocal range/register, and recurring lyrical themes.
- A user must be able to have more than one preset (most have one).
- Any stage must be able to read the active style preset as context automatically, without re-entering it.

**Song mock spec (the core loop)**
- Users must be able to start a new song, which generates a **song spec**: an ordered checklist of stages.
- The default stage order is: **Concept → Structure → Chords → Lyrics → Generation Prompt**.
- For each stage, the app must invoke the stage's skill, driving Claude to produce that stage's artifact, using the style preset plus all prior approved stage outputs as context.
- Users must be able to **review, refine, and approve** each stage's output. Refinement works **two ways**: conversational (chat with Claude) and **direct hand-editing** (the composer/section editor).
- Approving a stage must check it off, persist its output, and make it available as context to later stages.
- Users must be able to **enter the spec at any stage with their own material** (paste a chord loop, a chorus line, a title) and have Claude build the rest around it, congruent with the preset.
- Users must be able to leave a song mid-spec and resume it later at its current stage.
- Users must be able to see all songs and their progress (which stage each is on) — a **library of mocks**.
- Users must be able to **re-spin** a completed mock into a variation (same concept, different mood / progression / lyrics) as a new song.

**The song composition (shared structured artifact)**
- The app must maintain a structured **song composition**: an ordered list of **sections** (Intro, Verse, Pre-Chorus, Chorus, Bridge, Outro, …), each with a **chord progression** and **lyrics**, plus song-level **key** and **tempo/feel**.
- The Structure stage creates the sections; the Chords and Lyrics stages fill each section; the composer editor refines them. All act on the *same* composition.

**Chord/section composer (hands-on editing)**
- Users must be able to edit a section's chord progression in a **simple visual editor**: place chord blocks on a beat timeline, move/resize them, and pick chords from a **diatonic palette** for the song's key (roman-numeral degrees → concrete chord names).
- Users must be able to **hear** a section/progression via lightweight in-app **chord playback** (a preview synth — not full-song audio).
- Chords must be **rendered for the instruments the producer uses**: guitar (diagram/tab), piano (keys/voicing), bass (root/notes), and Ableton (a layout/voicing view) — reusing music-theory rendering concepts from the `music-kb` reference.
- Users must be able to edit **lyrics per section** in a simple editor, aligned to the section list.

**Embedded AI workspace (Claude is the engine)**
- The app must provide a **chat** where the user co-writes with Claude, and Claude can **read and update the app's data** (presets, songs, sections, chords, lyrics) to walk and revise the workflow — i.e. the harness orchestrates Claude, and Claude can act on app state.
- The structured per-stage **Run** buttons must drive Claude the same way for one-click generation.
- There is **no local model**; Claude (the user's Claude Code subscription) is the single engine.

**Skill & tool library (extensibility)**
- Users must be able to view, add, edit, and enable/disable **skills** — a skill defines a stage's songwriting behavior/method (e.g. the Structure method, a progression style, a lyric technique, a generation-prompt template).
- Builtin skills must ship for each stage; users must be able to add **custom music-writing skills** (genre structures, the Nashville number system, melodic-math, prompt templates per AI tool, etc.).
- Skills must run against the currently configured (latest available) Claude model without per-skill reconfiguration.

**Specific stage capabilities**
- **Concept:** produce a working title + 2–3 alternatives, the hook/angle, theme, and mood — congruent with the preset. Accepts a seed idea/title.
- **Structure:** produce the section map (each section: type, approximate bar count, energy/role), plus song key and tempo/feel. This creates the composition's sections.
- **Chords:** produce a chord progression **per section** as diatonic degrees + concrete chord names in the song's key, ready to render across instruments and edit in the composer.
- **Lyrics:** produce lyrics **per section** in the artist's voice, aware of section role (verse vs chorus), with attention to meter/syllables and rhyme; editable per section.
- **Generation Prompt:** produce a **tool-agnostic** prompt for an AI music generator — a style/production description **plus** section-tagged lyrics (e.g. `[Verse] … [Chorus] …`) ready to paste into Suno/Udio/etc.

## Account & auth
- v1 assumes a single local user. No multi-user accounts, teams, or collaborator logins.
- The app must securely store the Claude connection config; any integration keys live in the OS keychain (none required for v1 — Claude is via the local CLI/subscription).

## Data the product handles (conceptual entities)
- **Style Preset:** genre, mood, influences, key/tempo feel, vocal range, themes.
- **Song:** a mock belonging to a style preset; has a status and a current stage.
- **Stage:** a step in a song's spec (concept/structure/chords/lyrics/prompt); has a type, status, and a link to its artifact/skill.
- **Section:** an ordered part of the song composition (intro/verse/chorus/…); holds a chord progression and lyrics.
- **Artifact:** the output of a stage (concept, structure, the composition, lyrics, generation prompt), versioned.
- **Skill:** a stage's songwriting method — name, instructions, stage type, enabled/disabled, builtin/user.
- **Settings:** Claude connection/model config, MCP config.

## Integrations (capability level)
- Drive Claude through the embedded Claude session (CLI) and an MCP server so Claude can act on app data ("app MCP").
- Export a **generation prompt** (text) for any external AI music generator — manual copy/paste in v1, no direct API.
- Export **chords/sections** in a form the producer can play into Ableton (on-screen voicings/diagrams in v1).

## Non-functional requirements
- Performance: AI work is long-running; the UI must run it asynchronously, stream progress, and never block or lose partial output.
- Reliability: the composition and artifacts must autosave; edits are journaled so revisions/undo survive restarts.
- Privacy/cost: work runs through the user's own Claude subscription; store any credentials securely.
- Latency: chord playback and composer edits must feel instant (local, no model round-trip).
- Extensibility: skills are first-class objects that can be added/edited without rebuilding the app.

## Out of scope for MVP
- In-app **full-song audio generation** — that's the external AI music generator's job (we export a prompt). (Lightweight chord *preview* playback is in scope.)
- In-app **recording / DAW / mixing** — Ableton's job; we export chords/prompt.
- **MIDI / stem / audio export** — v1 renders chords on-screen; MIDI/stem export is later.
- Direct API integration with Suno/Udio/etc. — v1 is copy/paste of the prompt.
- Multi-user, collaboration, sharing — v2.
- Notation/score engraving and full melodic transcription — beyond the brief.
