import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../ipc/api";
import type { Stage } from "../ipc/generated";
import { songSheetSvg, downloadPng } from "../music/diagrams";

function dataOf(content: string | undefined): any {
  if (!content) return null;
  try {
    const v = JSON.parse(content);
    return v?.data ?? null;
  } catch {
    return null;
  }
}

export function SongSheet({
  title, subtitle, stages,
}: {
  title: string; subtitle: string; stages: Stage[];
}) {
  const [open, setOpen] = useState(false);
  const chordsStage = stages.find((s) => s.type === "chords");
  const lyricsStage = stages.find((s) => s.type === "lyrics");

  const chords = useQuery({ queryKey: ["stage", chordsStage?.id], queryFn: () => api.getStage(chordsStage!.id), enabled: open && !!chordsStage });
  const lyrics = useQuery({ queryKey: ["stage", lyricsStage?.id], queryFn: () => api.getStage(lyricsStage!.id), enabled: open && !!lyricsStage });

  const sheet = useMemo(() => {
    const cSecs = dataOf(chords.data?.artifact?.content)?.sections ?? [];
    const lSecs = dataOf(lyrics.data?.artifact?.content)?.sections ?? [];
    const labels: string[] = [];
    [...cSecs, ...lSecs].forEach((s: any) => { const l = s.label || s.type; if (l && !labels.includes(l)) labels.push(l); });
    const sections = labels.map((label) => {
      const c = cSecs.find((s: any) => (s.label || s.type) === label);
      const l = lSecs.find((s: any) => (s.label || s.type) === label);
      return {
        label,
        chords: Array.isArray(c?.chords) ? c.chords.map((ch: any) => (typeof ch === "string" ? ch : ch?.name ?? "")) : [],
        lyrics: Array.isArray(l?.lines) ? l.lines : typeof l?.text === "string" ? l.text.split("\n") : [],
      };
    });
    return songSheetSvg({ title, subtitle, sections });
  }, [chords.data, lyrics.data, title, subtitle]);

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        <div>
          <h2 style={{ margin: 0 }}>📄 Song sheet</h2>
          <span className="muted">A lead sheet — key, sections, chords, and lyrics — exportable to PNG.</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {open && <button className="primary" onClick={(e) => { e.stopPropagation(); downloadPng(sheet.svg, sheet.width, sheet.height, `${title || "song"}.png`); }}>⬇ Export PNG</button>}
          <button className="sm ghost">{open ? "hide ▾" : "show ▸"}</button>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 10, overflow: "auto" }}>
          {chords.isLoading || lyrics.isLoading
            ? <div className="empty">Loading…</div>
            : <div dangerouslySetInnerHTML={{ __html: sheet.svg }} style={{ maxWidth: "100%" }} />}
        </div>
      )}
    </div>
  );
}
