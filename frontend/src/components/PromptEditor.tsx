import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../ipc/api";
import { FieldChat } from "./FieldChat";

export type PromptData = { stylePrompt: string; taggedLyrics: string; notes: string };

export function parsePrompt(content: string): PromptData {
  let data: any = null, text = "";
  try { const v = JSON.parse(content); text = v?.text ?? ""; data = v?.data ?? null; } catch { text = content; }
  const block = (re: RegExp) => { const m = text.match(re); return m ? m[1].trim() : ""; };
  return {
    stylePrompt: data?.stylePrompt ?? data?.style_prompt ?? block(/##?\s*STYLE PROMPT\s*\n([\s\S]*?)(?:\n##?\s|\n*$)/i),
    taggedLyrics: data?.taggedLyrics ?? data?.tagged_lyrics ?? block(/##?\s*TAGGED LYRICS\s*\n([\s\S]*?)(?:\n##?\s|\n*$)/i),
    notes: data?.notes ?? block(/##?\s*NOTES\s*\n([\s\S]*?)(?:\n##?\s|\n*$)/i),
  };
}

export function promptToMarkdown(d: PromptData): string {
  return [
    "## STYLE PROMPT", d.stylePrompt, "",
    "## TAGGED LYRICS", d.taggedLyrics, "",
    "## NOTES", d.notes,
  ].join("\n");
}

export function PromptEditor({
  songId, stageId, kind, content, onChanged,
}: {
  songId: string; stageId: string; kind: string; content: string; onChanged: () => void;
}) {
  const [d, setD] = useState<PromptData>(() => parsePrompt(content));
  const [saved, setSaved] = useState("");
  const set = (patch: Partial<PromptData>) => { setD((c) => ({ ...c, ...patch })); setSaved(""); };
  const save = useMutation({
    mutationFn: () => api.saveArtifact(songId, stageId, kind, JSON.stringify({ kind, text: promptToMarkdown(d), data: d })),
    onSuccess: () => { setSaved("Saved."); onChanged(); },
  });
  return (
    <div className="col" style={{ gap: 12 }}>
      <div>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <label style={{ margin: 0 }}>Style prompt <span className="faint">(one line — genre, mood, instrumentation, vocal, mix, key, tempo · no chords)</span></label>
          <FieldChat stageLabel="Generation Prompt" fieldLabel="style prompt" current={d.stylePrompt} onResult={(v) => set({ stylePrompt: v })} />
        </div>
        <textarea value={d.stylePrompt} onChange={(e) => set({ stylePrompt: e.target.value })} style={{ width: "100%", minHeight: 50 }} />
      </div>
      <div>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <label style={{ margin: 0 }}>Tagged lyrics <span className="faint">([Section] headers + inline [Chord] tags)</span></label>
          <FieldChat stageLabel="Generation Prompt" fieldLabel="tagged lyrics" current={d.taggedLyrics} onResult={(v) => set({ taggedLyrics: v })} />
        </div>
        <textarea value={d.taggedLyrics} onChange={(e) => set({ taggedLyrics: e.target.value })} spellCheck={false} style={{ width: "100%", minHeight: 220, fontFamily: "var(--mono)", fontSize: 12 }} />
      </div>
      <div>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
          <label style={{ margin: 0 }}>Notes <span className="faint">(key, tempo, energy, structure cues)</span></label>
          <FieldChat stageLabel="Generation Prompt" fieldLabel="notes" current={d.notes} onResult={(v) => set({ notes: v })} />
        </div>
        <textarea value={d.notes} onChange={(e) => set({ notes: e.target.value })} style={{ width: "100%", minHeight: 50 }} />
      </div>
      <div className="row" style={{ gap: 8 }}>
        <button className="primary sm" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? "saving…" : "Save prompt"}</button>
        {saved && <span className="faint">{saved}</span>}
      </div>
    </div>
  );
}
