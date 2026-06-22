import { useEffect, useRef, useState } from "react";
import { api, listen, STAGE_LABELS } from "../ipc/api";

type Msg = { role: "you" | "claude"; text: string; tools: string[] };

/**
 * A collapsible, stage-aware chat. Talk to Claude about the CURRENT stage and it
 * edits that stage's artifact over MCP (save_artifact), then the workspace
 * reloads. Available on every stage — concept, structure, chords, lyrics, prompt.
 */
export function StageChat({
  songId,
  stageId,
  stageType,
  kind,
  content,
  keyRoot,
  keyMode,
  onChanged,
}: {
  songId: string;
  stageId: string;
  stageType: string;
  kind: string;
  content: string | null;
  keyRoot: string;
  keyMode: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef<string | null>(null);
  const patchLast = (fn: (m: Msg) => Msg) => setChat((c) => c.map((m, i) => (i === c.length - 1 ? fn(m) : m)));

  // reset the conversation when you switch stages
  useEffect(() => {
    sessionRef.current = null;
    setChat([]);
  }, [stageId]);

  useEffect(() => {
    let un1 = () => {}, un2 = () => {}, un3 = () => {};
    (async () => {
      un1 = await listen<{ event: any }>("chat_event", ({ event }) => {
        const t = event?.type;
        if (t === "stream_event" && event.event?.type === "content_block_delta" && event.event.delta?.type === "text_delta") {
          patchLast((m) => ({ ...m, text: m.text + (event.event.delta.text ?? "") }));
        } else if (t === "assistant") {
          const tools = (event.message?.content ?? []).filter((b: any) => b.type === "tool_use").map((b: any) => b.name);
          if (tools.length) patchLast((m) => ({ ...m, tools: [...m.tools, ...tools] }));
        } else if (t === "result") {
          patchLast((m) => (m.text.trim() ? m : { ...m, text: event.result ?? "" }));
        }
      });
      un2 = await listen<{}>("chat_done", () => { setBusy(false); onChanged(); });
      un3 = await listen<{ error: string }>("chat_error", (p) => { patchLast((m) => ({ ...m, text: "⚠️ " + p.error })); setBusy(false); });
    })();
    return () => { un1(); un2(); un3(); };
  }, [onChanged]);

  const send = async () => {
    const ask = input.trim();
    if (!ask || busy) return;
    setInput("");
    setChat((c) => [...c, { role: "you", text: ask, tools: [] }, { role: "claude", text: "", tools: [] }]);
    setBusy(true);
    const ctx =
      `[Songsmith — ${STAGE_LABELS[stageType] ?? stageType} stage]\n` +
      `Edit the "${stageType}" artifact for song_id="${songId}", stage_id="${stageId}". Song key ${keyRoot} ${keyMode}.\n` +
      `Current artifact (JSON envelope {kind,text,data}): ${content ?? "(none yet — create it)"}\n` +
      `To APPLY a change, call the songsmith MCP tool save_artifact with song_id="${songId}", stage_id="${stageId}", kind="${kind}", ` +
      `and content = a JSON string of the SAME envelope shape {"kind":"${kind}","text":"<readable>","data":{...}} — preserve the existing data structure, change only what's asked. ` +
      `You may also call get_song / get_stage for more context. Then reply with one short line.\n\nRequest: ${ask}`;
    try {
      sessionRef.current = await api.chatSend(ctx, sessionRef.current ?? undefined);
    } catch (e: any) {
      patchLast((m) => ({ ...m, text: "⚠️ " + String(e?.message ?? e) }));
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="row" style={{ justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        <h3 style={{ margin: 0 }}>💬 Chat with Claude about this stage</h3>
        <button className="sm ghost">{open ? "hide ▾" : "show ▸"}</button>
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
          {chat.length > 0 && (
            <div className="chat-log" style={{ maxHeight: "30vh", marginBottom: 8 }}>
              {chat.map((m, i) => (
                <div key={i} className={"bubble " + (m.role === "you" ? "user" : "")}>
                  <div className="who">{m.role}</div>
                  {m.text ? <div className="bubble-text">{m.text}</div> : (m.role === "claude" && busy && <span className="faint spin">▮ working…</span>)}
                  {m.tools.length > 0 && <div className="tools-row">{m.tools.map((t, j) => <span key={j} className="tag">🔧 {t.replace("mcp__songsmith__", "")}</span>)}</div>}
                </div>
              ))}
            </div>
          )}
          <div className="row" style={{ gap: 8 }}>
            <input className="grow" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={`Ask Claude to change the ${STAGE_LABELS[stageType]?.toLowerCase() ?? "stage"}…`} />
            <button className="primary" onClick={send} disabled={busy || !input.trim()}>{busy ? "…" : "Send"}</button>
          </div>
          <p className="faint" style={{ marginTop: 6 }}>Claude edits this stage over MCP and it reloads here when it saves.</p>
        </div>
      )}
    </div>
  );
}
