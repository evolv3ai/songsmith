import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../ipc/api";
import { diatonicChords, pitchClassOf, NOTE_NAMES } from "../music/theory";
import { isValidName, chordMidisByName, chordPcsByName } from "../music/engineAdapter";
import { playChord, playSequence } from "../music/synth";
import { ImportProgression } from "./ImportProgression";

type Chord = { id: string; name: string; beats: number };
type Section = { label: string; chords: Chord[]; feel?: string };

const uid = () => Math.random().toString(36).slice(2, 8);

function fromData(data: any): Section[] {
  const secs = data?.sections;
  if (!Array.isArray(secs)) return [];
  return secs.map((s: any) => ({
    label: s.label || s.type || "Section",
    feel: s.feel,
    chords: (Array.isArray(s.chords) ? s.chords : []).map((c: any) => ({
      id: uid(),
      name: typeof c === "string" ? c : c?.name ?? "",
      beats: typeof c === "object" && c?.beats ? c.beats : 4,
    })),
  }));
}
function toData(sections: Section[]) {
  return { sections: sections.map((s) => ({ label: s.label, feel: s.feel, chords: s.chords.map((c) => ({ name: c.name, beats: c.beats })) })) };
}

function PianoVoicing({ pcs }: { pcs: number[] }) {
  const set = new Set(pcs);
  const whites = [0, 2, 4, 5, 7, 9, 11];
  const blacks: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
  return (
    <div style={{ position: "relative", display: "flex", height: 64 }}>
      {whites.map((pc) => (
        <div key={pc} style={{ width: 24, height: 64, border: "1px solid var(--line)", background: set.has(pc) ? "var(--accent)" : "var(--paper-2)", borderRadius: "0 0 3px 3px" }} title={NOTE_NAMES[pc]} />
      ))}
      {Object.keys(blacks).map((k) => {
        const pc = Number(k);
        return <div key={pc} style={{ position: "absolute", left: (blacks[pc] + 1) * 24 - 7, top: 0, width: 14, height: 40, background: set.has(pc) ? "var(--accent-dim)" : "#000", border: "1px solid var(--line)", borderRadius: "0 0 2px 2px" }} title={NOTE_NAMES[pc]} />;
      })}
    </div>
  );
}

