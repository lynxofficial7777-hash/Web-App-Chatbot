/**
 * ChatInterface.jsx
 * -----------------
 * Main chat UI panel.
 * Streams agent responses via SSE and renders message history.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import MessageBubble from "./MessageBubble";
import { streamChat } from "../services/api";

const QUICK_PROMPTS = [
  "Check refund for ORD001",
  "I need a refund for ORD003 — defective product",
  "Can I return ORD009? I changed my mind",
  "Process refund for Rahul Verma",
  "What is your refund policy?",
];

export default function ChatInterface({ onReasoningEvent, sessionId, onSessionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const cleanupRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    (text) => {
      const messageText = (text || input).trim();
      if (!messageText || isStreaming) return;

      setInput("");
      setIsStreaming(true);

      // Add user message immediately
      const userMsg = {
        role: "user",
        content: messageText,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Add placeholder agent message
      const agentPlaceholderMsg = {
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, agentPlaceholderMsg]);

      let currentSessionId = sessionId;

      const cleanup = streamChat(
        messageText,
        currentSessionId,
        // onEvent
        (type, data) => {
          if (type === "session") {
            currentSessionId = data.session_id;
            onSessionId(data.session_id);
          } else if (type === "final_answer") {
            // Replace placeholder with real answer
            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (updated[lastIdx]?.isStreaming) {
                updated[lastIdx] = {
                  role: "assistant",
                  content: data.content,
                  timestamp: new Date().toISOString(),
                  isStreaming: false,
                };
              }
              return updated;
            });
            onReasoningEvent({ ...data, timestamp: new Date().toISOString() });
          } else if (type === "error") {
            setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (updated[lastIdx]?.isStreaming) {
                updated[lastIdx] = {
                  role: "assistant",
                  content: `⚠️ Error: ${data.content}`,
                  timestamp: new Date().toISOString(),
                  isStreaming: false,
                };
              }
              return updated;
            });
            onReasoningEvent({ ...data, timestamp: new Date().toISOString() });
          } else {
            // Reasoning event → pass to admin dashboard
            onReasoningEvent({ ...data, timestamp: new Date().toISOString() });
          }
        },
        // onDone
        () => {
          setIsStreaming(false);
          cleanupRef.current = null;
        },
        // onError
        (err) => {
          console.error("SSE error:", err);
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (updated[lastIdx]?.isStreaming) {
              updated[lastIdx] = {
                role: "assistant",
                content: "⚠️ Connection error. Please check the backend is running.",
                timestamp: new Date().toISOString(),
                isStreaming: false,
              };
            }
            return updated;
          });
          setIsStreaming(false);
        }
      );

      cleanupRef.current = cleanup;
    },
    [input, isStreaming, sessionId, onReasoningEvent, onSessionId]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearChat = () => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setMessages([]);
    setIsStreaming(false);
    onSessionId(null);
  };

  return (
    <>
      {/* Chat header */}
      <div className="chat-header">
        <div className="chat-header-avatar">🤖</div>
        <div className="chat-header-info">
          <h2>AI Support Agent</h2>
          <p>Powered by LangGraph + Gemini · {isStreaming ? "⚡ Processing…" : "Ready"}</p>
        </div>
        {messages.length > 0 && (
          <button
            className="btn-ghost"
            onClick={handleClearChat}
            style={{ marginLeft: "auto" }}
            id="clear-chat-btn"
          >
            🗑 Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="chat-messages" id="chat-messages-container">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <h3>AI Customer Support Agent</h3>
            <p>
              Ask me to process a refund, check order status, or answer questions
              about the refund policy. I'll look up the customer, validate the policy,
              and process the decision in real time.
            </p>
            <div className="quick-prompts">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className="quick-prompt-btn"
                  onClick={() => sendMessage(prompt)}
                  id={`quick-${prompt.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) =>
              msg.isStreaming ? (
                <div key={i} className="message-row agent">
                  <div className="message-avatar agent">🤖</div>
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              ) : (
                <MessageBubble key={i} message={msg} />
              )
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-area">
        <div className="chat-input-container" id="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            id="chat-input"
            placeholder="Type your message… (e.g. 'Check refund for ORD005')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isStreaming}
          />
          <button
            className="send-btn"
            id="send-message-btn"
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            title="Send message (Enter)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="input-hint">
          Press <kbd style={{ fontFamily: "var(--font-mono)", fontSize: "10px", background: "var(--color-bg-elevated)", padding: "1px 5px", borderRadius: "3px", border: "1px solid var(--color-border)" }}>Enter</kbd> to send ·{" "}
          <kbd style={{ fontFamily: "var(--font-mono)", fontSize: "10px", background: "var(--color-bg-elevated)", padding: "1px 5px", borderRadius: "3px", border: "1px solid var(--color-border)" }}>Shift+Enter</kbd> for new line
        </p>
      </div>
    </>
  );
}
