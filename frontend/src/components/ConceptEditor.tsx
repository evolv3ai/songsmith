import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../ipc/api";
import { FieldChat } from "./FieldChat";

/** The Concept as a structured object — each piece addressable and editable,
 *  instead of one markdown blob. The artifact still stores a rendered `text`
 *  (derived from this object) alongside `data` for reading/copy. */
export type ConceptData = {
  title: string;
  alternates: string[];
  hook: string;
  theme: string;
  emotionalArc: string;
  mood: string[];
};

const splitList = (s: string) => s.split(/[·,]/).map((x) => x.replace(/\*/g, "").trim()).filter(Boolean);

/** Parse from structured `data` first, falling back to scraping the markdown
 *  `text` for any field the generator left only in prose. */
export function parseConcept(content: string): ConceptData {
  let data: any = null, text = "";
  try { const v = JSON.parse(content); text = v?.text ?? ""; data = v?.data ?? null; } catch { text = content; }
  const out: ConceptData = {
    title: data?.title ?? "",
    alternates: Array.isArray(data?.alternates) ? data.alternates : [],
    hook: data?.hook ?? "",
    theme: data?.theme ?? "",
    emotionalArc: data?.emotionalArc ?? data?.emotional_arc ?? "",
    mood: Array.isArray(data?.mood) ? data.mood : [],
  };
  const grab = (re: RegExp) => { const m = text.match(re); return m ? m[1].replace(/\*/g, "").trim() : ""; };
  const block = (re: RegExp) => { const m = text.match(re); return m ? m[1].trim() : ""; };
  if (!out.title) out.title = grab(/\*\*TITLE:\*\*\s*([^\n]+)/i);
  if (!out.alternates.length) { const m = grab(/Alternates?:\*?\*?\s*([^\n]+)/i); if (m) out.alternates = splitList(m); }
  if (!out.hook) out.hook = block(/\*\*HOOK[^\n:]*:\*\*\s*\n?([\s\S]*?)(?:\n\s*\n|\*\*[A-Z])/i);
  if (!out.theme) out.theme = block(/\*\*THEME:\*\*\s*\n?([\s\S]*?)(?:\n\s*\n|\*\*[A-Z])/i);
  if (!out.emotionalArc) out.emotionalArc = block(/\*\*EMOTIONAL ARC:\*\*\s*\n?([\s\S]*?)(?:\n\s*\n|\*\*[A-Z])/i);
  if (!out.mood.length) { const m = grab(/\*\*MOOD:\*\*\s*([^\n]+)/i); if (m) out.mood = splitList(m); }
  return out;
}

/** Render the structured concept back to markdown for the `text` field. */
export function conceptToMarkdown(d: ConceptData): string {
  const out: string[] = [`**TITLE:** ${d.title}`];
  if (d.alternates.length) out.push(`*Alternates:* ${d.alternates.join(" · ")}`);
  out.push("");
  if (d.hook) out.push(`**HOOK / CENTRAL ANGLE:**\n${d.hook}\n`);
  if (d.theme) out.push(`**THEME:**\n${d.theme}\n`);
  if (d.emotionalArc) out.push(`**EMOTIONAL ARC:**\n${d.emotionalArc}\n`);
  if (d.mood.length) out.push(`**MOOD:** ${d.mood.join(" · ")}`);
  return out.join("\n");
}

export function ConceptEditor({
  songId, stageId, kind, content, onChanged,
}: {
  songId: string; stageId: string; kind: string; content: string; onChanged: () => void;
}) {
  const [d, setD] = useState<ConceptData>(() => parseConcept(content));
  const [saved, setSaved] = useState("");
  const set = (patch: Partial<ConceptData>) => { setD((c) => ({ ...c, ...patch })); setSaved(""); };

  const save = useMutation({
    mutationFn: () => api.saveArtifact(songId, stageId, kind, JSON.stringify({ kind, text: conceptToMarkdown(d), data: d })),
    onSuccess: () => { setSaved("Saved."); onChanged(); },
  });
  const useAsTitle = useMutation({ mutationFn: () => api.updateSongTitle(songId, d.title.trim()), onSuccess: () => { setSaved("Set as song title."); onChanged(); } });

  return (
    <div className="col" style={{ gap: 12 }}>
      <div>
        <label>Title</label>
        <div className="row" style={{ gap: 6 }}>
          <input value={d.title} onChange={(e) => set({ title: e.target.value })} style={{ flex: 1 }} />
          <button className="sm" disabled={!d.title.trim() || useAsTitle.isPending} title="set this as the song's name" onClick={() => useAsTitle.mutate()}>→ song title</button>
        </div>
      </div>
      <div>
        <label>Alternate titles <span className="faint">(· separated)</span></label>
        <input value={d.alternates.join(" · ")} onChange={(e) => set({ alternates: splitList(e.target.value) })} style={{ width: "100%" }} />
      </div>
      <div>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <label style={{ margin: 0 }}>Hook / central angle</label>
          <FieldChat stageLabel="Concept" fieldLabel="hook / central angle" current={d.hook} onResult={(v) => set({ hook: v })} />
        </div>
        <textarea value={d.hook} onChange={(e) => set({ hook: e.target.value })} style={{ width: "100%", minHeight: 60 }} />
      </div>
      <div>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <label style={{ margin: 0 }}>Theme</label>
          <FieldChat stageLabel="Concept" fieldLabel="theme" current={d.theme} onResult={(v) => set({ theme: v })} />
        </div>
        <textarea value={d.theme} onChange={(e) => set({ theme: e.target.value })} style={{ width: "100%", minHeight: 70 }} />
      </div>
      <div>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <label style={{ margin: 0 }}>Emotional arc</label>
          <FieldChat stageLabel="Concept" fieldLabel="emotional arc" current={d.emotionalArc} onResult={(v) => set({ emotionalArc: v })} />
        </div>
        <textarea value={d.emotionalArc} onChange={(e) => set({ emotionalArc: e.target.value })} style={{ width: "100%", minHeight: 70 }} />
      </div>
      <div>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <label style={{ margin: 0 }}>Mood <span className="faint">(· separated)</span></label>
          <FieldChat stageLabel="Concept" fieldLabel="mood (adjectives)" current={d.mood.join(" · ")} onResult={(v) => set({ mood: splitList(v) })} />
        </div>
        <input value={d.mood.join(" · ")} onChange={(e) => set({ mood: splitList(e.target.value) })} style={{ width: "100%" }} />
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="primary sm" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "saving…" : "Save concept"}</button>
        {saved && <span className="faint">{saved}</span>}
      </div>
    </div>
  );
}
