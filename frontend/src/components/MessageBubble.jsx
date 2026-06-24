/**
 * MessageBubble.jsx
 * -----------------
 * Renders a single chat message (user or agent).
 */

import { useState } from "react";

function formatTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({ message }) {
  const { role, content, timestamp } = message;
  const isUser = role === "user";

  return (
    <div className={`message-row ${isUser ? "user" : "agent"}`}>
      {/* Avatar */}
      <div className={`message-avatar ${isUser ? "user" : "agent"}`}>
        {isUser ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z"/><line x1="8" y1="15" x2="8" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
        {/* Bubble */}
        <div className={`message-bubble ${isUser ? "user" : "agent"}`}>
          {content}
        </div>

        {/* Meta */}
        <div className="message-meta">
          <span>{isUser ? "You" : "AI Agent"}</span>
          <span>·</span>
          <span>{formatTime(timestamp)}</span>
        </div>
      </div>
    </div>
  );
}
