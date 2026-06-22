import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../ipc/api";
import { parseChord, chordMidi, NOTE_NAMES } from "../music/theory";
import { guitarVoicings } from "../music/guitar";
import { playChord } from "../music/synth";
import { diagramSvg, diagramSvgShape, chartSvg, downloadSvg } from "../music/diagrams";
import { CircleOfFifths } from "./CircleOfFifths";

const QUALITIES: [string, string][] = [
  ["maj", ""], ["m", "m"], ["dim", "dim"], ["aug", "aug"], ["sus2", "sus2"], ["sus4", "sus4"],
  ["6", "6"], ["m6", "m6"], ["maj7", "maj7"], ["m7", "m7"], ["7", "7"], ["m7b5", "m7b5"],
  ["dim7", "dim7"], ["add9", "add9"], ["9", "9"],
];

function MiniPiano({ pcs }: { pcs: number[] }) {
  const set = new Set(pcs);
  const whites = [0, 2, 4, 5, 7, 9, 11];
  const blacks: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
  return (
    <div style={{ position: "relative", display: "flex", height: 60 }}>
      {whites.map((pc) => (<div key={pc} style={{ width: 22, height: 60, border: "1px solid var(--line)", background: set.has(pc) ? "var(--accent)" : "var(--paper-2)" }} />))}
      {Object.keys(blacks).map((k) => { const pc = Number(k); return <div key={pc} style={{ position: "absolute", left: (blacks[pc] + 1) * 22 - 6, top: 0, width: 12, height: 38, background: set.has(pc) ? "var(--accent-dim)" : "#000", border: "1px solid var(--line)" }} />; })}
    </div>
  );
}

export function ChordBuilder() {
  const [root, setRoot] = useState(0);
  const [quality, setQuality] = useState("");
  const [prog, setProg] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [view, setView] = useState<"guitar" | "piano">("guitar");
  const [vIdx, setVIdx] = useState(0);
  const qc = useQueryClient();

  const built = NOTE_NAMES[root] + quality;
  const parsed = parseChord(built);
  const voicings = guitarVoicings(built);
  const v = voicings.length ? Math.min(vIdx, voicings.length - 1) : 0;
  useEffect(() => setVIdx(0), [root, quality]);
  const saved = useQuery({ queryKey: ["progressions"], queryFn: api.listProgressions });

  const save = useMutation({
    mutationFn: () => api.saveProgression(name.trim() || "Untitled progression", prog),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["progressions"] }); setName(""); },
  });
  const del = useMutation({ mutationFn: (id: string) => api.deleteProgression(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["progressions"] }) });

  return (
    <div className="grid2" style={{ alignItems: "start" }}>
      <div>
        <div className="card">
          <h3>Build a chord</h3>
          <label>Root</label>
          <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
            {NOTE_NAMES.map((n, i) => (<button key={n} className={"sm" + (i === root ? " primary" : "")} onClick={() => setRoot(i)}>{n}</button>))}
          </div>
          <label>Quality</label>
          <div className="row" style={{ flexWrap: "wrap", gap: 4 }}>
            {QUALITIES.map(([lbl, q]) => (<button key={lbl} className={"sm" + (q === quality ? " primary" : "")} onClick={() => setQuality(q)}>{lbl}</button>))}
          </div>

          <div className="row" style={{ justifyContent: "space-between", marginTop: 12, alignItems: "center" }}>
            <div className="row" style={{ gap: 8, alignItems: "center" }}>
              <b style={{ fontSize: 18 }}>{built}</b>
              <button className="sm" onClick={() => parsed && playChord(chordMidi(parsed))}>♪ play</button>
              <button className="sm primary" onClick={() => setProg((p) => [...p, built])}>+ add</button>
            </div>
            <div className="row" style={{ gap: 4 }}>
              <button className={"sm" + (view === "guitar" ? " primary" : "")} onClick={() => setView("guitar")}>Guitar</button>
              <button className={"sm" + (view === "piano" ? " primary" : "")} onClick={() => setView("piano")}>Piano</button>
            </div>
          </div>
          <div style={{ marginTop: 10, minHeight: 70 }}>
            {view === "guitar" ? (
              voicings.length ? (
                <>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center", maxWidth: 220 }}>
                    <button className="sm" onClick={() => setVIdx((i) => (i - 1 + voicings.length) % voicings.length)} disabled={voicings.length < 2}>‹ Prev</button>
                    <span className="faint">{voicings[v].label} · {v + 1} of {voicings.length}</span>
                    <button className="sm" onClick={() => setVIdx((i) => (i + 1) % voicings.length)} disabled={voicings.length < 2}>Next ›</button>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: diagramSvgShape(voicings[v], built) }} />
                </>
              ) : <span className="faint">(no guitar shape for this chord — see Piano)</span>
            ) : parsed && <MiniPiano pcs={parsed.pcs} />}
          </div>
          {parsed && <div className="faint">{parsed.pcs.map((pc) => NOTE_NAMES[pc]).join(" · ")}</div>}
        </div>

        <div className="card">
          <h3>Circle of fifths</h3>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <CircleOfFifths rootPc={root} quality={quality} onPick={(pc, q) => { setRoot(pc); setQuality(q); }} />
          </div>
          <p className="faint">Outer ring = major, inner = relative minor. Click to pick &amp; hear.</p>
        </div>
      </div>

      <div>
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>Progression</h3>
            {prog.length > 0 && <button className="sm" onClick={() => downloadSvg(chartSvg(prog, name || "Chord chart"), "chord-chart.svg")}>⬇ Export chart</button>}
          </div>
          {prog.length === 0 ? (
            <p className="faint">No chords yet — build a chord and “+ add”.</p>
          ) : (
            <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {prog.map((c, i) => (
                <div key={i} className="col" style={{ alignItems: "center", gap: 2 }}>
                  <div dangerouslySetInnerHTML={{ __html: diagramSvg(c) }} onClick={() => { const p = parseChord(c); if (p) playChord(chordMidi(p)); }} style={{ cursor: "pointer" }} />
                  <button className="sm ghost danger" onClick={() => setProg((pr) => pr.filter((_, j) => j !== i))}>remove</button>
                </div>
              ))}
            </div>
          )}
          {prog.length > 0 && (
            <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Progression name" style={{ width: 200 }} />
              <button className="primary" onClick={() => save.mutate()} disabled={save.isPending}>Save to library</button>
              <button className="ghost" onClick={() => setProg([])}>clear</button>
            </div>
          )}
        </div>

        {saved.data && saved.data.length > 0 && (
          <div className="card">
            <h3>Saved progressions</h3>
            {saved.data.map((p) => (
              <div key={p.id} className="list-item" style={{ marginBottom: 6 }}>
                <div className="col" style={{ gap: 2 }}>
                  <b>{p.name}</b>
                  <span className="faint">{p.chords.join(" · ")}</span>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="sm ghost" onClick={() => setProg(p.chords)}>load</button>
                  <button className="sm" onClick={() => downloadSvg(chartSvg(p.chords, p.name), `${p.name}.svg`)}>export</button>
                  <button className="sm danger" onClick={() => del.mutate(p.id)}>delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