export function Composer({
  songId, stageId, kind, artifactId, keyRoot, keyMode, initialData, onChanged,
}: {
  songId: string; stageId: string; kind: string; artifactId: string;
  keyRoot: string; keyMode: string; initialData: any; onChanged: () => void;
}) {
  const [sections, setSections] = useState<Section[]>(() => fromData(initialData));
  const [selected, setSelected] = useState<{ s: number; c: number } | null>(null);
  const [playingIdx, setPlayingIdx] = useState<{ s: number; c: number } | null>(null);
  const [dirty, setDirty] = useState(false);

  // reload from a newer revision (e.g. after Claude edits via the stage chat),
  // unless the user has unsaved manual edits in progress
  useEffect(() => {
    if (!dirty) setSections(fromData(initialData));
  }, [artifactId]);

  const rootPc = pitchClassOf(keyRoot) ?? 0;
  const palette = useMemo(() => diatonicChords(rootPc, keyMode === "major" ? "major" : "minor"), [rootPc, keyMode]);

  const mutate = (fn: (s: Section[]) => Section[]) => { setSections((cur) => fn(structuredClone(cur))); setDirty(true); };
  const setChordName = (si: number, ci: number, name: string) => mutate((s) => { s[si].chords[ci].name = name; return s; });
  const setChordBeats = (si: number, ci: number, beats: number) => mutate((s) => { s[si].chords[ci].beats = Math.max(1, beats); return s; });
  const addChord = (si: number, name = "") => mutate((s) => { s[si].chords.push({ id: uid(), name, beats: 4 }); return s; });
  const importToSection = (si: number, names: string[]) => mutate((s) => { s[si].chords = names.map((n) => ({ id: uid(), name: n, beats: 4 })); return s; });
  const removeChord = (si: number, ci: number) => mutate((s) => { s[si].chords.splice(ci, 1); return s; });

  const selChord = selected ? sections[selected.s]?.chords[selected.c] : null;
  const selPcs = selChord ? chordPcsByName(selChord.name) : null;
  const playOne = (name: string) => { const m = chordMidisByName(name); if (m.length) playChord(m); };
  const playSection = (si: number) => {
    const steps = sections[si].chords.map((c) => ({ notes: chordMidisByName(c.name), beats: c.beats })).filter((s) => s.notes.length);
    playSequence(steps, 120, (i) => setPlayingIdx(i < 0 ? null : { s: si, c: i }));
  };

  const save = useMutation({
    mutationFn: () => {
      const text = sections.map((s) => `${s.label}: ${s.chords.map((c) => c.name).join(" ")}`).join("\n");
      return api.saveArtifact(songId, stageId, kind, JSON.stringify({ kind, text, data: toData(sections) }));
    },
    onSuccess: () => { setDirty(false); onChanged(); },
  });

  if (sections.length === 0) {
    return <div className="banner">No sections yet. Run the <b>Structure</b> stage, then <b>Chords</b> — the progression opens here to edit, play, and (via the stage chat below) ask Claude to change.</div>;
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <span className="faint">{keyRoot} {keyMode} · click a chord to voice it · 7ths/sus/borrowed all OK</span>
        <button className="sm primary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "saving…" : dirty ? "save revision" : "saved"}</button>
      </div>

      <ImportProgression sectionLabels={sections.map((s) => s.label)} onImport={importToSection} />

      <div className="card" style={{ marginBottom: 10 }}>
        <label>Palette — {keyRoot} {keyMode} (adds to selected section)</label>
        <div className="row" style={{ flexWrap: "wrap", gap: 5 }}>
          {palette.map((p) => (
            <button key={p.roman} className="sm" title={p.roman} onClick={() => { playOne(p.name); if (selected) addChord(selected.s, p.name); }}>
              {p.name} <span className="faint">{p.roman}</span>
            </button>
          ))}
        </div>
      </div>

      {sections.map((sec, si) => (
        <div key={si} className="card" style={{ marginBottom: 8 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <b>{sec.label}</b>
            <div className="row" style={{ gap: 6 }}>
              <button className="sm" onClick={() => playSection(si)}>▶ play</button>
              <button className="sm" onClick={() => { addChord(si); setSelected({ s: si, c: sections[si].chords.length }); }}>+ chord</button>
            </div>
          </div>
          {sec.feel && <div className="faint" style={{ marginBottom: 6 }}>{sec.feel}</div>}
          <div className="row" style={{ flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {sec.chords.map((c, ci) => {
              const active = selected?.s === si && selected?.c === ci;
              const playing = playingIdx?.s === si && playingIdx?.c === ci;
              const ok = isValidName(c.name);
              return (
                <div key={c.id} className="chord-cell" style={{ borderColor: playing ? "var(--accent)" : active ? "var(--accent-dim)" : ok ? "var(--line)" : "var(--danger)" }} onClick={() => setSelected({ s: si, c: ci })}>
                  <input value={c.name} onChange={(e) => setChordName(si, ci, e.target.value)} placeholder="Am" style={{ width: 56, padding: "2px 4px", textAlign: "center", border: "none", background: "transparent" }} />
                  <div className="row" style={{ gap: 4, justifyContent: "center" }}>
                    <button className="sm ghost" title="play" onClick={(e) => { e.stopPropagation(); playOne(c.name); }}>♪</button>
                    <input type="number" min={1} value={c.beats} onChange={(e) => setChordBeats(si, ci, Number(e.target.value))} title="beats" style={{ width: 34, padding: "1px 3px" }} />
                    <button className="sm ghost danger" title="remove" onClick={(e) => { e.stopPropagation(); removeChord(si, ci); }}>×</button>
                  </div>
                </div>
              );
            })}
            {sec.chords.length === 0 && <span className="faint">no chords — use the palette or “+ chord”.</span>}
          </div>
        </div>
      ))}

      {selChord && selPcs && selPcs.length > 0 && (
        <div className="card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h3>Voicing — {selChord.name}</h3>
            <button className="sm" onClick={() => playChord(chordMidisByName(selChord.name))}>♪ play</button>
          </div>
          <PianoVoicing pcs={selPcs} />
          <div className="faint" style={{ marginTop: 6 }}>notes: {selPcs.map((pc) => NOTE_NAMES[pc]).join(" · ")}</div>
        </div>
      )}
    </div>
  );
}
