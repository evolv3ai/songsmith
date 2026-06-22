//! Data models for Songsmith Studio.
//!
//! These mirror the libSQL schema in `db.rs` and are the single source of truth
//! for the TypeScript types used by the frontend (generated via ts-rs).

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// The five stages of a song spec, in order.
pub const STAGE_ORDER: [&str; 5] = ["concept", "structure", "chords", "lyrics", "prompt"];

/// Human-readable label for a stage type.
pub fn stage_label(stage_type: &str) -> &'static str {
    match stage_type {
        "concept" => "Concept",
        "structure" => "Structure",
        "chords" => "Chords",
        "lyrics" => "Lyrics",
        "prompt" => "Generation Prompt",
        _ => "Stage",
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/ipc/generated/")]
pub struct StylePreset {
    pub id: String,
    pub name: String,
    pub genre: String,
    pub mood: String,
    pub influences: String,
    pub key_tempo_feel: String,
    pub vocal_range: String,
    pub themes: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/ipc/generated/")]
pub struct Song {
    pub id: String,
    pub style_preset_id: String,
    pub title: String,
    /// `in_progress` | `done` | `archived`
    pub status: String,
    pub current_stage: String,
    pub key_root: String,
    /// `major` | `minor`
    pub key_mode: String,
    pub bpm: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/ipc/generated/")]
pub struct Stage {
    pub id: String,
    pub song_id: String,
    /// concept | structure | chords | lyrics | prompt
    pub r#type: String,
    pub ordinal: i64,
    /// `pending` | `in_progress` | `done`
    pub status: String,
    pub skill_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/ipc/generated/")]
pub struct Artifact {
    pub id: String,
    pub song_id: String,
    pub stage_id: Option<String>,
    /// concept | structure | chords | lyrics | generation_prompt | composition
    pub kind: String,
    /// JSON payload (shape depends on `kind`).
    pub content: String,
    pub version: i64,
    pub approved: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/ipc/generated/")]
pub struct Skill {
    pub id: String,
    pub key: String,
    pub name: String,
    pub stage_type: String,
    pub instructions: String,
    /// `builtin` | `user`
    pub source: String,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// App settings. Claude (the user's Claude Code subscription) is the engine —
/// no local model. `claude_model` is an optional override (empty = default);
/// `claude_bin` is the resolved CLI path (empty = `claude` on PATH).
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/ipc/generated/")]
pub struct Settings {
    pub claude_model: String,
    pub claude_bin: String,
    pub mcp_token: String,
}

impl Default for Settings {
    fn default() -> Self {
        Settings { claude_model: String::new(), claude_bin: String::new(), mcp_token: String::new() }
    }
}

// ---- Input DTOs (frontend -> core) -----------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/ipc/generated/")]
pub struct StyleInput {
    pub name: String,
    pub genre: String,
    pub mood: String,
    pub influences: String,
    pub key_tempo_feel: String,
    pub vocal_range: String,
    pub themes: String,
}

/// A final generated audio version of a song, referenced by file path on disk
/// (never stored in the DB). A song can have many — Suno/Udio/Ableton takes.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/ipc/generated/")]
pub struct Render {
    pub id: String,
    pub song_id: String,
    pub label: String,
    pub file_path: String,
    pub source: String,
    pub notes: String,
    pub is_pick: bool,
    pub created_at: String,
}

/// A saved, reusable chord progression (built in the Chord Builder) that can be
/// imported into any song section.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/ipc/generated/")]
pub struct Progression {
    pub id: String,
    pub name: String,
    /// ordered chord names, e.g. ["Am","F","C","G"]
    pub chords: Vec<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/ipc/generated/")]
pub struct SkillInput {
    pub key: String,
    pub name: String,
    pub stage_type: String,
    pub instructions: String,
}

/// A stage plus its current artifact, returned together for the workspace view.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/ipc/generated/")]
pub struct StageDetail {
    pub stage: Stage,
    pub artifact: Option<Artifact>,
    pub skill: Option<Skill>,
}

/// A song plus its style preset and ordered stages, for the workspace.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../frontend/src/ipc/generated/")]
pub struct SongDetail {
    pub song: Song,
    pub preset: StylePreset,
    pub stages: Vec<Stage>,
}
