# Songsmith on DELTABOT (Windows)

Notes for this specific Windows checkout at `D:\songsmith`. Upstream is macOS-first, so a couple of extra steps are required before the Rust workspace builds.

## One-time setup that was done on 2026-07-16

1. **Rust toolchain** — was 1.76, upgraded to stable 1.97.1:
   ```powershell
   rustup update stable
   ```

2. **Frontend deps**:
   ```powershell
   cd D:\songsmith\frontend
   npm install
   ```

3. **Build `mcp-shim` in release, then copy it to an extensionless name.**
   `tauri.conf.json` references `../../target/release/mcp-shim` (no `.exe`) as a bundled resource. Windows produces `mcp-shim.exe`, so Tauri can't find it.
   ```powershell
   cd D:\songsmith
   cargo build -p mcp-shim --release
   Copy-Item -Force target\release\mcp-shim.exe target\release\mcp-shim
   ```
   Any `cargo clean` requires re-running both lines.

4. **Generate Windows icons.** `tauri-build` needs `icon.ico` on Windows. This branch already commits `icon.ico` and the `Square*.png` set, so skip on a `deltabot` checkout. Only needed if starting from upstream `main`:
   ```powershell
   cd D:\songsmith\app\src-tauri
   ..\..\frontend\node_modules\.bin\tauri icon icons/icon.png
   ```

5. **Build the workspace** (should succeed after 1–4):
   ```powershell
   cd D:\songsmith
   cargo build --workspace
   ```

## Running the app

Two ways, both work. Neither uses `make` — WSL is fine but the Windows shell is more direct here.

**Tauri dev (hot-reload frontend):**
```powershell
cd D:\songsmith\app\src-tauri
..\..\frontend\node_modules\.bin\tauri dev
```
Vite starts on `http://localhost:5173`, the native window opens automatically. Close the window to stop.

**Frontend-only against the mock (no Rust backend):**
```powershell
cd D:\songsmith\frontend
npm run dev
```
Useful for UI work in a browser tab.

## Data locations on Windows

The Tauri app resolves its data dir via `app_data_dir()`, which on Windows is:

```
C:\Users\Owner\AppData\Roaming\com.songsmithstudio.desktop\
  └── songsmith-studio.db      (libSQL — all song state)
```

**Careful:** `mcp-shim/src/main.rs` hardcodes the macOS path (`~/Library/Application Support/…`) as its default when `SONGSMITH_DB` isn't set. If you want Claude to drive Songsmith standalone (not through the app), you **must** pass the Windows path explicitly:

```powershell
$env:SONGSMITH_DB = "$env:APPDATA\com.songsmithstudio.desktop\songsmith-studio.db"
claude mcp add songsmith --scope user -- D:\songsmith\target\release\mcp-shim.exe
```

The in-app **Settings → MCP** panel generates the right command with the right path — copy from there rather than typing it.

## Claude engine

Songsmith calls the `claude` CLI headless (stream-json). Any `claude` on PATH will do; DELTABOT has 2.1.211. Sign in once with `claude` in a normal shell.

## Prereqs (already installed on DELTABOT)

- Rust ≥1.85 (currently 1.97.1) via rustup
- Node ≥20 (currently 24.17.0) — winget
- cmake ≥3.10 (currently 4.3.2) — winget
- `claude` CLI signed in

## REAPER Arrange stage skill (deltabot addition)

This branch adds a `reaper` stage skill (`core/src/skills/reaper.md`, seeded in `SEED_SKILLS`) that mirrors the shipped `ableton` skill but drives REAPER through the ReaClaw MCP server (see [evolv3ai/reaclaw@deltabot](https://github.com/evolv3ai/reaclaw/tree/deltabot)). Enabled by default, appears in the app's skills list under **REAPER Arrange**.

**MCP wiring caveat.** Upstream Songsmith hard-codes exactly one "extra" MCP slot named `ableton` in `app/src-tauri/src/lib.rs:266`. Until we add a proper `reaper` slot, plug ReaClaw into the `ableton` slot in Settings → MCP — the tools will be exposed to Claude as `mcp__ableton__reaper_*`, and the skill discovers the prefix dynamically. The right long-term fix is either (a) generalize the extra-slot handling to accept any name, or (b) add a second hard-coded `reaper` slot. Neither is on this branch yet.

**Testing the skill:** create a new song, walk through Concept → Structure → Chords → Lyrics, then on a `reaper`-typed stage select **REAPER Arrange**. With REAPER + ReaClaw running (see the reaclaw fork's DELTABOT_README), Claude will build a tempo/marker/tracks/chord-clip skeleton.

## Known upstream quirks worth patching if we stay on this fork

- `tauri.conf.json` resource path should be platform-aware (`mcp-shim.exe` on Windows, `mcp-shim` on macOS/Linux) — right now the extensionless copy hack is what fixes it.
- `mcp-shim/src/main.rs` default DB path is macOS-only.
- Neither `Makefile` nor `scripts/install.sh` has a Windows equivalent.
- Extra-MCP handling only supports one slot named `ableton` — should either be generalized to accept a map of named servers, or a second `reaper` slot added, so the REAPER Arrange skill's tools are exposed under an honest prefix.
