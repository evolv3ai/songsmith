import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../ipc/api";
import type { Settings } from "../ipc/generated";

export function SettingsPage() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.getSettings });
  const tools = useQuery({ queryKey: ["tools"], queryFn: api.listTools });
  const mcp = useQuery({ queryKey: ["mcp"], queryFn: api.mcpConfig });
  const status = useQuery({ queryKey: ["claude"], queryFn: api.claudeStatus });
  const [form, setForm] = useState<Settings | null>(null);
  const [saved, setSaved] = useState("");

  useEffect(() => { if (settings.data && !form) setForm(settings.data); }, [settings.data]);
  const save = useMutation({ mutationFn: () => api.setSettings(form!), onSuccess: () => setSaved("Saved.") });

  if (!form) return <div className="empty">Loading…</div>;
  const set = (k: keyof Settings) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Settings</h1>
          <span className="muted">The engine is Claude — your Claude Code subscription, via MCP.</span>
        </div>
      </div>

      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="card">
          <h2>Claude engine</h2>
          <p className="muted">A harness around Claude for songwriters. No local model — Claude works through the <code>claude</code> CLI and this app's MCP server.</p>
          <div className="kv" style={{ margin: "10px 0" }}>
            <span className="k">CLI</span>
            <span>
              {status.data?.found ? <span className="badge done">found</span> : <span className="badge" style={{ color: "var(--danger)" }}>not found</span>}{" "}
              {status.data?.version && <span className="faint">{status.data.version}</span>}
            </span>
            <span className="k">Path</span>
            <span className="faint">{status.data?.bin || "claude (on PATH)"}</span>
          </div>
          {!status.data?.found && (
            <div className="banner err">The <code>claude</code> CLI wasn't found. Install Claude Code and run <code>claude</code> once to sign in.</div>
          )}
          <label>Model override (optional)</label>
          <input value={form.claude_model} onChange={set("claude_model")} placeholder="empty = default · or opus / sonnet" style={{ width: "100%" }} />
          <div className="row" style={{ marginTop: 12, gap: 8 }}>
            <button className="primary" onClick={() => save.mutate()}>Save</button>
            {saved && <span className="faint">{saved}</span>}
          </div>
        </div>

        <div>
          <div className="card">
            <h2>MCP connection</h2>
            <p className="muted">The Chat tab wires this automatically. To drive the harness from your own terminal:</p>
            <label>claude mcp add</label>
            <div className="artifact-text" style={{ maxHeight: "none" }}>{mcp.data?.command_hint}</div>
            <label>App database</label>
            <div className="artifact-text" style={{ maxHeight: "none" }}>{mcp.data?.db_path}</div>
          </div>
          <div className="card">
            <h2>Tool registry</h2>
            <p className="muted">{tools.data?.length ?? 0} tools — one registry for the UI, the agent, and Claude over MCP.</p>
            <div style={{ maxHeight: 220, overflow: "auto" }}>
              {tools.data?.map((t) => (
                <div key={t.name} className="row" style={{ justifyContent: "space-between", padding: "3px 0" }}>
                  <code>{t.name}</code>
                  {t.destructive && <span className="badge" style={{ color: "var(--danger)" }}>destructive</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
