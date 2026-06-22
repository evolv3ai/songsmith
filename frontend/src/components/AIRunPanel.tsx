import { useEffect, useRef, useState } from "react";
import { api, listen, STAGE_LABELS } from "../ipc/api";

const SEED_HINT: Record<string, string> = {
  concept: "Optional: a title, a line, or a feeling to build the concept around.",
  structure: "Optional: a structure you have in mind (e.g. verse-chorus-verse-bridge-chorus).",
  chords: "Optional: a chord loop you already have (e.g. Am F C G).",
  lyrics: "Optional: a chorus line or hook you want to keep.",
  prompt: "Optional: extra direction for the generator (energy, instrumentation).",
};

export function AIRunPanel({
  stageId,
  stageType,
  hasArtifact,
  approved,
  onChanged,
}: {
  stageId: string;
  stageType: string;
  hasArtifact: boolean;
  approved: boolean;
  onChanged: () => void;
}) {
  const [seed, setSeed] = useState("");
  const [stream, setStream] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef("");

  useEffect(() => {
    setStream("");
    setError(null);
    streamRef.current = "";
    setSeed("");
  }, [stageId]);

  useEffect(() => {
    let un1 = () => {};
    let un2 = () => {};
    (async () => {
      un1 = await listen<{ stage_id: string; token: string }>("stage_token", (p) => {
        if (p.stage_id !== stageId) return;
        streamRef.current += p.token;
        setStream(streamRef.current);
      });
      un2 = await listen<{ stage_id: string }>("stage_done", (p) => {
        if (p.stage_id !== stageId) return;
        setRunning(false);
        onChanged();
      });
    })();
    return () => { un1(); un2(); };
  }, [stageId]);

  const run = async () => {
    setRunning(true);
    setError(null);
    setStream("");
    streamRef.current = "";
    try {
      await api.runStage(stageId, seed || undefined);
      setRunning(false);
      onChanged();
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setRunning(false);
    }
  };
  const approve = async () => { await api.approveStage(stageId); onChanged(); };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>Co-write with Claude</h3>
      <label>Your seed ({STAGE_LABELS[stageType]})</label>
      <textarea value={seed} onChange={(e) => setSeed(e.target.value)} placeholder={SEED_HINT[stageType]} />

      <div className="row" style={{ marginTop: 10, gap: 8 }}>
        <button className="primary" onClick={run} disabled={running}>
          {running ? (<><span className="spin">▮</span> Running…</>) : hasArtifact ? "Re-run / refine" : "Run stage"}
        </button>
        {hasArtifact && (
          <button onClick={approve} disabled={approved}>{approved ? "Approved ✓" : "Approve & advance"}</button>
        )}
      </div>

      {error && <div className="banner err" style={{ marginTop: 10 }}>{error}</div>}
      {(running || stream) && (
        <>
          <label>Live output</label>
          <div className="stream">{stream || <span className="faint">waiting for Claude…</span>}</div>
        </>
      )}
    </div>
  );
}
