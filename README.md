# YT Creator Studio

**Claude Code for content creators.** A desktop cockpit that runs the whole YouTube
production workflow by bringing your **Claude subscription** to bear — over **one tool
registry** — with every stage's work saved and connected per channel.

Claude is the engine: it drives the workflow through the `claude` CLI + this app's MCP
server (the **Chat** tab), and powers the one-click stage runs. There is **no local
model** — the harness wraps Claude with creator skills, per-channel context, and a
structured production spec.

A single creator defines a reusable **brand preset** (niche, audience, voice,
monetization), starts a video, and walks a **production spec** — a stage checklist
(Idea → Trifecta → Script → Record → Edit → Launch → Upload). The AI produces each
artifact, the creator reviews/approves, and each approved output feeds the next stage.
The same tool registry is callable by the UI, a local agent loop, **and Claude over MCP**.

> Built fresh from the spec in [`docs/`](docs/). License: **GPL-3.0**.

## Architecture

```
yt-creator-studio/
├── core/              # Rust core — owns ALL state
│   └── src/
│       ├── models.rs  # BrandPreset, Video, Stage, Artifact, Skill, Settings (+ ts-rs)
│       ├── db.rs      # libSQL (SQLite-compatible) schema, migrations, CRUD, skill seed
│       ├── tools.rs   # ToolSpec registry + dispatch — one registry, three callers
│       ├── agent.rs   # run_stage: skill + preset + prior artifacts → model → artifact
│       └── skills/     # built-in CGE skill markdown, embedded at compile time
├── app/src-tauri/     # Tauri v2 shell — IPC commands, event streaming, state
├── frontend/          # React + TanStack (Router/Query), single styles.css
│   └── src/ipc/
│       ├── generated/  # TypeScript types generated from Rust (ts-rs) — never hand-edit
│       ├── api.ts      # typed wrappers over every command
│       └── mockApi.ts  # in-memory mock so the UI runs in a plain browser (mock-parity)
├── mcp-shim/          # stdio MCP server — lets Claude Code drive the same registry
├── sidecar/           # (Milestone 7) Node youtubei.js service
└── docs/              # the six planning docs this was built from
```

**Brand presets** can be hand-written or **auto-filled with AI**: type a channel name and
hit *✨ Auto-fill*, and the `generate_brand_preset` tool drafts the niche, audience, voice,
and monetization using the brand-level CGE skills (niche validator + monetization).

**Invariant:** the Rust core owns all state. The frontend is a pure view layer; the
Tauri shell and the MCP shim are thin layers over `core`. The tool registry in
`core/src/tools.rs` is the single contract shared by the UI, the agent loop, and MCP.

## Prerequisites

- Rust 1.85+ · Node 20+ · cmake
- **[Claude Code](https://claude.com/claude-code)** installed and signed in — it's the
  engine. Run `claude` once to authenticate. Settings shows the detected CLI status.

## Run

```bash
# install frontend deps (once)
cd frontend && npm install && cd ..

# launch the desktop app (starts Vite + the Tauri shell)
cd app/src-tauri && npx tauri dev
```

The frontend also runs standalone in a browser against the in-memory mock — useful for
UI work without the backend:

```bash
cd frontend && npm run dev   # http://localhost:5173
```

## Chat (the harness)

The **Chat** tab is the core surface: it runs `claude` headless with this app's MCP server
attached, so you talk to Claude and it reads and updates your workflow — list videos, run a
stage, draft and save an artifact, approve and advance — all via the shared tool registry,
streamed live. The MCP wiring is automatic. Stage buttons in the video workspace call Claude
the same way for one-click runs.

## YouTube data (sidecar)

The Idea stage can pull a muse video's title/author/transcript with the **fetch** button
— this calls the Node `youtubei.js` sidecar, which the app spawns automatically and caches
into `video_info_cache`. Manual paste remains the fallback. The sidecar is bundled into the
packaged app; in dev it's found at `sidecar/index.js` (run `npm install` in `sidecar/` once).

## Let Claude drive it (MCP)

The Chat tab does this for you. To also drive the harness from your own terminal:

```bash
cargo build -p mcp-shim
YT_STUDIO_DB="$HOME/Library/Application Support/com.ytcreatorstudio.desktop/yt-creator-studio.db" \
  claude mcp add yt-studio --scope user -- /path/to/target/release/mcp-shim
```

Claude can then `list_videos`, `create_brand_preset`, `run_stage`, `approve_stage`, etc.
— the exact same tools the UI uses. The **Settings** page shows the ready-to-run
command and the database path.

## Regenerating types

TypeScript types are generated from the Rust models — never hand-edit `frontend/src/ipc/generated/`.

```bash
cargo test -p yt_core export_bindings
```

A test (`cargo test -p yt_core --lib`) enforces **mock-parity**: every registry tool
must exist in `mockApi.ts`.

## Build status (vs. the spec's milestones)

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Scaffold (Tauri shell, Rust core, React/TanStack, single stylesheet, ts-rs) | ✅ |
| 2 | Data layer — libSQL schema, migrations, journaled artifact revisions, CRUD | ✅ |
| 3 | Tool registry + MCP — one registry, three callers; mock-parity test | ✅ |
| 4 | Presets + new video + stage scaffolding | ✅ |
| 5 | `run_stage` engine — Claude (streaming, approve→advance, carry context) | ✅ |
| 6 | Skills library — seeded CGE skills, edit/enable, used by `run_stage` | ✅ |
| 7 | youtubei.js Node sidecar (video info + transcript), spawned & cached by the core | ✅ |
| 8 | **Chat** — Claude headless + MCP, drives the workflow conversationally | ✅ |
| 9 | Settings + `.dmg`/`.app` packaging (unsigned); sidecar + mcp-shim bundled | ✅ |

All nine milestones are implemented. **Claude is the single engine** (the local-AI path
was removed): stage runs and the Chat tab both drive Claude over the harness MCP server;
the sidecar fetches & caches real YouTube data; and `tauri build` produces an installable
`.dmg`. Remaining polish (Apple code-signing/notarization, Windows/Linux) is post-v1.

## Packaging

```bash
cd app/src-tauri && ../../frontend/node_modules/.bin/tauri build
# → target/release/bundle/dmg/*.dmg  and  target/release/bundle/macos/*.app
```

The build is unsigned to start (add Apple Developer secrets to sign/notarize later).
The Node sidecar is bundled into the app's Resources so the packaged app fetches YouTube
data without a separate install; `node` must be on the user's PATH.
