/**
 * api.js
 * ------
 * API client for the FastAPI backend.
 * Handles both regular fetch calls and SSE streaming connections.
 */

// In development: falls back to localhost.
// In production: set VITE_API_URL in Vercel environment variables
// to your Render backend URL (e.g. https://shopease-agent.onrender.com)
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Stream a chat message via SSE.
 * Calls onEvent(type, data) for each SSE event received.
 * Returns a cleanup function to abort the stream.
 *
 * @param {string} message   - User's message
 * @param {string|null} sessionId - Existing session ID (null = new session)
 * @param {function} onEvent - Callback: (type: string, data: object) => void
 * @param {function} onDone  - Called when stream ends
 * @param {function} onError - Called on error
 * @param {string|null} lang - BCP-47 language code detected on the client (e.g. "en-US", "tam-IN")
 */
export function streamChat(message, sessionId, onEvent, onDone, onError, lang = null) {
  const params = new URLSearchParams({ message });
  if (sessionId) params.set("session_id", sessionId);
  if (lang)      params.set("lang", lang);

  const url = `${BASE_URL}/chat/stream?${params.toString()}`;

  const eventSource = new EventSource(url);

  // Session established
  eventSource.addEventListener("session", (e) => {
    const data = JSON.parse(e.data);
    onEvent("session", data);
  });

  // Agent thinking / reasoning
  eventSource.addEventListener("agent_thinking", (e) => {
    const data = JSON.parse(e.data);
    onEvent("agent_thinking", data);
  });

  // Tool being called
  eventSource.addEventListener("tool_call", (e) => {
    const data = JSON.parse(e.data);
    onEvent("tool_call", data);
  });

  // Final answer from agent
  eventSource.addEventListener("final_answer", (e) => {
    const data = JSON.parse(e.data);
    onEvent("final_answer", data);
  });

  // Error event
  eventSource.addEventListener("error", (e) => {
    if (e.data) {
      try {
        const data = JSON.parse(e.data);
        onEvent("error", data);
      } catch (_) {
        // EventSource connection error (not a server error event)
      }
    }
  });

  // Stream done
  eventSource.addEventListener("done", () => {
    eventSource.close();
    onDone();
  });

  // Connection error
  eventSource.onerror = (err) => {
    eventSource.close();
    onError(err);
  };

  // Return cleanup function
  return () => eventSource.close();
}

/**
 * Fetch all CRM customers.
 */
export async function fetchCustomers() {
  const res = await fetch(`${BASE_URL}/customers`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Fetch conversation history for a session.
 */
export async function fetchHistory(sessionId) {
  const res = await fetch(`${BASE_URL}/history/${sessionId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Clear conversation history for a session.
 */
export async function clearHistory(sessionId) {
  const res = await fetch(`${BASE_URL}/history/${sessionId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Check backend health.
 */
export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
