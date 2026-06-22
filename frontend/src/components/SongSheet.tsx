import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../ipc/api";
import type { Stage } from "../ipc/generated";
import { pitchClassOf } from "../music/theory";
import { playAlongSvg, downloadPng } from "../music/diagrams";

function dataOf(content: string | undefined): any {
  if (!content) return null;
  try { return JSON.parse(content)?.data ?? null; } catch { return null; }
}

export function SongSheet({
  title, subtitle, keyRoot, keyMode, stages,
}: {
  title: string; subtitle: string; keyRoot: string; keyMode: string; stages: Stage[];
}) {
  const [instrument, setInstrument] = useState<"guitar" | "piano">("guitar");
  const chordsStage = stages.find((s) => s.type === "chords");
  const lyricsStage = stages.find((s) => s.type === "lyrics");
  const chords = useQuery({ queryKey: ["stage", chordsStage?.id], queryFn: () => api.getStage(chordsStage!.id), enabled: !!chordsStage });
  const lyrics = useQuery({ queryKey: ["stage", lyricsStage?.id], queryFn: () => api.getStage(lyricsStage!.id), enabled: !!lyricsStage });

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
    return playAlongSvg({ title, subtitle, instrument, rootPc: pitchClassOf(keyRoot) ?? 0, mode: keyMode === "major" ? "major" : "minor", sections });
  }, [chords.data, lyrics.data, title, subtitle, instrument, keyRoot, keyMode]);

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <div className="row" style={{ gap: 4 }}>
          <button className={"sm" + (instrument === "guitar" ? " primary" : "")} onClick={() => setInstrument("guitar")}>Guitar</button>
          <button className={"sm" + (instrument === "piano" ? " primary" : "")} onClick={() => setInstrument("piano")}>Piano</button>
        </div>
        <button className="primary" onClick={() => downloadPng(sheet.svg, sheet.width, sheet.height, `${title || "song"}.png`)}>⬇ Export PNG</button>
      </div>
      {chords.isLoading || lyrics.isLoading
        ? <div className="empty">Loading…</div>
        : <div className="card" style={{ overflow: "auto" }} dangerouslySetInnerHTML={{ __html: sheet.svg }} />}
    </div>
  );
}
