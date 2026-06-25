/**
 * AdminDashboard.jsx
 * ------------------
 * Right-side admin panel showing:
 *   Tab 1: Live agent reasoning log (SSE events)
 *   Tab 2: CRM customer database table
 *   Tab 3: Stats overview
 *   Tab 4: Refund history (fetched from GET /refund-history)
 */

import { useState, useEffect, useRef } from "react";
import ReasoningLog from "./ReasoningLog";
import { fetchCustomers } from "../services/api";

// Use same env variable as api.js — falls back to localhost in development
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO date string to a compact local representation. */
function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminDashboard({ reasoningLog, sessionId }) {
  const [activeTab, setActiveTab] = useState("reasoning");
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Refund history state
  const [refundHistory, setRefundHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  const logEndRef = useRef(null);

  // Load customers when CRM tab selected
  useEffect(() => {
    if (activeTab === "crm" && customers.length === 0) {
      setLoadingCustomers(true);
      fetchCustomers()
        .then((data) => setCustomers(data.customers || []))
        .catch(console.error)
        .finally(() => setLoadingCustomers(false));
    }
  }, [activeTab]);

  // Load refund history when History tab selected
  useEffect(() => {
    if (activeTab === "history") {
      setLoadingHistory(true);
      setHistoryError(null);
      fetch(`${BASE_URL}/refund-history`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          return res.json();
        })
        .then((data) => setRefundHistory(data.refunds || []))
        .catch((err) => setHistoryError(err.message || "Failed to load refund history."))
        .finally(() => setLoadingHistory(false));
    }
  }, [activeTab]);

  // Stats derived from reasoning log
  const thinkingCount = reasoningLog.filter((e) => e.type === "agent_thinking").length;
  const toolCallCount = reasoningLog.filter((e) => e.type === "tool_call").length;

  /**
   * Extract refund decision counts from the reasoning log.
   *
   * Primary source: tool_call entries where tool === "process_refund".
   * The `result` field is a JSON string returned by the backend tool;
   * we parse it and read `record.decision` which is "APPROVED" or "DENIED".
   *
   * Fallback source: final_answer entries whose content string contains
   * the decision keyword, used when a tool_call result is unavailable
   * (e.g. agent answered without calling process_refund).
   */
  const refundDecisionsFromTools = reasoningLog
    .filter((e) => e.type === "tool_call" && e.tool === "process_refund")
    .map((e) => {
      try {
        const parsed =
          typeof e.result === "string" ? JSON.parse(e.result) : e.result;
        return parsed?.record?.decision ?? null;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const approvedFromTools = refundDecisionsFromTools.filter(
    (d) => d === "APPROVED"
  ).length;
  const deniedFromTools = refundDecisionsFromTools.filter(
    (d) => d === "DENIED"
  ).length;

  // Fallback: scan final_answer entries only for sessions that had no
  // process_refund tool call (avoids double-counting).
  const hasToolDecision = refundDecisionsFromTools.length > 0;
  const approvedFromFinalAnswer = hasToolDecision
    ? 0
    : reasoningLog.filter(
        (e) =>
          e.type === "final_answer" &&
          typeof e.content === "string" &&
          /\bAPPROVED\b/.test(e.content)
      ).length;
  const deniedFromFinalAnswer = hasToolDecision
    ? 0
    : reasoningLog.filter(
        (e) =>
          e.type === "final_answer" &&
          typeof e.content === "string" &&
          /\bDENIED\b/.test(e.content)
      ).length;

  const approvedCount = approvedFromTools + approvedFromFinalAnswer;
  const deniedCount = deniedFromTools + deniedFromFinalAnswer;

  return (
    <>
      {/* Header */}
      <div className="admin-header">
        <h2>
          Admin Panel
        </h2>
        {sessionId && (
          <span
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--color-text-muted)",
              background: "var(--color-bg-elevated)",
              padding: "2px 8px",
              borderRadius: "9999px",
              border: "1px solid var(--color-border)",
            }}
          >
            {sessionId.slice(0, 8)}…
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="admin-tabs" role="tablist">
        {[
          { id: "reasoning", label: "Reasoning" },
          { id: "crm",       label: "CRM" },
          { id: "stats",     label: "Stats" },
          { id: "history",   label: "History" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? "active" : ""}`}
            role="tab"
            id={`admin-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Body */}
      <div className="admin-body" id="admin-tab-content">

        {/* ── Reasoning Log ── */}
        {activeTab === "reasoning" && (
          <div className="log-stream" id="reasoning-log-stream">
            {reasoningLog.length === 0 ? (
              <div className="log-empty">
                <p>
                  Agent reasoning steps will appear here in real time as you chat.
                  <br />
                  Each tool call and thinking step is captured live.
                </p>
              </div>
            ) : (
              reasoningLog.map((entry, i) => (
                <ReasoningLog key={i} entry={entry} index={i} />
              ))
            )}
            <div ref={logEndRef} />
          </div>
        )}

        {/* ── CRM Table ── */}
        {activeTab === "crm" && (
          <div id="crm-table-container">
            {loadingCustomers ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)" }}>
                Loading customers...
              </div>
            ) : (
              <div className="crm-table-wrapper">
                <table className="crm-table" id="crm-customers-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Name</th>
                      <th>Product</th>
                      <th>Value</th>
                      <th>Status</th>
                      <th>Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => {
                      const days = Math.floor(
                        (Date.now() - new Date(c.purchase_date).getTime()) / 86400000
                      );
                      return (
                        <tr key={c.id}>
                          <td>
                            <span className="crm-order-id">{c.order_id}</span>
                          </td>
                          <td title={c.name}>{c.name.split(" ")[0]}</td>
                          <td title={c.product}>
                            {c.product.length > 12 ? c.product.slice(0, 12) + "…" : c.product}
                          </td>
                          <td>
                            <span className="crm-amount">₹{c.order_value.toLocaleString()}</span>
                          </td>
                          <td>
                            <span className={`badge-status ${c.status}`}>{c.status}</span>
                          </td>
                          <td>
                            <span
                              style={{
                                color: days > 30 ? "var(--color-error)" : days > 15 ? "var(--color-warning)" : "var(--color-success)",
                                fontFamily: "var(--font-mono)",
                                fontSize: "11px",
                              }}
                            >
                              {days}d
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Stats ── */}
        {activeTab === "stats" && (
          <div id="stats-container">
            <div className="stats-grid" style={{ marginBottom: "16px" }}>
              <div className="stat-card accent">
                <div className="stat-value">{thinkingCount}</div>
                <div className="stat-label">Thinking Steps</div>
              </div>
              <div className="stat-card warning">
                <div className="stat-value">{toolCallCount}</div>
                <div className="stat-label">Tool Calls</div>
              </div>
              <div className="stat-card success">
                <div className="stat-value">{approvedCount}</div>
                <div className="stat-label">Refunds Approved</div>
              </div>
              <div className="stat-card error">
                <div className="stat-value">{deniedCount}</div>
                <div className="stat-label">Refunds Denied</div>
              </div>
            </div>

            {/* Tool breakdown */}
            {toolCallCount > 0 && (
              <div
                style={{
                  background: "var(--color-bg-elevated)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--color-text-muted)",
                    marginBottom: "12px",
                  }}
                >
                  Tool Usage Breakdown
                </div>
                {["lookup_customer", "validate_policy", "process_refund"].map((toolName) => {
                  const count = reasoningLog.filter(
                    (e) => e.type === "tool_call" && e.tool === toolName
                  ).length;
                  const pct = toolCallCount > 0 ? Math.round((count / toolCallCount) * 100) : 0;
                  return (
                    <div key={toolName} style={{ marginBottom: "10px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-warning)" }}>
                          {toolName}
                        </span>
                        <span style={{ color: "var(--color-text-secondary)" }}>
                          {count} calls
                        </span>
                      </div>
                      <div
                        style={{
                          height: "4px",
                          background: "var(--color-bg-base)",
                          borderRadius: "9999px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: "var(--gradient-brand)",
                            borderRadius: "9999px",
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {toolCallCount === 0 && (
              <div className="log-empty">
                <p>Start a conversation to see live stats here.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Refund History ── */}
        {activeTab === "history" && (
          <div id="history-container">
            {loadingHistory ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)" }}>
                Loading refund history...
              </div>
            ) : historyError ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "var(--color-error)",
                  fontSize: "13px",
                }}
              >
                {historyError}
              </div>
            ) : refundHistory.length === 0 ? (
              <div className="log-empty">
                <p>No refunds processed yet.</p>
              </div>
            ) : (
              <div className="crm-table-wrapper">
                <table className="crm-table" id="refund-history-table">
                  <thead>
                    <tr>
                      <th>Record ID</th>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Product</th>
                      <th>Decision</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refundHistory.map((r) => (
                      <tr key={r.record_id}>
                        <td>
                          <span
                            className="crm-order-id"
                            style={{ fontSize: "10px" }}
                            title={r.record_id}
                          >
                            {r.record_id ? r.record_id.slice(0, 16) + "…" : "—"}
                          </span>
                        </td>
                        <td>
                          <span className="crm-order-id">{r.order_id || "—"}</span>
                        </td>
                        <td title={r.customer_name}>
                          {r.customer_name ? r.customer_name.split(" ")[0] : "—"}
                        </td>
                        <td title={r.product}>
                          {r.product
                            ? r.product.length > 12
                              ? r.product.slice(0, 12) + "…"
                              : r.product
                            : "—"}
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              fontSize: "10px",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              background:
                                r.decision === "APPROVED"
                                  ? "rgba(34,197,94,0.15)"
                                  : "rgba(248,113,113,0.15)",
                              color:
                                r.decision === "APPROVED"
                                  ? "#22c55e"
                                  : "#f87171",
                            }}
                          >
                            {r.decision || "—"}
                          </span>
                        </td>
                        <td>
                          <span className="crm-amount">
                            {r.refund_amount !== undefined
                              ? `₹${Number(r.refund_amount).toLocaleString()}`
                              : "—"}
                          </span>
                        </td>
                        <td style={{ fontSize: "10px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                          {fmtDate(r.processed_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
