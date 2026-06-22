# Technical Requirements

Derived from the requirements (stage 3) and tech decisions (stage 4). Stack: Tauri v2 shell, Rust core (state + tool registry + agent loop + MCP server), React/TanStack frontend, local libSQL, Claude via the `claude` CLI, ported music-kb theory/composer layer.

## Data models (libSQL — SQLite-compatible — owned by the Rust core)

### StylePreset
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key |
| name | text | e.g. "Night-drive synthpop" |
| genre | text | genre / sub-genre |
| mood | text | mood & energy |
| influences | text | reference artists / tracks |
| key_tempo_feel | text | typical key & tempo feel (free text) |
| vocal_range | text | register / range notes |
| themes | text | recurring lyrical themes |
| created_at / updated_at | timestamp | |

One StylePreset has many Songs.

### Song
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key |
| style_preset_id | uuid | FK → StylePreset |
| title | text | working title; set by Concept stage |
| status | text | `in_progress` / `done` / `archived` |
| current_stage | text | enum of stage types |
| key_root | text | pitch class, e.g. `A` (song key) |
| key_mode | text | `major` / `minor` |
| bpm | integer | quarter-note tempo |
| created_at / updated_at | timestamp | |

Index on `style_preset_id`, `status`. One Song has many Stages and one current Composition (+ revisions).

### Stage
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key |
| song_id | uuid | FK → Song |
| type | text | `concept` / `structure` / `chords` / `lyrics` / `prompt` |
| ordinal | int | position in the spec |
| status | text | `pending` / `in_progress` / `done` |
| skill_id | uuid | FK → Skill that ran it (nullable) |
| created_at / updated_at | timestamp | UNIQUE(song_id, type) |

### Artifact (journaled)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key |
| song_id | uuid | FK → Song (composition is song-level; text artifacts link via stage) |
| stage_id | uuid | FK → Stage (nullable for the shared composition) |
| kind | text | `concept` / `composition` / `lyrics_block` / `generation_prompt` |
| content | json | structured payload (shapes below) |
| version | int | incremented per save |
| approved | bool | true when the creator approves |
| created_at | timestamp | |

Each save writes a new revision; revert restores a prior version. Index on `song_id`, `stage_id`.

### Skill
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | primary key |
| key | text | slug, e.g. `nashville-numbers` |
| name | text | display name |
| stage_type | text | which stage it powers (`concept`/`structure`/`chords`/`lyrics`/`prompt`/`style`) |
| instructions | text | the prompt/markdown body (the songwriting method) |
| source | text | `builtin` / `user` |
| enabled | bool | |
| created_at / updated_at | timestamp | |

### Setting (key/value)
- claude_model (optional override), claude_bin (resolved CLI path), mcp_token (per-install), plus any future config. No inference endpoint/model — Claude is the engine.

## Artifact `content` shapes (by kind)

The **composition** is the heart — degree-based and tick-based (ported from music-kb `lib/music/compose/types.ts`), extended to multiple sections. Time is ticks at 16th-note resolution (4 ticks/beat, 16 ticks/bar). Storing **scale degrees** (not absolute pitches) means changing `key`/`bpm` transposes the whole song for free.

- **concept**: `{ title, alternates: [string], hook, theme, mood }`
- **composition**:
  ```
  {
    schemaVersion: 1,
    key: { root: "A", mode: "minor" },
    bpm: 120,
    sections: [
      {
        id, type: "verse" | "chorus" | "intro" | "pre" | "bridge" | "outro" | ...,
        label: "Verse 1", bars: 8,
        chords: [ { id, start, length, degree } ],          // ChordSpan
        bass:   [ { id, start, length, degree, octave } ],  // NoteSpan (optional)
        melody: [ { id, start, length, degree, octave } ],  // NoteSpan (optional)
        lyrics: "markdown / plain text for this section"
      }
    ]
  }
  ```
  - **Structure** stage seeds `sections` (types, labels, bars) with empty chords/lyrics.
  - **Chords** stage fills each section's `chords` (and optional `bass`).
  - **Lyrics** stage fills each section's `lyrics`.
  - The **composer editor** writes new `composition` revisions directly (drag/resize/add chords, edit lyrics).
- **generation_prompt**: `{ stylePrompt: string, taggedLyrics: string /* "[Verse]\n…\n[Chorus]\n…" */, notes: string }`

## Tool registry (Rust core — `ToolSpec` rows; UI + agent + MCP all derive from this)

