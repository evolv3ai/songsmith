import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../ipc/api";
import type { Skill, SkillInput } from "../ipc/generated";

const STAGE_TYPES = ["concept", "structure", "chords", "lyrics", "prompt", "style", "ableton"] as const;
const LABELS: Record<string, string> = {
  concept: "Concept", structure: "Structure", chords: "Chords", lyrics: "Lyrics", prompt: "Generation Prompt", style: "Style (preset)", ableton: "Ableton (arrange)",
};
const EMPTY: SkillInput = { key: "", name: "", stage_type: "concept", instructions: "" };

export function Skills() {
  const qc = useQueryClient();
  const skills = useQuery({ queryKey: ["skills"], queryFn: api.listSkills });
  const [selected, setSelected] = useState<Skill | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<SkillInput>(EMPTY);

  useEffect(() => {
    if (selected) setForm({ key: selected.key, name: selected.name, stage_type: selected.stage_type, instructions: selected.instructions });
  }, [selected]);

  const save = useMutation({
    mutationFn: () => (selected ? api.updateSkill(selected.id, form) : api.createSkill(form)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); setCreating(false); },
  });
  const toggle = useMutation({
    mutationFn: (s: Skill) => api.setSkillEnabled(s.id, !s.enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });
  const set = (k: keyof SkillInput) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const editing = creating || selected;

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Skills</h1>
          <span className="muted">Editable songwriting methods. The enabled skill for a stage powers its next run.</span>
        </div>
        <button className="primary" onClick={() => { setSelected(null); setForm(EMPTY); setCreating(true); }}>+ New skill</button>
      </div>

      <div className="grid2" style={{ alignItems: "start" }}>
        <div>
          {STAGE_TYPES.map((st) => {
            const group = skills.data?.filter((s) => s.stage_type === st) ?? [];
            if (group.length === 0) return null;
            return (
              <div key={st} style={{ marginBottom: 12 }}>
                <h3>{LABELS[st]}</h3>
                {group.map((s) => (
                  <div key={s.id} className="list-item">
                    <div className="col" style={{ gap: 3 }}>
                      <div className="row" style={{ gap: 8 }}>
                        <b>{s.name}</b>
                        <span className="badge">{s.source}</span>
                        {!s.enabled && <span className="badge pending">disabled</span>}
                      </div>
                      <span className="faint">{s.key}</span>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <button className="sm" onClick={() => { setCreating(false); setSelected(s); }}>edit</button>
                      <button className="sm" onClick={() => toggle.mutate(s)}>{s.enabled ? "disable" : "enable"}</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <div>
          {editing && (
            <div className="card">
              <h2>{selected ? "Edit skill" : "New skill"}</h2>
              <label>Key (slug)</label>
              <input value={form.key} onChange={set("key")} placeholder="nashville-numbers" style={{ width: "100%" }} />
              <label>Name</label>
              <input value={form.name} onChange={set("name")} style={{ width: "100%" }} />
              <label>Stage type</label>
              <select value={form.stage_type} onChange={set("stage_type")} style={{ width: "100%" }}>
                {STAGE_TYPES.map((st) => (<option key={st} value={st}>{LABELS[st]}</option>))}
              </select>
              <label>Instructions (the songwriting method)</label>
              <textarea value={form.instructions} onChange={set("instructions")} style={{ minHeight: "44vh" }} />
              <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
                <button className="ghost" onClick={() => { setSelected(null); setCreating(false); }}>Close</button>
                <button className="primary" disabled={!form.name || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
