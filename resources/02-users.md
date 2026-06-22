# Users & Usage

## Personas

### Sam — The Solo Producer (the only persona for v1)
- **Background:** Makes music alone — a bedroom/independent producer who works in **Ableton** and bounces ideas to an AI music generator (Suno/Udio) for quick audio mockups. Leans electronic/pop but isn't locked to a genre. Has taste and production chops; theory is **functional, not academic** (knows I–V–vi–IV by feel more than by name).
- **The gap they feel:** No co-writer or bandmate in the room. Writing a song is collaborative, and going solo means no one to suggest the next chord, push the chorus higher, or unstick a verse. Today they juggle a notebook (structure), a chord app, a lyrics doc, an AI audio tool, and the DAW — re-entering the key/mood/intent at every hop. Momentum dies in the gaps.
- **Tech comfort:** Very comfortable in a DAW and with tools; comfortable with a terminal but not necessarily a developer. Wants a buddy that does the grind *and* hands them something they can immediately play in Ableton — not a blank chat box.

### Deferred to v2
- **Co-writers / collaborators** (share a song mock, comment, co-edit).
- **Artist/label workspaces** (a roster of projects across writers).
- Noted so we don't design them away, but explicitly out of scope for v1.

## The artist/style preset (reusable context layer)
Before writing, Sam defines a **style preset** once: genre/sub-genre, mood & energy, influences/reference artists, typical key & tempo feel, vocal range/register, and recurring lyrical themes. This is the songwriting equivalent of a brand preset — persistent context Claude reads on every stage of every song. Presets are set up occasionally (or revised), and a producer can keep more than one (a second project/alias), though most have one.

## Jobs-to-be-done
- When **a hook or idea lands**, Sam wants to capture it into a full song skeleton *before the spark fades* — structure, chords, lyrics — without tool-hopping.
- When **staring at a blank arrangement**, Sam wants a co-writer to propose a starting structure and a progression so there's something to react to instead of nothing.
- When they **already have a fragment** (a 4-chord loop, a chorus line, a title), Sam wants to **drop it in and have Claude build the rest around it**, congruent with the style preset — i.e. enter the spec at any stage with their own material.
- When a part **isn't landing**, Sam wants to **refine it two ways**: ask Claude in chat ("darker bridge," "give me a IV–V–vi turnaround"), *or* edit it by hand in a **simple chord/section editor** (drag chord blocks, pick diatonic chords, tweak lyrics) and hear it.
- When a mock is good, Sam wants to **get a generation prompt + the chords** and move it into the Ableton → AI-generator → Ableton pipeline.

## Primary user journey
1. **Setup:** Confirm Claude is connected (the harness engine). Create a style preset — genre, mood, influences, vocal range, themes.
2. **Start a song:** Hit "new song." The harness opens a **song spec**: a stage checklist (**Concept → Structure → Chords → Lyrics → Generation Prompt**) pre-loaded with the style preset as context.
3. **Walk the spec (the aha moment):** At each stage Claude co-writes the artifact — concept/hook → section map → a chord progression per section → lyrics → a paste-ready generation prompt. Sam **one-click accepts**, **talks it through in chat**, or **edits by hand** in the section/chord editor. Every approved part carries forward, so the song stays congruent — no re-pasting the key, mood, or intent.
4. **Stub & refine:** In the **composer editor**, Sam shapes each section's progression on a beat timeline (drag/resize chord blocks, drop diatonic chords for the song's key, hear the stub), and edits lyrics per part. Manual edits and AI suggestions act on the *same* song.
5. **Hand off & loop:** Export the **generation prompt** (style + section-tagged lyrics) and the **chords** (rendered for guitar/piano/bass/Ableton). Sam plays the progression into **Ableton**, sends lyrics+prompt to an **AI music generator**, then brings the result **back into Ableton** to finish. The finished-or-not mock is saved to the library.

## Core loop
The repeated action is **mocking one song by walking its spec and shaping its sections**:

**pick "new song" → harness generates the spec (seeded with the style preset) → at the current stage Claude drafts the part (concept / structure / chords / lyrics / prompt) → producer accepts, chats to refine, or hand-edits in the chord/section editor → the part checks off and feeds the next stage → repeat until the song mock is complete → hand off to the Ableton/AI-gen pipeline.**

What pulls Sam back: an in-progress song with parts still unstubbed; the urge to **re-spin a finished mock into a variation** (same concept, darker mood / different progression / new lyrics); and the simple pull of "**start the next idea**" with a co-writer already in the room and the process laid out, instead of a blank DAW. Over time the app becomes a **library of song mocks** — a personal idea vault to revisit, reuse, and re-spin.
