import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../ipc/api";

type Section = { label: string; text: string };

function parse(content: string): { text: string; data: any } {
  try {
    const v = JSON.parse(content);
    if (v && typeof v === "object" && "text" in v) return { text: v.text ?? "", data: v.data ?? null };
    return { text: content, data: v };
  } catch {
    return { text: content, data: null };
  }
}

/** Build editable sections from the lyrics artifact (label + lines), falling
 *  back to a single box from the raw text if the model returned flat output. */
function fromContent(content: string): Section[] {
  const { text, data } = parse(content);
  const secs = data?.sections;
  if (Array.isArray(secs) && secs.length) {
    return secs.map((s: any) => ({
      label: s.label || s.type || "Section",
      text: Array.isArray(s.lines) ? s.lines.join("\n") : typeof s.text === "string" ? s.text : "",
    }));
  }
  return [{ label: "Lyrics", text: text || "" }];
}

export function LyricsEditor({
  songId, stageId, kind, artifactId, content, onChanged,
}: {
  songId: string; stageId: string; kind: string; artifactId: string; content: string; onChanged: () => void;
}) {
  const [sections, setSections] = useState<Section[]>(() => fromContent(content));
  const [dirty, setDirty] = useState(false);

  useEffect(() => { if (!dirty) setSections(fromContent(content)); }, [artifactId]);

  const mutate = (fn: (s: Section[]) => Section[]) => { setSections((cur) => fn(structuredClone(cur))); setDirty(true); };
  const setText = (i: number, text: string) => mutate((s) => { s[i].text = text; return s; });
  const setLabel = (i: number, label: string) => mutate((s) => { s[i].label = label; return s; });
  const addSection = () => mutate((s) => { s.push({ label: "Section", text: "" }); return s; });
  const removeSection = (i: number) => mutate((s) => { s.splice(i, 1); return s; });

  const save = useMutation({
    mutationFn: () => {
      const data = { sections: sections.map((s) => ({ label: s.label, lines: s.text.split("\n").map((l) => l.trimEnd()) })) };
      const text = sections.map((s) => `[${s.label}]\n${s.text}`).join("\n\n");
      return api.saveArtifact(songId, stageId, kind, JSON.stringify({ kind, text, data }));
    },
    onSuccess: () => { setDirty(false); onChanged(); },
  });

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <span className="faint">edit lyrics per section · matches your song structure</span>
        <button className="sm primary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "saving…" : dirty ? "save revision" : "saved"}
        </button>
      </div>

      {sections.map((sec, i) => (
        <div key={i} className="card" style={{ marginBottom: 8 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <input value={sec.label} onChange={(e) => setLabel(i, e.target.value)} style={{ width: 180, fontWeight: 600 }} />
            <button className="sm ghost danger" onClick={() => removeSection(i)}>remove</button>
          </div>
          <textarea value={sec.text} onChange={(e) => setText(i, e.target.value)} style={{ minHeight: 110 }}
            placeholder="lyrics for this section, one line per line" />
        </div>
      ))}

      <button className="sm" onClick={addSection}>+ section</button>
    </div>
  );
}
