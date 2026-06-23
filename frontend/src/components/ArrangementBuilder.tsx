import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../ipc/api";
import type { Stage } from "../ipc/generated";
import { pitchClassOf } from "../music/theory";
import { playAlongSvg } from "../music/diagrams";
import { Composer } from "./Composer";
import { LyricsEditor } from "./LyricsEditor";

function dataOf(content: string | undefined): any {
  if (!content) return null;
  try { return JSON.parse(content)?.data ?? null; } catch { return null; }
}

/** Insert [chord] tags before evenly-spaced words of a line (in order). */
function placeChordsOnLine(text: string, names: string[]): string {
  if (!names.length) return text;
  const toks = text.split(/(\s+)/);
  const wordIdx: number[] = [];
  toks.forEach((t, i) => { if (t.trim()) wordIdx.push(i); });
  if (!wordIdx.length) return `${names.map((n) => `[${n}]`).join("")}${text}`;
  const atWord: Record<number, string[]> = {};
  names.forEach((name, k) => {
    const w = wordIdx[names.length === 1 ? 0 : Math.min(wordIdx.length - 1, Math.round((k * (wordIdx.length - 1)) / (names.length - 1)))];
    (atWord[w] ??= []).push(name);
  });
  return toks.map((t, i) => (atWord[i] ? atWord[i].map((n) => `[${n}]`).join("") + t : t)).join("");
}

/** Build the sheet's sections from the (editable) Chords + Lyrics artifacts.
 *  The section's chord sequence is spread across its lyric lines (proportionally),
 *  with multiple chords per line placed over evenly-spaced words when needed. */
export function deriveSections(chordsData: any, lyricsData: any): { label: string; chords: string[]; lyrics: string[] }[] {
  const cSecs: any[] = chordsData?.sections ?? [];
  const lSecs: any[] = lyricsData?.sections ?? [];
  const labels: string[] = [];
  [...cSecs, ...lSecs].forEach((s) => { const l = s.label || s.type; if (l && !labels.includes(l)) labels.push(l); });
  return labels.map((label) => {
    const c = cSecs.find((s) => (s.label || s.type) === label);
    const l = lSecs.find((s) => (s.label || s.type) === label);
    const names: string[] = Array.isArray(c?.chords)
      ? c.chords.map((ch: any) => (typeof ch === "string" ? ch : ch?.name ?? "")).filter(Boolean)
      : [];
    const lines: string[] = Array.isArray(l?.lines) ? l.lines : typeof l?.text === "string" ? l.text.split("\n") : [];

    // assign each chord to a lyric line proportionally, then place within the line
    const neCount = lines.filter((x) => x.trim()).length;
    const perLine: string[][] = Array.from({ length: Math.max(1, neCount) }, () => []);
    if (names.length && neCount) {
      names.forEach((name, j) => {
        const li = Math.min(neCount - 1, Math.floor((j * neCount) / names.length));
        perLine[li].push(name);
      });
    }
    let neIdx = 0;
    const tagged = lines.map((line) => {
      if (!line.trim()) return line;
      const my = perLine[neIdx] ?? []; neIdx++;
      return names.length ? placeChordsOnLine(line, my) : line;
    });
    return { label, chords: names, lyrics: tagged };
  });
}

export function ArrangementBuilder({
  songId, title, subtitle, keyRoot, keyMode, stages,
}: {
  songId: string; title: string; subtitle: string; keyRoot: string; keyMode: string; stages: Stage[];
}) {
  const qc = useQueryClient();
  const chordsStage = stages.find((s) => s.type === "chords");
  const lyricsStage = stages.find((s) => s.type === "lyrics");
  const chords = useQuery({ queryKey: ["stage", chordsStage?.id], queryFn: () => api.getStage(chordsStage!.id), enabled: !!chordsStage });
  const lyrics = useQuery({ queryKey: ["stage", lyricsStage?.id], queryFn: () => api.getStage(lyricsStage!.id), enabled: !!lyricsStage });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["stage", chordsStage?.id] });
    qc.invalidateQueries({ queryKey: ["stage", lyricsStage?.id] });
    qc.invalidateQueries({ queryKey: ["song", songId] });
  };

  const cd = dataOf(chords.data?.artifact?.content);
  const ld = dataOf(lyrics.data?.artifact?.content);
  const preview = useMemo(
    () => playAlongSvg({ title, subtitle, instrument: "guitar", rootPc: pitchClassOf(keyRoot) ?? 0, mode: keyMode === "major" ? "major" : "minor", sections: deriveSections(cd, ld) }),
    [cd, ld, title, subtitle, keyRoot, keyMode],
  );

  const cArt = chords.data?.artifact, lArt = lyrics.data?.artifact;

  return (
    <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 50%", minWidth: 340 }}>
        <div className="col" style={{ gap: 16 }}>
          <div>
            <h3 style={{ marginBottom: 6 }}>Chords</h3>
            <p className="faint" style={{ margin: "0 0 8px" }}>Edit per section to match what Suno produced. One chord lands on the start of each lyric line.</p>
            {cArt ? (
              <Composer songId={songId} stageId={chordsStage!.id} kind={cArt.kind} artifactId={cArt.id} keyRoot={keyRoot} keyMode={keyMode} initialData={cd} onChanged={invalidate} />
            ) : <div className="banner">Run the <b>Chords</b> stage in Workspace first.</div>}
          </div>
          <div>
            <h3 style={{ marginBottom: 6 }}>Lyrics</h3>
            {lArt ? (
              <LyricsEditor songId={songId} stageId={lyricsStage!.id} kind={lArt.kind} artifactId={lArt.id} content={lArt.content} onChanged={invalidate} />
            ) : <div className="banner">Run the <b>Lyrics</b> stage in Workspace first.</div>}
          </div>
        </div>
      </div>
      <div className="card fit-svg" style={{ flex: "1 1 50%", minWidth: 360, overflow: "auto", maxHeight: "82vh", position: "sticky", top: 8 }}>
        <div className="faint" style={{ fontSize: 11, marginBottom: 6 }}>Live preview — saves to the Chords/Lyrics above update this. Export from the Sheet preview tab.</div>
        <div dangerouslySetInnerHTML={{ __html: preview.svg }} />
      </div>
    </div>
  );
}
