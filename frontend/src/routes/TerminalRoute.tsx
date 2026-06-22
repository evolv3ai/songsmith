import { ChatPanel } from "../components/ChatPanel";

export function ChatRoute() {
  return (
    <div className="chat-page">
      <div className="topbar">
        <div>
          <h1>Chat</h1>
          <span className="muted">
            Talk to Claude — it drives the app's tools over MCP to walk and update your workflow.
          </span>
        </div>
      </div>
      <ChatPanel />
    </div>
  );
}
