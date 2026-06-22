import { useMemo, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, STAGE_LABELS } from "../ipc/api";
import type { Stage } from "../ipc/generated";
import { StageChecklist } from "../components/StageChecklist";
import { ArtifactPanel } from "../components/ArtifactPanel";
import { AIRunPanel } from "../components/AIRunPanel";
import { Composer } from "../components/Composer";
import { LyricsEditor } from "../components/LyricsEditor";
import { StageChat } from "../components/StageChat";
import { FinalRenders } from "../components/FinalRenders";
import { SongSheet } from "../components/SongSheet";

function artifactData(content: string): any {
  try {
    const v = JSON.parse(content);
    return v?.data ?? null;
  } catch {
    return null;
  }
}

export function SongWorkspace() {
  const { id } = useParams({ from: "/song/$id" });
  const nav = useNavigate();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<"workspace" | "sheet">("workspace");

  const song = useQuery({ queryKey: ["song", id], queryFn: () => api.getSong(id) });
  const currentType = song.data?.song.current_stage ?? "concept";
  const activeStageId = useMemo(() => {
    if (!song.data) return null;
    if (selectedId) return selectedId;
    return song.data.stages.find((s) => s.type === currentType)?.id ?? song.data.stages[0]?.id ?? null;
  }, [song.data, selectedId, currentType]);

  const stage = useQuery({
    queryKey: ["stage", activeStageId],
    queryFn: () => api.getStage(activeStageId!),
    enabled: !!activeStageId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["song", id] });
    qc.invalidateQueries({ queryKey: ["stage", activeStageId] });
    qc.invalidateQueries({ queryKey: ["songs"] });
  };
  const setStatus = useMutation({ mutationFn: (s: string) => api.updateSongStatus(id, s), onSuccess: invalidate });
  const del = useMutation({
    mutationFn: () => api.deleteSong(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["songs"] }); nav({ to: "/" }); },
  });

  if (song.isLoading) return <div className="empty">Loading…</div>;
  if (!song.data) return <div className="empty">Song not found.</div>;
  const v = song.data.song;
  const preset = song.data.preset;
  const sd = stage.data;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>{v.title || "Untitled song"}</h1>
          <div className="row" style={{ gap: 8 }}>
            <span className={"badge " + v.status}>{v.status.replace("_", " ")}</span>
            <span className="faint">{preset.name} · {v.key_root} {v.key_mode} · {String(v.bpm)} BPM</span>
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {v.status !== "done" ? (
            <button className="primary" onClick={() => setStatus.mutate("done")}>Mark done</button>
          ) : (
            <button onClick={() => setStatus.mutate("in_progress")}>Reopen</button>
          )}
          <button className="danger" onClick={() => setConfirmDelete(true)}>Delete</button>
        </div>
      </div>

      <div className="row" style={{ gap: 6, marginBottom: 12 }}>
        <button className={"sm" + (tab === "workspace" ? " primary" : "")} onClick={() => setTab("workspace")}>Workspace</button>
        <button className={"sm" + (tab === "sheet" ? " primary" : "")} onClick={() => setTab("sheet")}>Sheet / play-along</button>
      </div>

      {tab === "workspace" && (
      <>
      <div className="workspace">
        <StageChecklist stages={song.data.stages} currentType={currentType} selectedId={activeStageId} onSelect={(s: Stage) => setSelectedId(s.id)} />

        <div className="pane">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <h2>{sd ? STAGE_LABELS[sd.stage.type] : "Stage"}</h2>
            {sd?.skill && <span className="faint">skill: {sd.skill.name}</span>}
          </div>
          {stage.isLoading && <div className="empty">Loading stage…</div>}
          {sd && !sd.artifact && (
            <div className="banner">
              No artifact yet. Run this stage to co-write the <b>{STAGE_LABELS[sd.stage.type]}</b> using the style preset and prior approved stages as context.
            </div>
          )}
          {sd?.artifact && sd.stage.type === "chords" ? (
            <Composer
              songId={id}
              stageId={sd.stage.id}
              kind={sd.artifact.kind}
              artifactId={sd.artifact.id}
              keyRoot={v.key_root}
              keyMode={v.key_mode}
              initialData={artifactData(sd.artifact.content)}
              onChanged={invalidate}
            />
          ) : sd?.artifact && sd.stage.type === "lyrics" ? (
            <LyricsEditor
              songId={id}
              stageId={sd.stage.id}
              kind={sd.artifact.kind}
              artifactId={sd.artifact.id}
              content={sd.artifact.content}
              onChanged={invalidate}
            />
          ) : (
            sd?.artifact && <ArtifactPanel artifact={sd.artifact} songId={id} stageId={sd.stage.id} onChanged={invalidate} />
          )}
          {sd && (
            <AIRunPanel stageId={sd.stage.id} stageType={sd.stage.type} hasArtifact={!!sd.artifact} approved={!!sd.artifact?.approved} onChanged={invalidate} />
          )}
          {sd && (
            <StageChat
              songId={id}
              stageId={sd.stage.id}
              stageType={sd.stage.type}
              kind={sd.artifact?.kind ?? (sd.stage.type === "prompt" ? "generation_prompt" : sd.stage.type)}
              content={sd.artifact?.content ?? null}
              keyRoot={v.key_root}
              keyMode={v.key_mode}
              onChanged={invalidate}
            />
          )}
        </div>

        <div className="pane">
          <h3>Style context</h3>
          <div className="col" style={{ gap: 10 }}>
            {[["Genre", preset.genre], ["Mood", preset.mood], ["Influences", preset.influences], ["Key / tempo", preset.key_tempo_feel], ["Vocal range", preset.vocal_range], ["Themes", preset.themes]].map(([k, val]) => (
              <div key={k}><label>{k}</label><div className="faint">{val || "—"}</div></div>
            ))}
          </div>
          <hr />
          <p className="faint">Approved outputs from earlier stages carry forward as context to the stage you run.</p>
        </div>
      </div>

      <FinalRenders songId={id} />
      </>
      )}
      {tab === "sheet" && (
        <SongSheet
          title={v.title || "Untitled song"}
          subtitle={`${preset.name} · ${v.key_root} ${v.key_mode} · ${String(v.bpm)} BPM`}
          keyRoot={v.key_root}
          keyMode={v.key_mode}
          stages={song.data.stages}
        />
      )}

      {confirmDelete && (
        <div className="modal-bg" onClick={() => setConfirmDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete this song?</h2>
            <p className="muted">This permanently removes the song and all its stages and artifacts.</p>
            <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
              <button className="ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
              <button className="danger" onClick={() => del.mutate()}>Delete permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
