//! Tauri shell: wires the Rust core to the React frontend over IPC commands and
//! streams long-running stage runs back as events. The core owns all state.
//! Claude (the user's Claude Code subscription) is the engine, via the CLI + MCP.

use libsql::Connection;
use std::collections::HashSet;
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};
use song_core::models::*;
use song_core::{agent, db, tools};

struct AppState {
    conn: Connection,
    db_path: String,
    /// stage ids with an in-flight run, to dedupe concurrent requests.
    inflight: Mutex<HashSet<String>>,
}

type R<T> = Result<T, String>;
fn e2s<E: std::fmt::Display>(e: E) -> String {
    e.to_string()
}

// ---- Style presets ---------------------------------------------------------

#[tauri::command]
async fn list_style_presets(state: State<'_, AppState>) -> R<Vec<StylePreset>> {
    db::list_presets(&state.conn).await.map_err(e2s)
}
#[tauri::command]
async fn get_style_preset(state: State<'_, AppState>, id: String) -> R<Option<StylePreset>> {
    db::get_preset(&state.conn, &id).await.map_err(e2s)
}
#[tauri::command]
async fn create_style_preset(state: State<'_, AppState>, input: StyleInput) -> R<StylePreset> {
    db::create_preset(&state.conn, input).await.map_err(e2s)
}
#[tauri::command]
async fn update_style_preset(state: State<'_, AppState>, id: String, input: StyleInput) -> R<StylePreset> {
    db::update_preset(&state.conn, &id, input).await.map_err(e2s)
}

/// Auto-generate a style preset from a name/seed. Streams `preset_token` events.
#[tauri::command]
async fn generate_style_preset(app: tauri::AppHandle, state: State<'_, AppState>, name: String, notes: Option<String>) -> R<StyleInput> {
    let settings = db::get_settings(&state.conn).await.map_err(e2s)?;
    agent::generate_style_preset(&state.conn, &settings, &name, notes.as_deref(), move |tok| {
        let _ = app.emit("preset_token", serde_json::json!({ "token": tok }));
    })
    .await
    .map_err(e2s)
}

// ---- Songs & stages --------------------------------------------------------

#[tauri::command]
async fn create_song(state: State<'_, AppState>, style_preset_id: String, title: String) -> R<Song> {
    db::create_song(&state.conn, &style_preset_id, &title).await.map_err(e2s)
}
#[tauri::command]
async fn list_songs(state: State<'_, AppState>) -> R<Vec<Song>> {
    db::list_songs(&state.conn).await.map_err(e2s)
}
#[tauri::command]
async fn get_song(state: State<'_, AppState>, id: String) -> R<Option<SongDetail>> {
    db::get_song_detail(&state.conn, &id).await.map_err(e2s)
}
#[tauri::command]
async fn update_song_status(state: State<'_, AppState>, id: String, status: String) -> R<Song> {
    db::update_song_status(&state.conn, &id, &status).await.map_err(e2s)
}
#[tauri::command]
async fn delete_song(state: State<'_, AppState>, id: String) -> R<()> {
    db::delete_song(&state.conn, &id).await.map_err(e2s)
}
#[tauri::command]
async fn get_stage(state: State<'_, AppState>, id: String) -> R<Option<StageDetail>> {
    db::get_stage_detail(&state.conn, &id).await.map_err(e2s)
}

/// Run a stage. Streams `stage_token` then a final `stage_done`. Deduped.
#[tauri::command]
async fn run_stage(app: tauri::AppHandle, state: State<'_, AppState>, stage_id: String, user_input: Option<String>) -> R<Artifact> {
    {
        let mut set = state.inflight.lock().unwrap();
        if set.contains(&stage_id) {
            return Err("This stage is already running.".into());
        }
        set.insert(stage_id.clone());
    }
    let settings = db::get_settings(&state.conn).await.map_err(e2s)?;
    let app2 = app.clone();
    let sid = stage_id.clone();
    let result = agent::run_stage(&state.conn, &settings, &stage_id, user_input, move |tok| {
        let _ = app2.emit("stage_token", serde_json::json!({ "stage_id": sid, "token": tok }));
    })
    .await;
    state.inflight.lock().unwrap().remove(&stage_id);
    let outcome = result.map_err(e2s)?;
    let _ = app.emit("stage_done", serde_json::json!({ "stage_id": stage_id, "artifact_id": outcome.artifact.id }));
    Ok(outcome.artifact)
}

