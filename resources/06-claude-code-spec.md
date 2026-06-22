# Songsmith Studio — Claude Code Build Spec

## Project overview
Songsmith Studio is a local-first **harness around Claude** for songwriting — "Claude Code for music producers." A solo producer defines a reusable **style preset** (genre, mood, influences, key/tempo feel, vocal range, themes), then starts a song and walks a **song spec** — a stage checklist (Concept → Structure → Chords → Lyrics → Generation Prompt) where Claude co-writes each part, the producer reviews/refines/approves (one-click, chat, **or** hand-edits in a chord/section editor), and each approved part feeds the next. Output: a clearly-defined song mock (structure + chords + lyrics + a tool-agnostic generation prompt) that feeds the **Ableton → AI-music-generator → Ableton** pipeline.

**One-liner:** A desktop cockpit that co-writes a song mock with Claude — structure, chords, and lyrics — then hands it to an AI music generator and your DAW.

## Approach
This is a **GPL-3.0** project built by **forking and reusing two of the author's repos**:
- **`/Users/paul/programing/yt-creator-studio`** (GPL-3.0) — the **architecture base**. Fork it wholesale: Tauri v2 shell, Rust core (libSQL + `ToolSpec` registry + Claude agent loop + mcp-shim), React/TanStack frontend with single `styles.css`, ts-rs bindings, `chat_send` + `mcp-shim` + `make install`. **Claude is the single engine via the `claude` CLI** (no local model — already true in the base). Strip the YouTube domain and reshape to the songwriting domain below.
- **`/Users/paul/programing/music-kb`** (GPL-3.0-or-later) — **borrow the music layer**. Port its pure-TS `client/src/lib/music/*` (theory, compose, voicings, instruments, audio synth) + compose components (`Composer`, `ChordLane`, `ChordPalette`, `NoteLane`, `BeatRuler`, `ChordDiagram`) into the React frontend.

Start by cloning YT Creator Studio's layout, renaming the domain (brand preset → style preset, video → song, the production stages → the song stages), then port the music-kb composer.

## Stack
- Shell: Tauri v2 (macOS-first, macOS 11+).
- Core: Rust — models, libSQL (SQLite-compatible) persistence, `ToolSpec` registry, Claude agent loop, MCP server.
- Frontend: React + TanStack (Router/Query), single `styles.css` (terminal aesthetic + a degree-color accent palette for chord blocks), TS types from Rust (ts-rs).
- Engine: **Claude only** via the `claude` CLI headless (stream-json). No local LLM.
- Music: ported music-kb `lib/music/*` + compose components; chord **preview** playback via the Web Audio API.
- Terminal-free: the embedded surface is a **Chat** tab (Claude + MCP), as in the YT base.
- License: GPL-3.0.

## Setup commands
```bash
# prereqs: Rust 1.85+, Node 20+, cmake, Claude Code installed + signed in (`claude`)
cp -R /Users/paul/programing/yt-creator-studio /Users/paul/programing/songsmith-studio   # fork the base
cd /Users/paul/programing/songsmith-studio
# (then rename crates/identifiers: yt_core→song_core, com.ytcreatorstudio.desktop→com.songsmithstudio.desktop, etc.)
cd frontend && npm install && cd ..
cd app/src-tauri && ../../frontend/node_modules/.bin/tauri dev    # or: make dev
```

## Folder structure (after fork + reshape)
```
songsmith-studio/
├── core/                 # Rust core
│   ├── src/
│   │   ├── models.rs     # StylePreset, Song, Stage, Artifact, Skill, Settings
│   │   ├── db.rs         # libSQL + migrations + journaled revisions
│   │   ├── tools.rs      # ToolSpec registry (one table, three callers)
│   │   ├── agent.rs      # run_stage + call_claude (stream-json) — reused from base
│   │   └── skills/       # builtin songwriting skill seed content (markdown)
├── app/src-tauri/        # Tauri v2 shell; chat_send; PTY removed; claude_status
├── frontend/             # React + TanStack UI
│   └── src/
│       ├── routes/       # /, /presets, /song/$id, /skills, /chat, /settings
│       ├── components/   # StageChecklist, AIRunPanel, ChatPanel, GenerationPromptView, …
│       ├── music/        # PORTED from music-kb: lib/music/* + Composer/ChordLane/…
│       ├── ipc/          # Tauri command bindings + generated/ types + mockApi.ts
│       └── styles.css
├── mcp-shim/             # stdio MCP server over the shared DB (renamed server: songsmith)
└── resources/            # these six planning docs
```

