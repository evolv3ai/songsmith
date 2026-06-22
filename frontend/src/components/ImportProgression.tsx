import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "../ipc/api";

/** Lean panel for the Chords stage: import a saved progression into a section.
 *  The full builder lives on the dedicated /builder page. */
export function ImportProgression({
  sectionLabels,
  onImport,
}: {
  sectionLabels: string[];
  onImport: (sectionIdx: number, chords: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(0);
  const saved = useQuery({ queryKey: ["progressions"], queryFn: api.listProgressions });

  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div className="row" style={{ justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        <h3 style={{ margin: 0 }}>📥 Import a saved progression</h3>
        <button className="sm ghost">{open ? "hide ▾" : "show ▸"}</button>
      </div>
      {open && (
        <div style={{ marginTop: 10 }}>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <span className="faint">import into</span>
            <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
              {sectionLabels.map((l, i) => (<option key={i} value={i}>{l}</option>))}
            </select>
          </div>
          {!saved.data || saved.data.length === 0 ? (
            <p className="faint">No saved progressions yet. Build some on the <Link to="/builder">Chord builder</Link> page.</p>
          ) : (
            saved.data.map((p) => (
              <div key={p.id} className="list-item" style={{ marginBottom: 6 }}>
                <div className="col" style={{ gap: 2 }}>
                  <b>{p.name}</b>
                  <span className="faint">{p.chords.join(" · ")}</span>
                </div>
                <button className="sm primary" onClick={() => onImport(target, p.chords)}>import →</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