#[tauri::command]
async fn approve_stage(state: State<'_, AppState>, stage_id: String) -> R<serde_json::Value> {
    tools::approve_stage(&state.conn, &stage_id).await.map_err(e2s)
}
#[tauri::command]
async fn advance_stage(state: State<'_, AppState>, song_id: String) -> R<serde_json::Value> {
    tools::advance_song(&state.conn, &song_id).await.map_err(e2s)
}

// ---- Artifacts -------------------------------------------------------------

#[tauri::command]
async fn get_artifact(state: State<'_, AppState>, id: String) -> R<Option<Artifact>> {
    db::get_artifact(&state.conn, &id).await.map_err(e2s)
}
#[tauri::command]
async fn save_artifact(state: State<'_, AppState>, song_id: String, stage_id: Option<String>, kind: String, content: String) -> R<Artifact> {
    db::save_artifact(&state.conn, &song_id, stage_id.as_deref(), &kind, &content).await.map_err(e2s)
}
#[tauri::command]
async fn list_artifact_revisions(state: State<'_, AppState>, stage_id: String) -> R<Vec<Artifact>> {
    db::list_artifact_revisions(&state.conn, &stage_id).await.map_err(e2s)
}
#[tauri::command]
async fn revert_artifact(state: State<'_, AppState>, artifact_id: String) -> R<Artifact> {
    db::revert_artifact(&state.conn, &artifact_id).await.map_err(e2s)
}

// ---- Skills ----------------------------------------------------------------

#[tauri::command]
async fn list_skills(state: State<'_, AppState>) -> R<Vec<Skill>> {
    db::list_skills(&state.conn).await.map_err(e2s)
}
#[tauri::command]
async fn get_skill(state: State<'_, AppState>, id: String) -> R<Option<Skill>> {
    db::get_skill(&state.conn, &id).await.map_err(e2s)
}
#[tauri::command]
async fn create_skill(state: State<'_, AppState>, input: SkillInput) -> R<Skill> {
    db::create_skill(&state.conn, input).await.map_err(e2s)
}
#[tauri::command]
async fn update_skill(state: State<'_, AppState>, id: String, input: SkillInput) -> R<Skill> {
    db::update_skill(&state.conn, &id, input).await.map_err(e2s)
}
#[tauri::command]
async fn set_skill_enabled(state: State<'_, AppState>, id: String, enabled: bool) -> R<Skill> {
    db::set_skill_enabled(&state.conn, &id, enabled).await.map_err(e2s)
}

// ---- Saved progressions ----------------------------------------------------

#[tauri::command]
async fn list_progressions(state: State<'_, AppState>) -> R<Vec<Progression>> {
    db::list_progressions(&state.conn).await.map_err(e2s)
}
#[tauri::command]
async fn save_progression(state: State<'_, AppState>, name: String, chords: Vec<String>) -> R<Progression> {
    db::create_progression(&state.conn, &name, &chords).await.map_err(e2s)
}
#[tauri::command]
async fn delete_progression(state: State<'_, AppState>, id: String) -> R<()> {
    db::delete_progression(&state.conn, &id).await.map_err(e2s)
}

// ---- Final renders ---------------------------------------------------------

#[tauri::command]
async fn list_renders(state: State<'_, AppState>, song_id: String) -> R<Vec<Render>> {
    db::list_renders(&state.conn, &song_id).await.map_err(e2s)
}
#[tauri::command]
async fn add_render(state: State<'_, AppState>, song_id: String, label: String, file_path: String, source: String, notes: String) -> R<Render> {
    db::create_render(&state.conn, &song_id, &label, &file_path, &source, &notes).await.map_err(e2s)
}
#[tauri::command]
async fn set_render_pick(state: State<'_, AppState>, id: String, is_pick: bool) -> R<()> {
    db::set_render_pick(&state.conn, &id, is_pick).await.map_err(e2s)
}
#[tauri::command]
async fn delete_render(state: State<'_, AppState>, id: String) -> R<()> {
    db::delete_render(&state.conn, &id).await.map_err(e2s)
}

// ---- Settings & meta -------------------------------------------------------