## Build order

### Milestone 1: Fork the harness, reshape the domain
**Goal:** Boot the Songsmith shell with the YT domain removed.
- [ ] Fork `yt-creator-studio`; rename crates/identifiers/product name.
- [ ] Rename domain: brand_preset→style_preset, video→song, the 7 production stages → `concept/structure/chords/lyrics/prompt`. Remove the youtubei.js sidecar (not a video tool).
- [ ] Keep: Rust core skeleton, Claude agent (`call_claude`), Chat + mcp-shim, ts-rs, single stylesheet, `make install`.
**Done when:** `make dev` opens the app and an empty `/` Library renders; Chat connects to Claude.

### Milestone 2: Data layer
**Goal:** libSQL schema + CRUD through the core.
- [ ] Models + migrations (DDL below). Composition stored as a JSON artifact (kind=`composition`), journaled.
- [ ] Tauri commands for CRUD on each entity.
**Done when:** presets/songs/stages/artifacts/skills can be created and read from the UI.

### Milestone 3: Tool registry + MCP
**Goal:** One registry, three callers.
- [ ] Define `ToolSpec` rows (list below). Derive Tauri IPC, MCP listing, agent subset.
- [ ] Rename the MCP server `yt-studio`→`songsmith`; regenerate `mcp.json` in `chat_send`.
- [ ] Mock-parity test: every tool exists in `frontend/src/ipc/mockApi.ts`.
**Done when:** Claude (Chat or shim) can list and call tools (e.g. `create_song`, `list_songs`).

### Milestone 4: Style presets + new song + stage scaffolding
- [ ] Preset CRUD UI (`/presets`) with the style fields.
- [ ] "New song" creates a Song + ordered Stage rows (concept→prompt).
- [ ] `/song/$id` shows the StageChecklist seeded with the active preset.
**Done when:** creating a song shows its full stage checklist with the style preset attached.

### Milestone 5: run_stage engine (Claude) + skills
- [ ] `run_stage` (reuse base): load Skill + StylePreset + prior approved artifacts → call Claude → write artifact (composition revision for structure/chords/lyrics; text for concept/prompt). Streaming + inflight dedupe.
- [ ] AIRunPanel: run, stream, refine (chat), approve → advance + carry context.
- [ ] Seed builtin skills (markdown): concept, structure, chords, lyrics, prompt, plus a style-level skill.
**Done when:** a producer runs Concept→Structure and an approved artifact feeds the next stage; editing a skill changes the next run.

### Milestone 6: Port the music layer + the composer (Chords stage)
- [ ] Port music-kb `lib/music/*` (theory/diatonic/scales, compose types, colors/labels/playback, voicings, instruments, audio synth) into `frontend/src/music/`. Convert Tailwind → `styles.css`. Bring the `__tests__`.
- [ ] **Adapt `Composition`** from a single 8-bar sketch to **per-section** (sections[] each with chords/bass/melody/lyrics; song-level key+bpm).
- [ ] Chords stage center panel = the **Composer** (ChordLane + ChordPalette + BeatRuler per section) + instrument voicing views (Piano/Guitar/Bass/Push) + playback transport. Edits debounce into `save_composition`.
**Done when:** the Chords stage shows an editable, playable progression per section; changing key transposes everything.

### Milestone 7: Lyrics editor + Generation Prompt
- [ ] Lyrics stage = per-section LyricsEditor aligned to the section list; Claude fills, user edits.
- [ ] Generation Prompt stage = GenerationPromptView (style prompt + `[Section]`-tagged lyrics + copy button), tool-agnostic.
**Done when:** a full song mock (structure + chords + lyrics + prompt) is complete and the prompt copies clean.

### Milestone 8: Skills library + re-spin
- [ ] `/skills`: list/add/edit/enable; seed builtin + allow custom music skills.
- [ ] "Re-spin": clone a finished song into a new variation (carry concept/preset, reset later stages).
**Done when:** a custom skill changes the next run; a mock can be re-spun into a variant.

### Milestone 9: Settings + packaging
- [ ] `/settings`: Claude status, MCP panel, tool registry (reuse base).
- [ ] `make install` / `.dmg` (reuse base scripts).
**Done when:** a fresh machine with Claude Code can produce a song mock and build a `.dmg`.

