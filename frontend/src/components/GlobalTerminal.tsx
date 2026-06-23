import { ChatPanel } from "./ChatPanel";

/**
 * One global chat with Claude, docked at the bottom of the app and reachable
 * from every page — the harness "terminal". Replaces the per-stage chat boxes
 * and the old left-menu Chat route.
 */
export function GlobalTerminal({ open, onToggle, songId }: { open: boolean; onToggle: () => void; songId?: string }) {
  return (
    <div className={"global-terminal" + (open ? " open" : "")}>
      <button className="terminal-tab" onClick={onToggle}>
        <span>💬 Chat with Claude</span>
        <span className="faint">{open ? "▾ hide" : "▸ open"}</span>
      </button>
      {open && (
        <div className="terminal-body">
          <ChatPanel songId={songId} />
        </div>
      )}
    </div>
  );
}
