import { useEffect, useRef, useState } from "react";
import { api, listen, inTauri } from "../ipc/api";

type Msg = { role: "user" | "assistant"; text: string; tools: string[] };

/**
 * Chat with Claude (your Claude Code subscription) running headless with this
 * app's MCP server attached — so Claude can read and update the production
 * workflow (presets, videos, stages, artifacts) as you talk. This is the
 * harness: Claude is the engine, the app is the cockpit.
 */
export function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // mutate the last (assistant) message
  const patchLast = (fn: (m: Msg) => Msg) =>
    setMessages((ms) => ms.map((m, i) => (i === ms.length - 1 ? fn(m) : m)));

  useEffect(() => {
    if (!inTauri) return;
    let unEvent = () => {};
    let unDone = () => {};
    let unErr = () => {};
    (async () => {
      unEvent = await listen<{ event: any }>("chat_event", ({ event }) => {
        const t = event?.type;
        if (t === "stream_event") {
          const d = event.event?.delta;
          if (event.event?.type === "content_block_delta" && d?.type === "text_delta") {
            patchLast((m) => ({ ...m, text: m.text + (d.text ?? "") }));
          }
        } else if (t === "assistant") {
          const blocks = event.message?.content ?? [];
          const tools = blocks.filter((b: any) => b.type === "tool_use").map((b: any) => b.name);
          if (tools.length) patchLast((m) => ({ ...m, tools: [...m.tools, ...tools] }));
        } else if (t === "result") {
          patchLast((m) => (m.text.trim() ? m : { ...m, text: event.result ?? "" }));
        }
      });
      unDone = await listen<{}>("chat_done", () => setSending(false));
      unErr = await listen<{ error: string }>("chat_error", (p) => {
        setError(p.error);
        setSending(false);
      });
    })();
    return () => {
      unEvent();
      unDone();
      unErr();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setInput("");
    setMessages((ms) => [...ms, { role: "user", text, tools: [] }, { role: "assistant", text: "", tools: [] }]);
    setSending(true);
    try {
      const sid = await api.chatSend(text, sessionRef.current ?? undefined);
      sessionRef.current = sid;
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setSending(false);
    }
  };

  if (!inTauri) {
    return (
      <div className="banner warn">
        The AI chat runs only in the desktop app (it spawns the <code>claude</code> CLI with the
        harness MCP server). Launch with <code>npx tauri dev</code>.
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="chat-log" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty">
            Ask Claude to drive your workflow — e.g. “list my videos”, “start the Idea stage for the
            Coding channel”, or “draft the Holy Trifecta and save it”.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={"bubble " + m.role}>
            <div className="who">{m.role === "user" ? "you" : "claude"}</div>
            {m.text ? (
              <div className="bubble-text">{m.text}</div>
            ) : (
              m.role === "assistant" && sending && <span className="faint spin">▮ thinking…</span>
            )}
            {m.tools.length > 0 && (
              <div className="tools-row">
                {m.tools.map((t, j) => (
                  <span key={j} className="tag">🔧 {t.replace("mcp__songsmith__", "")}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <div className="banner err">{error}</div>}

      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
          placeholder="Message Claude…  (⌘/Ctrl+Enter to send)"
          rows={2}
        />
        <button className="primary" onClick={send} disabled={sending || !input.trim()}>
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