- `list_style_presets` / `get_style_preset` / `create_style_preset` / `update_style_preset`
- `create_song` / `list_songs` / `get_song` / `update_song_status` / `delete_song` *(confirm)*
- `get_stage` / `run_stage` / `approve_stage` / `advance_stage`
- `get_composition` / `save_composition` / `list_composition_revisions` / `revert_composition`
- `get_artifact` / `save_artifact` / `list_artifact_revisions` / `revert_artifact`
- `list_skills` / `get_skill` / `create_skill` / `update_skill` / `set_skill_enabled`
- `get_settings` / `set_settings`

`run_stage` is the heart: loads the stage's Skill + StylePreset + prior approved artifacts (incl. the current composition) as context, calls Claude (`claude` CLI, stream-json), and writes the resulting Artifact (a `composition` revision for structure/chords/lyrics, or a text artifact for concept/prompt). `save_composition` is what the composer editor calls on edit. Destructive tools (`delete_song`) require in-app confirmation.

## Engine & MCP surface
- Claude is invoked headless: `claude -p <user> --append-system-prompt <skill+style> --output-format stream-json --verbose --include-partial-messages --no-session-persistence [--model X]`; the agent parses `stream_event`/`assistant`/`result` (reuse YT base `core/src/agent.rs::call_claude`).
- The **Chat** tab runs `claude -p … --mcp-config <mcp.json> --allowedTools "mcp__songsmith" --permission-mode acceptEdits -n songsmith [--session-id|--resume]`. `mcp.json` points at the bundled `mcp-shim` over the shared DB (reuse YT base `chat_send` + `mcp-shim`, renamed server).
- No tool duplication: MCP, the agent loop, and the UI all derive from `core/src/tools.rs`.

## Pages & key components (React / TanStack)

### `/` — Library
- See all songs and which stage each is on; start a new song.
- Components: SongList, StageProgressBadge, NewSongButton, StylePresetSwitcher.

### `/presets` — Style presets
- Create/edit the reusable style context.
- Components: PresetList, PresetForm (genre, mood, influences, key/tempo, vocal range, themes).

### `/song/$id` — Song workspace (the core loop)
- Walk the spec for one song. Layout: StageChecklist (left) · center stage panel + AIRunPanel · StyleContext (right).
- The **center panel is stage-aware**:
  - Concept → ConceptView (title options, hook, theme).
  - Structure → SectionListEditor (add/reorder/label sections, bar counts).
  - Chords → **Composer** (the ported editor: ChordLane + ChordPalette + BeatRuler per section) + instrument voicing views (Piano/Guitar/Bass/Push) for the selected chord + the **playback** transport.
  - Lyrics → LyricsEditor (per-section text aligned to the section list).
  - Generation Prompt → GenerationPromptView (style prompt + tagged lyrics, copy button).
- Shared: AIRunPanel (run / chat-to-refine / approve), SeedInput (paste your own chords/lyrics/title to enter a stage), RevisionHistory, ConfirmDialog.
- **Ported from music-kb**: `Composer`, `ChordLane`, `ChordPalette`, `NoteLane`, `BeatRuler`, `ChordDiagram`, instrument views, and `lib/music/*` (theory, compose, voicings, audio synth).

### `/skills` — Skill library
- View/add/edit/enable skills (builtin + custom music-writing skills).
- Components: SkillList, SkillEditor (markdown instructions, stage_type, enable toggle).

### `/chat` — Claude chat
- Co-write conversationally; Claude drives the tools over MCP. Component: ChatPanel (reuse YT base).

### `/settings` — Setup
- Claude engine status (CLI found + version, model override), MCP connection (db path + `claude mcp add` line), tool registry. Components: ClaudeStatus, McpPanel, ToolRegistryView.

## State management
- Rust core holds canonical state in libSQL; frontend is a view layer.
- TanStack Query over Tauri IPC; long-running `run_stage` streams progress via Tauri events.
- The **composer autosaves**: edits debounce into `save_composition` (new revision); playback is fully local (Web Audio), no model round-trip.
- TS types generated from Rust (ts-rs); a mock-parity test keeps the browser mock in sync with the registry (YT base pattern).

## Background jobs
- `run_stage` executes as a background task in the Rust core (inflight dedupe), streaming to the UI; the artifact autosaves on completion.
- No transcript/sidecar work (not a video tool). No embeddings in v1.

## Environment variables
- `CLAUDE_BIN` — optional override for the `claude` CLI path (else resolved from PATH / `~/.local/bin`).
- MCP per-install token — generated at first run, written to the app data dir.
- No inference endpoint/model vars (no local model).
