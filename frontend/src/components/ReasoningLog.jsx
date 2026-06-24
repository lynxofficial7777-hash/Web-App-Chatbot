/**
 * ReasoningLog.jsx
 * ----------------
 * Displays a single agent reasoning step (agent thinking, tool call, final answer, error).
 * Shows in the admin dashboard as a live stream.
 *
 * New fields rendered:
 *   entry.sentiment  (agent_thinking) – sentiment badge
 *   entry.confidence (tool_call)      – confidence progress bar
 */

import { useState } from "react";

const BADGE_LABELS = {
  agent_thinking: "Thinking",
  tool_call:      "Tool Call",
  final_answer:   "Answer",
  error:          "Error",
};

const BADGE_CLASSES = {
  agent_thinking: "agent_thinking",
  tool_call:      "tool_call",
  final_answer:   "final_answer",
  error:          "error",
};

// ---------------------------------------------------------------------------
// Sentiment badge styles
// ---------------------------------------------------------------------------
const SENTIMENT_STYLES = {
  angry: {
    background: "rgba(248,113,113,0.15)",
    color: "#f87171",
  },
  frustrated: {
    background: "rgba(251,191,36,0.15)",
    color: "#fbbf24",
  },
  neutral: {
    background: "rgba(139,156,200,0.15)",
    color: "#8b9cc8",
  },
  positive: {
    background: "rgba(34,211,160,0.15)",
    color: "#22d3a0",
  },
};

function SentimentBadge({ sentiment }) {
  if (!sentiment || !sentiment.sentiment) return null;
  const label = sentiment.sentiment;
  const style = SENTIMENT_STYLES[label] || SENTIMENT_STYLES.neutral;
  const pct = Math.round((sentiment.score || 0) * 100);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "10px",
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: "9999px",
        textTransform: "capitalize",
        marginLeft: "6px",
        ...style,
      }}
    >
      {label}{pct > 0 ? ` ${pct}%` : ""}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Confidence bar
// ---------------------------------------------------------------------------
function ConfidenceBar({ confidence }) {
  if (confidence === undefined || confidence === null) return null;
  const pct = Math.round(confidence * 100);
  const barColor =
    confidence > 0.8
      ? "#22d3a0"
      : confidence > 0.5
      ? "#fbbf24"
      : "#f87171";

  return (
    <div style={{ marginTop: "8px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "10px",
          color: "var(--color-text-muted)",
          marginBottom: "3px",
        }}
      >
        <span>Confidence</span>
        <span style={{ color: barColor, fontWeight: 600 }}>{pct}%</span>
      </div>
      <div
        style={{
          height: "3px",
          background: "var(--color-bg-base)",
          borderRadius: "9999px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: barColor,
            borderRadius: "9999px",
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function safeJson(val) {
  if (typeof val === "string") {
    try { return JSON.stringify(JSON.parse(val), null, 2); }
    catch { return val; }
  }
  return JSON.stringify(val, null, 2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ReasoningLog({ entry, index }) {
  const [expanded, setExpanded] = useState(false);

  const type = entry.type || "agent_thinking";
  const badgeClass = BADGE_CLASSES[type] || "agent_thinking";
  const badgeLabel = BADGE_LABELS[type] || type;

  return (
    <div className={`log-entry ${badgeClass}`} id={`log-entry-${index}`}>
      {/* Header */}
      <div className="log-entry-header">
        <span className={`log-badge ${badgeClass}`}>{badgeLabel}</span>
        <span className="log-timestamp">{formatTime(entry.timestamp)}</span>
      </div>

      {/* Content based on type */}
      {type === "agent_thinking" && (
        <div className="log-content">
          {entry.content && (
            <p style={{ marginBottom: entry.tool_calls?.length ? "8px" : 0 }}>
              {entry.content}
            </p>
          )}
          {entry.tool_calls && entry.tool_calls.length > 0 && (
            <div>
              <div className="log-tool-name">
                Calling: {entry.tool_calls.map((tc) => tc.tool).join(", ")}
              </div>
            </div>
          )}
          {/* Sentiment badge (Feature A) */}
          {entry.sentiment && (
            <div style={{ marginTop: "6px" }}>
              <SentimentBadge sentiment={entry.sentiment} />
            </div>
          )}
        </div>
      )}

      {type === "tool_call" && (
        <div className="log-content">
          <div className="log-tool-name">{entry.tool}</div>

          {/* Args */}
          {entry.args && Object.keys(entry.args).length > 0 && (
            <>
              <div style={{ fontSize: "10px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                ARGS
              </div>
              <div className="log-code">{safeJson(entry.args)}</div>
            </>
          )}

          {/* Result */}
          {entry.result && (
            <>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--color-text-muted)",
                  marginTop: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>RESULT</span>
                <button className="log-expandable-btn" onClick={() => setExpanded(!expanded)}>
                  {expanded ? "▲ collapse" : "▼ expand"}
                </button>
              </div>
              {expanded && (
                <div className="log-code">{safeJson(entry.result)}</div>
              )}
              {!expanded && (
                <div
                  className="log-code"
                  style={{ maxHeight: "60px", overflow: "hidden", cursor: "pointer" }}
                  onClick={() => setExpanded(true)}
                >
                  {safeJson(entry.result).slice(0, 200)}
                  {safeJson(entry.result).length > 200 ? "..." : ""}
                </div>
              )}
            </>
          )}

          {/* Status */}
          {entry.status && (
            <div style={{ marginTop: "6px" }}>
              <span
                style={{
                  fontSize: "10px",
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  background:
                    entry.status === "success"
                      ? "var(--color-success-bg)"
                      : "var(--color-error-bg)",
                  color:
                    entry.status === "success"
                      ? "var(--color-success)"
                      : "var(--color-error)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                {entry.status}
              </span>
            </div>
          )}

          {/* Confidence bar (Feature B) */}
          <ConfidenceBar confidence={entry.confidence} />
        </div>
      )}

      {type === "final_answer" && (
        <div className="log-content" style={{ color: "var(--color-success)" }}>
          {entry.content?.slice(0, 200)}
          {(entry.content?.length || 0) > 200 ? "…" : ""}
        </div>
      )}

      {type === "error" && (
        <div className="log-content" style={{ color: "var(--color-error)" }}>
          {entry.content}
        </div>
      )}
    </div>
  );
}