#[tauri::command]
async fn get_settings(state: State<'_, AppState>) -> R<Settings> {
    db::get_settings(&state.conn).await.map_err(e2s)
}
#[tauri::command]
async fn set_settings(state: State<'_, AppState>, settings: Settings) -> R<Settings> {
    db::set_settings(&state.conn, &settings).await.map_err(e2s)?;
    Ok(settings)
}
#[tauri::command]
fn list_tools() -> Vec<serde_json::Value> {
    tools::registry().into_iter().map(|t| serde_json::json!({ "name": t.name, "description": t.description, "destructive": t.destructive })).collect()
}
#[tauri::command]
async fn mcp_config(state: State<'_, AppState>) -> R<serde_json::Value> {
    let token = db::ensure_mcp_token(&state.conn).await.map_err(e2s)?;
    Ok(serde_json::json!({
        "db_path": state.db_path, "token": token,
        "command_hint": format!("SONGSMITH_DB=\"{}\" claude mcp add songsmith --scope user -- /path/to/mcp-shim", state.db_path),
    }))
}

fn find_claude() -> Option<std::path::PathBuf> {
    if let Ok(p) = std::env::var("CLAUDE_BIN") {
        let p = std::path::PathBuf::from(p);
        if p.exists() { return Some(p); }
    }
    let home = std::env::var("HOME").unwrap_or_default();
    for c in [format!("{home}/.local/bin/claude"), "/opt/homebrew/bin/claude".into(), "/usr/local/bin/claude".into(), "/usr/bin/claude".into()] {
        let p = std::path::PathBuf::from(&c);
        if p.exists() { return Some(p); }
    }
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into());
    if let Ok(out) = std::process::Command::new(shell).args(["-lc", "command -v claude"]).output() {
        let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if !path.is_empty() && std::path::Path::new(&path).exists() {
            return Some(path.into());
        }
    }
    None
}

fn find_shim(resource_dir: Option<std::path::PathBuf>) -> Option<std::path::PathBuf> {
    let mut c: Vec<std::path::PathBuf> = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        if let Some(d) = exe.parent() { c.push(d.join("mcp-shim")); }
    }
    if let Some(r) = resource_dir { c.push(r.join("mcp-shim")); }
    for p in ["target/debug/mcp-shim", "target/release/mcp-shim", "../target/debug/mcp-shim", "../../target/debug/mcp-shim", "../../target/release/mcp-shim"] {
        c.push(std::path::PathBuf::from(p));
    }
    c.into_iter().find(|p| p.exists())
}

fn ensure_mcp_config(app: &tauri::AppHandle, db_path: &str) -> Result<std::path::PathBuf, String> {
    let shim = find_shim(app.path().resource_dir().ok()).ok_or("mcp-shim binary not found")?;
    let cfg = serde_json::json!({ "mcpServers": { "songsmith": { "command": shim.to_string_lossy(), "env": { "SONGSMITH_DB": db_path } } } });
    let dir = std::path::Path::new(db_path).parent().ok_or("bad db path")?;
    let path = dir.join("mcp.json");
    std::fs::write(&path, serde_json::to_vec_pretty(&cfg).unwrap()).map_err(e2s)?;
    Ok(path)
}

#[tauri::command]
fn mcp_setup_command(app: tauri::AppHandle, state: State<'_, AppState>) -> serde_json::Value {
    let Some(shim) = find_shim(app.path().resource_dir().ok()) else {
        return serde_json::json!({ "available": false });
    };
    let shim = shim.to_string_lossy().to_string();
    let db = &state.db_path;
    let command = format!(
        "chmod +x \"{shim}\" 2>/dev/null; claude mcp get songsmith >/dev/null 2>&1 || \
         claude mcp add songsmith --scope user --env \"SONGSMITH_DB={db}\" -- \"{shim}\""
    );
    serde_json::json!({ "available": true, "shim_path": shim, "command": command })
}

