import { useState, useEffect, useRef, useCallback } from "react";
import { streamChat } from "../services/api";

// ---------------------------------------------------------------------------
// Language Detection (used to pass lang param to SSE URL)
// ---------------------------------------------------------------------------

/**
 * Detect language from a text string using Unicode range checks.
 * Falls back to navigator.language for browser locale.
 *
 * Returns: { code: "en-US"|"tam-IN"|"hin-IN" }
 */
function detectLanguage(text) {
  if (text) {
    // Tamil: Unicode block U+0B80–U+0BFF
    if (/[\u0B80-\u0BFF]/.test(text)) return { code: "tam-IN" };
    // Hindi/Devanagari: Unicode block U+0900–U+097F
    if (/[\u0900-\u097F]/.test(text)) return { code: "hin-IN" };
  }
  const navLang = (navigator.language || "en-US").toLowerCase();
  if (navLang.startsWith("ta")) return { code: "tam-IN" };
  if (navLang.startsWith("hi")) return { code: "hin-IN" };
  return { code: "en-US" };
}

// ---------------------------------------------------------------------------
// Refund Decision Parser
// ---------------------------------------------------------------------------

/**
 * Scans an assistant message for refund decision signals.
 * Returns null if no decision found, otherwise returns a structured object.
 */
function parseRefundDecision(content) {
  if (!content || typeof content !== "string") return null;

  const upper = content.toUpperCase();
  const hasApproved = /\bAPPROVED\b/.test(upper);
  const hasDenied   = /\bDENIED\b/.test(upper);

  if (!hasApproved && !hasDenied) return null;

  const decision = hasApproved ? "APPROVED" : "DENIED";

  // Extract order ID: ORD followed by digits
  const orderMatch = content.match(/\b(ORD\d+)\b/i);
  const orderId = orderMatch ? orderMatch[1].toUpperCase() : null;

  // Extract amount: Rs./₹ followed by digits (with optional commas)
  const amountMatch = content.match(/(?:Rs\.?|₹)\s*([\d,]+(?:\.\d+)?)/i);
  const amount = amountMatch ? amountMatch[1].replace(/,/g, "") : null;

  // Extract reference ID: REF-ORD... pattern
  const refMatch = content.match(/\b(REF-[A-Z0-9-]+)\b/i);
  const refId = refMatch ? refMatch[1].toUpperCase() : null;

  // Extract email address
  const emailMatch = content.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
  const email = emailMatch ? emailMatch[1] : null;

  return { decision, orderId, amount, refId, email };
}

// ---------------------------------------------------------------------------
// Refund Status Card
// ---------------------------------------------------------------------------

