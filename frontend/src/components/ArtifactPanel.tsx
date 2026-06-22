import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../ipc/api";
import type { Artifact } from "../ipc/generated";

function parse(content: string): { text: string; data: any } {
  try {
    const v = JSON.parse(content);
    if (v && typeof v === "object" && "text" in v) return { text: v.text ?? "", data: v.data ?? null };
    return { text: content, data: v };
  } catch {
    return { text: content, data: null };
  }
}

/** Render the structured payload per kind (titles, sections, chords, lyrics, prompt). */
function StructuredView({ data }: { data: any }) {
  if (!data || typeof data !== "object") return null;
  return (
    <div className="card" style={{ marginTop: 10 }}>
      <h3>Structured</h3>
      {data.title && (
        <div>
          <label>Title</label>
          <div>{data.title}</div>
          {Array.isArray(data.alternates) && <div className="faint">alts: {data.alternates.join(" · ")}</div>}
        </div>
      )}
      {Array.isArray(data.sections) && (
        <div>
          <label>Sections</label>
          {data.sections.map((s: any, i: number) => (
            <div key={i} className="faint">
              {s.label || s.type}
              {s.bars ? ` · ${s.bars} bars` : ""}
              {Array.isArray(s.chords) ? ` · ${s.chords.join(" ")}` : ""}
              {Array.isArray(s.lines) ? `: ${s.lines.slice(0, 1).join(" ")}…` : ""}
            </div>
          ))}
        </div>
      )}
      {data.stylePrompt && (
        <div>
          <label>Style prompt</label>
          <div>{data.stylePrompt}</div>
          {data.taggedLyrics && (
            <>
              <label>Tagged lyrics</label>
              <div className="artifact-text" style={{ maxHeight: 180 }}>{data.taggedLyrics}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ArtifactPanel({
  artifact,
  songId,
  stageId,
  onChanged,
}: {
  artifact: Artifact;
  songId: string;
  stageId: string;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const qc = useQueryClient();
  const { text, data } = parse(artifact.content);

  const revisions = useQuery({
    queryKey: ["revisions", stageId],
    queryFn: () => api.listArtifactRevisions(stageId),
    enabled: showHistory,
  });
  const saveEdit = useMutation({
    mutationFn: () => api.saveArtifact(songId, stageId, artifact.kind, JSON.stringify({ kind: artifact.kind, text: draft, data })),
    onSuccess: () => { setEditing(false); onChanged(); },
  });
  const revert = useMutation({
    mutationFn: (id: string) => api.revertArtifact(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["revisions", stageId] }); onChanged(); },
  });

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="badge">{artifact.kind}</span>
          <span className="faint">v{String(artifact.version)}</span>
          {artifact.approved && <span className="badge done">approved</span>}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="sm" onClick={() => setShowHistory((h) => !h)}>{showHistory ? "hide history" : "history"}</button>
          {!editing ? (
            <button className="sm" onClick={() => { setDraft(text); setEditing(true); }}>edit</button>
          ) : (
            <>
              <button className="sm ghost" onClick={() => setEditing(false)}>cancel</button>
              <button className="sm primary" onClick={() => saveEdit.mutate()}>save revision</button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} style={{ minHeight: "40vh" }} />
      ) : (
        <>
          <div className="artifact-text">{text || <span className="faint">(empty)</span>}</div>
          <StructuredView data={data} />
        </>
      )}

      {showHistory && (
        <div className="card" style={{ marginTop: 10 }}>
          <h3>Revision history</h3>
          {revisions.data?.map((rv) => (
            <div key={rv.id} className="list-item" style={{ marginBottom: 6 }}>
              <span>v{String(rv.version)} {rv.approved ? "· approved" : ""} <span className="faint">{rv.created_at.slice(0, 19).replace("T", " ")}</span></span>
              <button className="sm" onClick={() => revert.mutate(rv.id)}>restore</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
