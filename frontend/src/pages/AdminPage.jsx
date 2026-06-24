import { useState, useEffect } from "react";
import AdminDashboard from "../components/AdminDashboard";

export default function AdminPage() {
  const [reasoningLog, setReasoningLog] = useState([]);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    // Poll for latest session logs every 3 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:8000/sessions");
        const data = await res.json();
        if (data.sessions && data.sessions.length > 0) {
          const latest = data.sessions[data.sessions.length - 1];
          setSessionId(latest.session_id);
          const histRes = await fetch(`http://localhost:8000/history/${latest.session_id}`);
          const histData = await histRes.json();
          setReasoningLog(histData.reasoning_log || []);
        }
      } catch (e) {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ height: "100vh", background: "#0a0e1a", fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column" }}>
      <nav style={{ background: "#0f1629", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(79,127,255,0.3)", flexShrink: 0 }}>
        <div style={{ color: "white", fontSize: "18px", fontWeight: 700 }}>ShopEase Admin</div>
        <span style={{ color: "#4f7fff", fontSize: "13px", cursor: "pointer" }} onClick={() => window.location.href="/"}>← Back to Store</span>
      </nav>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <AdminDashboard reasoningLog={reasoningLog} sessionId={sessionId} />
      </div>
    </div>
  );
}