function RefundStatusCard({ info }) {
  const isApproved  = info.decision === "APPROVED";
  const accentColor = isApproved ? "#22c55e" : "#f87171";
  const badgeBg     = isApproved ? "rgba(34,197,94,0.15)" : "rgba(248,113,113,0.15)";

  const row = (label, value) =>
    value ? (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "4px 0",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          fontSize: "11px",
        }}
      >
        <span style={{ color: "#6b7fa8", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "10px" }}>
          {label}
        </span>
        <span style={{ color: "#d0d8f0", fontFamily: "monospace", fontWeight: 500 }}>{value}</span>
      </div>
    ) : null;

  return (
    <div
      style={{
        marginTop: "8px",
        background: "#0d1526",
        border: "1px solid rgba(255,255,255,0.08)",
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: "8px",
        padding: "12px 14px",
        fontSize: "12px",
        lineHeight: "1.6",
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          paddingBottom: "8px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <span style={{ color: "#8b9cc8", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Refund Request
        </span>
        <span
          style={{
            background: badgeBg,
            color: accentColor,
            fontSize: "10px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "9999px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {info.decision}
        </span>
      </div>

      {/* Data rows */}
      {row("Order", info.orderId)}
      {info.amount && row("Amount", `Rs.${Number(info.amount).toLocaleString()}`)}
      {isApproved && row("Timeline", "5-7 business days")}
      {info.refId && row("Ref", info.refId)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email Confirmation Toast
// ---------------------------------------------------------------------------

function EmailToast({ email, visible }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        top: "60px",
        left: "12px",
        right: "12px",
        background: "#1e3a5f",
        borderLeft: "3px solid #4f7fff",
        borderRadius: "6px",
        padding: "8px 12px",
        fontSize: "11px",
        color: "white",
        zIndex: 10,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        animation: visible ? "toast-in 0.3s ease forwards" : "toast-out 0.3s ease forwards",
        pointerEvents: "none",
      }}
    >
      Confirmation email sent to{" "}
      <span style={{ fontWeight: 700, color: "#93b4ff" }}>{email}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ChatWidget component
// ---------------------------------------------------------------------------

export default function ChatWidget({ open, onToggle }) {
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId]   = useState(null);

  // Email toast state
  const [toast, setToast] = useState(null); // { email, visible }

  const messagesEndRef = useRef(null);
  const cleanupRef     = useRef(null);
  const inputRef       = useRef(null);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --------------------------------------------------------------------------
  // Email toast helper
  // --------------------------------------------------------------------------

  const showEmailToast = useCallback((email) => {
    const displayEmail = email || "your registered email";
    setToast({ email: displayEmail, visible: true });
    // Begin slide-out after 4 s
    const hideTimer  = setTimeout(() => setToast((prev) => prev ? { ...prev, visible: false } : null), 4000);
    // Remove from DOM after animation completes (300 ms)
    const clearTimer = setTimeout(() => setToast(null), 4350);
    return () => { clearTimeout(hideTimer); clearTimeout(clearTimer); };
  }, []);

  // --------------------------------------------------------------------------
  // Send message
  // --------------------------------------------------------------------------

  const sendMessage = useCallback(
    (text) => {
      const msg = (text || input).trim();
      if (!msg || isStreaming) return;

      // Detect language to pass to backend
      const lang = detectLanguage(msg);

      setInput("");
      setIsStreaming(true);

      setMessages((prev) => [...prev, { role: "user", content: msg }]);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", isStreaming: true },
      ]);

      let currentSession = sessionId;

      cleanupRef.current = streamChat(
        msg,
        currentSession,
        (type, data) => {
          if (type === "session") {
            setSessionId(data.session_id);
            currentSession = data.session_id;
          } else if (type === "final_answer") {
            const content = data.content || "";

            // Parse refund decision from message
            const refundInfo = parseRefundDecision(content);

            setMessages((prev) => {
              const updated = [...prev];
              const last = updated.length - 1;
              if (updated[last]?.isStreaming) {
                updated[last] = {
                  role: "assistant",
                  content,
                  isStreaming: false,
                  refundInfo, // may be null
                };
              }
              return updated;
            });

            // Show email toast after 2 s if APPROVED
            if (refundInfo?.decision === "APPROVED") {
              const toastTimer = setTimeout(() => showEmailToast(refundInfo.email), 2000);
              cleanupRef._toastTimer = toastTimer;
            }
          } else if (type === "error") {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated.length - 1;
              if (updated[last]?.isStreaming) {
                updated[last] = {
                  role: "assistant",
                  content: "Error: " + data.content,
                  isStreaming: false,
                  refundInfo: null,
                };
              }
              return updated;
            });
          }
        },
        () => { setIsStreaming(false); },
        () => { setIsStreaming(false); },
        lang.code // pass detected lang to SSE URL
      );
    },
    [input, isStreaming, sessionId, showEmailToast]
  );

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <>
      {/* Floating Chat Bubble */}
      <button
        id="chat-widget-toggle"
        onClick={onToggle}
        aria-label={open ? "Close chat" : "Open chat"}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #4f7fff, #a855f7)",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(79,127,255,0.5)",
          zIndex: 1000,
          transition: "transform 0.2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div
          id="chat-widget-window"
          role="dialog"
          aria-label="ShopEase support chat"
          style={{
            position: "fixed",
            bottom: "96px",
            right: "24px",
            width: "380px",
            height: "520px",
            background: "#0f1629",
            borderRadius: "16px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
            border: "1px solid rgba(79,127,255,0.3)",
            display: "flex",
            flexDirection: "column",
            zIndex: 999,
            fontFamily: "Inter, sans-serif",
          }}
        >
          {/* Email confirmation toast */}
          {toast && <EmailToast email={toast.email} visible={toast.visible} />}

          {/* Header */}
          <div
            style={{
              padding: "16px",
              background: "linear-gradient(135deg, #4f7fff, #a855f7)",
              borderRadius: "16px 16px 0 0",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
              <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2zm-3 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
            </svg>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: "14px" }}>
                ShopEase Support
              </div>
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "11px" }}>
                AI Refund Agent · Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            id="chat-messages-list"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {messages.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  color: "#4a5578",
                  fontSize: "13px",
                  marginTop: "40px",
                }}
              >
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="#4a5578"
                  style={{ marginBottom: "12px" }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                </svg>
                <p>Hi, I am your AI support agent.</p>
                <p style={{ marginTop: "8px" }}>
                  Ask me about refunds using your order ID (e.g. ORD001)
                </p>
                <div
                  style={{
                    marginTop: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {[
                    "Refund for ORD003 - defective",
                    "Check ORD001 status",
                    "What is your refund policy?",
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      style={{
                        background: "#141d35",
                        border: "1px solid rgba(79,127,255,0.3)",
                        color: "#8b9cc8",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        textAlign: "left",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column" }}>
                  {/* Message bubble */}
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "12px",
                      fontSize: "13px",
                      lineHeight: "1.5",
                      background: m.role === "user" ? "#4f7fff" : "#141d35",
                      color: m.role === "user" ? "white" : "#d0d8f0",
                      border: m.role === "user" ? "none" : "1px solid rgba(79,127,255,0.2)",
                    }}
                  >
                    {m.isStreaming ? (
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        {[0, 1, 2].map((j) => (
                          <div
                            key={j}
                            style={{
                              width: "6px",
                              height: "6px",
                              background: "#4f7fff",
                              borderRadius: "50%",
                              animation: `bounce 1.2s ${j * 0.2}s infinite`,
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>

                  {/* Refund Status Card (assistant messages only) */}
                  {m.role === "assistant" && m.refundInfo && !m.isStreaming && (
                    <RefundStatusCard info={m.refundInfo} />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input row */}
          <div
            style={{
              padding: "12px",
              borderTop: "1px solid rgba(79,127,255,0.2)",
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <input
              ref={inputRef}
              id="chat-message-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              disabled={isStreaming}
              aria-label="Message input"
              style={{
                flex: 1,
                background: "#141d35",
                border: "1px solid rgba(79,127,255,0.3)",
                borderRadius: "8px",
                padding: "10px 12px",
                color: "white",
                fontSize: "13px",
                outline: "none",
                fontFamily: "Inter, sans-serif",
                transition: "border-color 0.2s",
              }}
            />

            {/* Send button */}
            <button
              id="chat-send-button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || isStreaming}
              aria-label="Send message"
              style={{
                background: "linear-gradient(135deg, #4f7fff, #a855f7)",
                border: "none",
                borderRadius: "8px",
                padding: "10px 14px",
                color: "white",
                cursor: !input.trim() || isStreaming ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: !input.trim() || isStreaming ? 0.5 : 1,
                flexShrink: 0,
                transition: "opacity 0.2s",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }

        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes toast-out {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-8px); }
        }
      `}</style>
    </>
  );
}