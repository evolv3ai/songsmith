# Tech Decisions

The architecture is a **direct fork of YT Creator Studio** (`yt-creator-studio`) — a Tauri v2 desktop app with a Rust core, a React/TanStack frontend, Claude as the single engine via the `claude` CLI + an MCP server. We **borrow the music-theory + chord-composer layer** from **music-kb**. For each decision: the choice, what else was considered, and why.

**Reference repositories:**
- YT Creator Studio (architecture base): `/Users/paul/programing/yt-creator-studio` — GPL-3.0.
- music-kb (music theory + compose editor + instrument rendering): `/Users/paul/programing/music-kb` — **GPL-3.0-or-later** (compatible — porting its code is clean).

## App shell
- **Choice:** Tauri v2 desktop app (`app/src-tauri`), macOS-first (macOS 11+).
- **Considered:** Electron; a pure web app (music-kb's TanStack Start stack).
- **Why:** Fork of YT Creator Studio. A desktop shell is required to spawn the `claude` CLI, manage the MCP shim, and ship an installable binary. Tauri is lean and already proven in the base.

## Core / state ownership
- **Choice:** A **Rust core** (`core/`) owns all state, the tool registry, the agent loop, and the MCP server. The frontend is a pure view layer; the Tauri shell wires core ↔ frontend.
- **Considered:** A Node/Strapi backend (music-kb's pattern).
- **Why:** Matches the YT base invariant "the Rust core owns all state." One source of truth; the tool registry is the single contract for UI + MCP + agent. music-kb's Strapi backend is the wrong weight for a single-user desktop app.

## The engine — Claude only (no local model)
- **Choice:** Claude is the **single engine**, driven through the **`claude` CLI headless** (`-p --output-format stream-json`). Stage **Run** buttons and the **Chat** tab both call Claude; the Chat attaches the app's **MCP server** so Claude can read/update song state. The user's Claude Code subscription is the auth — no API key, no keychain.
- **Considered:** A local OpenAI-compatible model (Ollama), as the YT base originally had and music-kb uses.
- **Why:** This is "Claude Code for songwriters" — the value is bringing the subscription's intelligence to co-writing. The YT project already removed its local path for exactly this reason (one engine, no model-config confusion). Songwriting quality benefits most from the frontier model.

## Frontend
- **Choice:** React + TanStack (Router/Query), single consolidated `styles.css`, terminal aesthetic, TypeScript types generated from Rust (ts-rs). Plus the **ported music layer** (below).
- **Considered:** music-kb's TanStack Start + Tailwind v4.
- **Why:** Direct reuse from the YT base. ts-rs keeps UI and core in sync. The composer's chord-block colors are the one place the monochrome terminal palette gains accent colors (degree coloring) — a deliberate, contained exception.

## Music theory & the chord/section composer (borrowed from music-kb)
- **Choice:** Port music-kb's **pure-TypeScript** `client/src/lib/music/*` — `theory` (diatonic, scales, parse-chord), `compose` (the tick/degree `Composition` model, labels, colors, playback), `theory/voicings` (piano/guitar/push), `instruments/*` (piano, guitar, bass, push, notation views), and `audio` (the Web Audio **preview synth**) — plus the compose components (`Composer`, `ChordLane`, `ChordPalette`, `NoteLane`, `BeatRuler`). Adapt the **`Composition`** model from a single 8-bar sketch to **one progression per song section**.
- **Considered:** Reimplementing music theory from scratch; a third-party music-theory npm lib.
- **Why:** music-kb already solved diatonic chords, degree-based transposable progressions, multi-instrument voicings, and a working timeline editor with playback — and it's GPL-compatible. Porting is far cheaper and battle-tested. The degree+tick model means changing key transposes a whole song for free.
- **Porting notes:** music-kb uses Tailwind; Songsmith uses one stylesheet — convert the components' Tailwind classes to `styles.css` rules. Chord playback uses the Web Audio API (no native audio needed). Bring the `__tests__` (e.g. `voicings.test.ts`) along.

## Tool & skill model (the harness)
- **Choice:** Two layers, identical to the YT base.
  - **Tools** = capabilities compiled into the Rust core as `ToolSpec` rows (one registry; UI, agent, and MCP all derive from it): create song, advance stage, save artifact/composition, read style preset, run stage, etc.
  - **Skills** = user-editable **songwriting methods** stored as data (markdown/prompt), loaded by the agent to run a stage. Builtin per stage + user-authored custom skills (genre structures, Nashville numbers, lyric techniques, prompt templates).
- **Why:** The proven one-registry pattern; splitting compiled tools from editable skill data lets users extend the writing method without recompiling.

## How Claude drives the app (MCP)
- **Choice:** The Rust core's registry is exposed over an **mcp-shim** (stdio MCP server that links the core and opens the same libSQL DB), exactly as in the YT base. The **Chat** tab spawns `claude` with a generated `mcp.json` pointing at the shim, so Claude calls the same tools the UI does. Destructive tools (e.g. delete song) require confirmation.
- **Why:** Proven integration spine; reuse the YT base's `mcp-shim` and chat wiring directly.

## Data storage
- **Choice:** Local **libSQL** (SQLite-compatible) in the app data dir, owned by the Rust core. The **song composition** (sections → chord/bass/melody spans + lyrics) is stored as **JSON** in a versioned artifact; edits are journaled (revisions/undo survive restarts).
- **Considered:** Plain SQLite; music-kb's Strapi/SQLite.
- **Why:** Single-user local-first; reuse the YT base's libSQL layer. The degree+tick composition JSON is small and self-contained. libSQL keeps a future sync path open.

## Chord playback & instrument rendering
- **Choice:** In-app **preview synth** via the Web Audio API (ported from music-kb `lib/music/audio`) for hearing a section/progression. Chords rendered for **guitar, piano, bass, Ableton (Push layout)** via the ported `instruments/*` views. **No full-song audio generation** — that's the external AI music tool.
- **Why:** Hearing the stub is core to composing; it's lightweight and local. Full audio is out of scope by design.

## Auth
- **Choice:** No accounts in v1. Single local user. Claude auth is the user's Claude Code login. The MCP endpoint uses a per-install token written to the app data dir (YT base pattern).
- **Why:** Matches single-user v1 and the base's "no accounts" principle.

## Build & packaging
- **Choice:** Rust 1.85+, Node 20+, cmake. `make dev` / `cargo tauri dev` for development; `make install` builds the `.app` and drops it into `/Applications`; `make dmg` for a distributable. Unsigned until Apple Developer secrets are added.
- **Why:** Reuse the YT base's packaging + the `scripts/install.sh` / `Makefile` it already has.

## Styling
- **Choice:** One consolidated stylesheet (tokens → base → components), terminal aesthetic, with an accent **degree-color palette** for chord blocks in the composer.
- **Why:** The YT base's single-stylesheet invariant; the composer is the one area that needs color, scoped to chord degrees.

## Licensing
- **Decision: GPL-3.0.** Both the YT base and music-kb are GPL-3.0(-or-later). Songsmith Studio forks the YT base and ports music-kb code directly, shipping open-source under **GPL-3.0**. No "write-clean" constraint — reuse freely; source-availability obligations on distribution are accepted.