/// Chat with Claude headless + the harness MCP server. Streams `chat_event`.
#[tauri::command]
async fn chat_send(app: tauri::AppHandle, state: State<'_, AppState>, message: String, session_id: Option<String>) -> R<String> {
    let claude = find_claude().ok_or("The `claude` CLI was not found. Install Claude Code and sign in.")?;
    let cfg = ensure_mcp_config(&app, &state.db_path)?;
    let resuming = session_id.is_some();
    let sid = session_id.unwrap_or_else(song_core::db::new_id);

    let mut args: Vec<String> = vec![
        "-p".into(), message,
        "--output-format".into(), "stream-json".into(), "--verbose".into(),
        "--mcp-config".into(), cfg.to_string_lossy().to_string(),
        "--allowedTools".into(), "mcp__songsmith".into(),
        "--disallowedTools".into(), "mcp__songsmith__delete_song".into(),
        "--permission-mode".into(), "acceptEdits".into(),
        "-n".into(), "songsmith".into(),
    ];
    if resuming { args.push("--resume".into()); args.push(sid.clone()); }
    else { args.push("--session-id".into()); args.push(sid.clone()); }

    let app2 = app.clone();
    let sid2 = sid.clone();
    let result = tokio::task::spawn_blocking(move || -> Result<(), String> {
        use std::io::BufRead;
        let mut child = std::process::Command::new(claude)
            .args(&args)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| format!("could not start claude: {e}"))?;
        let stdout = child.stdout.take().unwrap();
        for line in std::io::BufReader::new(stdout).lines() {
            let Ok(line) = line else { break };
            if line.trim().is_empty() { continue; }
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&line) {
                let _ = app2.emit("chat_event", serde_json::json!({ "session_id": sid2, "event": v }));
            }
        }
        let status = child.wait().map_err(e2s)?;
        if !status.success() {
            let mut err = String::new();
            if let Some(mut se) = child.stderr.take() {
                use std::io::Read;
                let _ = se.read_to_string(&mut err);
            }
            return Err(if err.is_empty() { "claude exited with an error".into() } else { err });
        }
        Ok(())
    })
    .await
    .map_err(e2s)?;

    match result {
        Ok(()) => { let _ = app.emit("chat_done", serde_json::json!({ "session_id": sid })); Ok(sid) }
        Err(e) => { let _ = app.emit("chat_error", serde_json::json!({ "session_id": sid, "error": e })); Err(e) }
    }
}

fn ensure_claude_bin(conn: &Connection) {
    let Ok(mut s) = tauri::async_runtime::block_on(db::get_settings(conn)) else { return };
    if !s.claude_bin.is_empty() && std::path::Path::new(&s.claude_bin).exists() { return; }
    if let Some(p) = find_claude() {
        s.claude_bin = p.to_string_lossy().to_string();
        let _ = tauri::async_runtime::block_on(db::set_settings(conn, &s));
    }
}

#[tauri::command]
async fn claude_status(state: State<'_, AppState>) -> R<serde_json::Value> {
    let s = db::get_settings(&state.conn).await.map_err(e2s)?;
    let bin = find_claude();
    let found = bin.is_some();
    let version = tokio::task::spawn_blocking(move || {
        bin.and_then(|b| std::process::Command::new(b).arg("--version").output().ok().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()))
    })
    .await
    .unwrap_or(None);
    Ok(serde_json::json!({ "found": found, "version": version, "model": s.claude_model, "bin": s.claude_bin }))
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_data_dir().expect("app data dir");
            std::fs::create_dir_all(&dir).ok();
            let db_path = dir.join("songsmith-studio.db");
            let db_path_str = db_path.to_string_lossy().to_string();

            let database = tauri::async_runtime::block_on(song_core::db::open(&db_path)).expect("open database");
            let conn = database.connect().expect("connect database");
            std::mem::forget(database);

            ensure_claude_bin(&conn);
            app.manage(AppState { conn, db_path: db_path_str, inflight: Mutex::new(HashSet::new()) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_style_presets,
            get_style_preset,
            create_style_preset,
            update_style_preset,
            generate_style_preset,
            create_song,
            list_songs,
            get_song,
            update_song_status,
            delete_song,
            get_stage,
            run_stage,
            approve_stage,
            advance_stage,
            get_artifact,
            save_artifact,
            list_artifact_revisions,
            revert_artifact,
            list_skills,
            get_skill,
            create_skill,
            update_skill,
            set_skill_enabled,
            list_progressions,
            save_progression,
            delete_progression,
            list_renders,
            add_render,
            set_render_pick,
            delete_render,
            get_settings,
            set_settings,
            list_tools,
            mcp_config,
            mcp_setup_command,
            claude_status,
            chat_send,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