## Data models (libSQL / SQLite-compatible DDL)
```sql
CREATE TABLE style_preset (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, genre TEXT, mood TEXT,
  influences TEXT, key_tempo_feel TEXT, vocal_range TEXT, themes TEXT,
  created_at TEXT, updated_at TEXT
);
CREATE TABLE song (
  id TEXT PRIMARY KEY, style_preset_id TEXT NOT NULL REFERENCES style_preset(id),
  title TEXT, status TEXT NOT NULL DEFAULT 'in_progress', current_stage TEXT,
  key_root TEXT, key_mode TEXT, bpm INTEGER, created_at TEXT, updated_at TEXT
);
CREATE INDEX idx_song_preset ON song(style_preset_id);
CREATE TABLE stage (
  id TEXT PRIMARY KEY, song_id TEXT NOT NULL REFERENCES song(id),
  type TEXT NOT NULL, ordinal INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', skill_id TEXT,
  created_at TEXT, updated_at TEXT, UNIQUE(song_id, type)
);
CREATE TABLE artifact (
  id TEXT PRIMARY KEY, song_id TEXT NOT NULL REFERENCES song(id),
  stage_id TEXT REFERENCES stage(id), kind TEXT NOT NULL, content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, approved INTEGER NOT NULL DEFAULT 0, created_at TEXT
);
CREATE INDEX idx_artifact_song ON artifact(song_id);
CREATE TABLE skill (
  id TEXT PRIMARY KEY, key TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  stage_type TEXT NOT NULL, instructions TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'builtin', enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT, updated_at TEXT
);
CREATE TABLE setting (key TEXT PRIMARY KEY, value TEXT);
```
Artifact `content` is JSON; the `composition` shape (degree+tick, per section) is in `05-tech-requirements.md`.

## Tools (registry — UI + agent + MCP)
`list_style_presets`, `get_style_preset`, `create_style_preset`, `update_style_preset`,
`create_song`, `list_songs`, `get_song`, `update_song_status`, `delete_song`*,
`get_stage`, `run_stage`, `approve_stage`, `advance_stage`,
`get_composition`, `save_composition`, `list_composition_revisions`, `revert_composition`,
`get_artifact`, `save_artifact`, `list_artifact_revisions`, `revert_artifact`,
`list_skills`, `get_skill`, `create_skill`, `update_skill`, `set_skill_enabled`,
`get_settings`, `set_settings`.
`*` = destructive, requires in-app confirmation. `run_stage` loads skill + style preset + prior approved artifacts (incl. the composition), calls Claude, writes the artifact.

## Pages & components
- `/` Library — SongList, StageProgressBadge, NewSongButton, StylePresetSwitcher.
- `/presets` — PresetList, PresetForm (genre, mood, influences, key/tempo, vocal range, themes).
- `/song/$id` — StageChecklist · stage-aware center (ConceptView · SectionListEditor · **Composer** · LyricsEditor · GenerationPromptView) + AIRunPanel · StyleContext; SeedInput, RevisionHistory, ConfirmDialog, instrument voicing views, playback transport.
- `/skills` — SkillList, SkillEditor.
- `/chat` — ChatPanel (Claude + MCP).
- `/settings` — ClaudeStatus, McpPanel, ToolRegistryView.

## Environment variables
- `CLAUDE_BIN` — optional `claude` CLI path override (else PATH / `~/.local/bin`).
- MCP per-install token — generated at first run, in the app data dir.
- (No inference endpoint/model — Claude is the engine.)

## POC acceptance criteria
- [ ] A producer can create a style preset.
- [ ] A producer can start a new song and see its stage checklist seeded with the preset.
- [ ] At each AI stage, `run_stage` produces an artifact using preset + prior approved artifacts as context, via Claude.
- [ ] The producer can refine (chat) and approve a stage; approval carries context forward.
- [ ] Structure produces sections; Chords opens an **editable, playable** per-section progression in the composer; changing key transposes.
- [ ] Lyrics fills per-section text; Generation Prompt outputs a tool-agnostic, section-tagged prompt that copies clean.
- [ ] A producer can enter a stage with their own seed (paste a loop/chorus/title).
- [ ] Custom skills can be added and change the next run; a mock can be re-spun into a variation.
- [ ] Claude (Chat or shim) can drive the same tools.
- [ ] `make install` installs the app; `make dmg` builds a `.dmg`.

## Open questions / parked items
- MIDI / stem export (play the composition straight into Ableton) — strong v2 candidate.
- Direct API to an AI music generator (vs copy/paste prompt) — later, tool-agnostic adapter.
- Melody/topline stage with the ported NoteLane — deferred (the AI generator makes melody in v1).
- Multi-user / collaboration / shared song mocks — v2.
- Semantic search over the song-mock library (reuse music-kb embeddings concept) — later.
