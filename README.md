# ShopEase AI Customer Support Agent

![Python](https://img.shields.io/badge/Python-3.14-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.136-green)
![React](https://img.shields.io/badge/React-19-blue)
![LangGraph](https://img.shields.io/badge/LangGraph-1.2-purple)
![Groq](https://img.shields.io/badge/Groq-Llama3.3_70B-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

A **production-grade AI refund processing agent** that handles the full customer support lifecycle — from CRM lookup and policy validation to final APPROVED/DENIED decisions — with zero human intervention. Built to demonstrate how modern AI agents can replace tier-1 support queues while maintaining audit trails, rate limiting, input validation, and real-time reasoning transparency that businesses actually need before deploying AI in production.

Every agent decision is streamed live to an admin dashboard, confidence-scored, sentiment-analysed, and persisted to disk — the kind of operational observability that separates a demo from a deployable system.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 8, React Router 7 |
| **Backend** | FastAPI 0.111, Python 3.14, Uvicorn |
| **Agent** | LangGraph 0.2, LangChain Core, Groq (Llama 3.3 70B) |
| **Rate Limiting** | slowapi (10 req/min on chat endpoints, 60 req/min elsewhere) |
| **Data** | JSON-based CRM (15 customer profiles), atomic-write refund history, plain-text policy |

---

## Features

- AI agent autonomously approves or denies refund requests against a strict, multi-rule policy
- LangGraph agent loop with 3 tools: `lookup_customer`, `validate_policy`, `process_refund`
- Server-Sent Events (SSE) streaming of every agent reasoning step, tool call, and result in real time
- Live admin dashboard with reasoning log, CRM table, stats overview, and full refund history tab
- Sentiment detection on every message — angry/frustrated customers trigger empathetic tone adjustment
- Confidence scoring on every tool call, visualised as a colour-coded progress bar in the admin panel
- Refund status receipt card rendered inline after every APPROVED or DENIED decision
- Email confirmation toast notification on refund approval (2-second delay, 4-second display)
- Persistent refund history saved to disk with atomic writes (zero data loss on server restart)
- Rate limiting, 2,000-character input validation, and null-byte stripping on all chat endpoints
- Multi-language detection (English / Tamil / Hindi) with language hint forwarded to the backend
- Fake e-commerce storefront (ShopEase) for a fully realistic, end-to-end demo context

---

## What Makes This Different

Most AI chatbot demos call an LLM and display the response. This project goes further:

| Capability | Implementation |
|---|---|
| **Sentiment-aware responses** | Pure-Python keyword classifier detects angry/frustrated tone; system prompt adapts empathy level accordingly |
| **Confidence scoring** | Every tool call receives a 0–1 confidence score (`process_refund` scores 1.0 only when decision is unambiguous); displayed as a live bar in the admin panel |
| **Persistent refund history** | Decisions survive server restarts — written atomically via `tempfile` + `os.replace` to prevent corruption |
| **Real-time reasoning transparency** | Every LLM thought, tool argument, and tool result streams to the admin panel as it happens via SSE |
| **Rate limiting** | `slowapi` enforces 10 req/min on `/chat` and `/chat/stream`; returns `429` with `Retry-After` header |
| **Input validation** | `@field_validator` on `ChatRequest`: strips whitespace, enforces 2,000-char limit, removes null bytes and control characters |
| **Refund status receipt** | After any APPROVED/DENIED response, a structured receipt card (order, amount, timeline, ref ID) is rendered inside the chat |
| **Email confirmation toast** | On approval, a slide-in toast notification appears after 2 seconds — pure CSS animation, no library |
| **Multi-language detection** | Unicode range checks detect Tamil (`U+0B80–U+0BFF`) and Hindi (`U+0900–U+097F`); `lang` param passed to SSE URL |

---

## Refund Policy Rules

The agent enforces these rules through the `validate_policy` tool before every decision:

| Rule | Detail |
|---|---|
| **Defective / Wrong item** | Eligible within 30 days of purchase |
| **Change of mind** | Eligible within 7 days only |
| **Wrong size** | Eligible within 15 days |
| **High-value order (> Rs. 10,000)** | Requires manager approval — flagged automatically |
| **Mid-value order (> Rs. 5,000)** | Partial refund only |
| **Allergic reaction** | Eligible with medical proof — automatically flagged for verification |
| **Electronics** | Must be unused and in original packaging |
| **Auto-deny: age** | Purchase older than 30 days is automatically denied regardless of reason |
| **Auto-deny: history** | Customer with 2+ prior refunds is automatically denied |
| **Auto-deny: transit** | Orders currently in transit are ineligible for refund |

---

## Project Structure

```
Web App Chatbot/
├── backend/
│   ├── agent/
│   │   ├── __init__.py
│   │   └── graph.py            # LangGraph agent graph, sentiment detection, confidence scoring
│   ├── data/
│   │   ├── crm.json            # 15 customer profiles (ORD001–ORD015)
│   │   ├── policy.txt          # Refund policy rules
│   │   └── refund_history.json # Persisted refund decisions (auto-created)
│   ├── tools/
│   │   ├── __init__.py
│   │   └── refund_tools.py     # lookup_customer, validate_policy, process_refund + atomic persistence
│   ├── .env                    # GROQ_API_KEY (not committed)
│   ├── __init__.py
│   ├── main.py                 # FastAPI app, SSE endpoint, rate limiting, validation, refund history API
│   └── requirements.txt
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── AdminDashboard.jsx  # Admin panel: reasoning log, CRM table, stats, refund history
    │   │   ├── ChatInterface.jsx   # Full-page chat view used on admin page
    │   │   ├── ChatWidget.jsx      # Floating chat bubble with refund card + email toast
    │   │   ├── MessageBubble.jsx   # Individual message component
    │   │   └── ReasoningLog.jsx    # Renders sentiment badges and confidence bars per step
    │   ├── pages/
    │   │   ├── AdminPage.jsx       # /admin route: chat + admin dashboard
    │   │   └── StorePage.jsx       # / route: fake storefront + chat widget
    │   ├── services/
    │   │   └── api.js              # SSE streaming client + REST helpers + lang param support
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## Setup Instructions

### Backend

> Requires Python 3.11+ and a free [Groq API key](https://console.groq.com/).

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set your Groq API key — create backend/.env with:
GROQ_API_KEY=your_groq_api_key_here

# 5. Start the development server (http://localhost:8000)
uvicorn main:app --reload
```

### Frontend

> Requires Node.js 18+.

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server (http://localhost:5173)
npm run dev
```

Open `http://localhost:5173` for the ShopEase storefront and `http://localhost:5173/admin` for the admin dashboard.

---

## Demo Scenarios

| Scenario | How to Trigger | Expected Outcome |
|---|---|---|
| Standard approval | *"Refund for ORD003 — defective product"* | **APPROVED** — defective item within 30-day window; receipt card shown |
| Policy denial | *"I want a refund for ORD002"* | **DENIED** — "changed my mind" is outside the 7-day window |
| High-value flag | *"Refund for ORD012"* | **Flagged** — order exceeds Rs. 10,000; manager approval required |
| Sentiment response | Send an angry message about a refund | Agent acknowledges frustration before proceeding |
| Admin observability | Open `/admin` while chatting | Every tool call, argument, result, sentiment, and confidence score streams live |
| Refund history | Click the History tab in the admin panel | All persisted decisions loaded from `refund_history.json` |

---

## Architecture

When a user sends a message, the FastAPI `/chat/stream` endpoint opens an SSE connection and invokes the LangGraph agent. The `agent_node` calls Groq's Llama 3.3 70B model with the full conversation history and a system prompt that enforces the three-step refund workflow. Sentiment is detected from the latest user message and attached to the reasoning log entry. If the model decides to use a tool, the graph routes to `tool_node`, which executes the appropriate LangChain tool against the local CRM and policy document, calculates a confidence score, and appends the result to the message history before looping back to the agent. Each reasoning step, tool call, tool result, sentiment, and confidence score is emitted as an SSE event in real time. When the model produces a final response with no pending tool calls, a `final_answer` event is emitted, the stream closes, and — if the decision was APPROVED — the refund record is atomically written to disk and an email toast is scheduled on the frontend.

```
User message
    │
    ▼
FastAPI /chat/stream  ──SSE──▶  Frontend (ChatWidget / ChatInterface)
    │                                │
    ▼                           ReasoningLog (live: sentiment + confidence)
LangGraph agent_node  ◀──────────────────────────────────┐
    │  (tool_calls?)                                      │
    ├──Yes──▶ tool_node                                   │
    │          ├── lookup_customer   (CRM lookup)         │
    │          ├── validate_policy   (policy rules check) │
    │          └── process_refund    (APPROVED / DENIED)──┘
    │              └── atomic write ──▶ refund_history.json
    │
    └──No───▶ final_answer event ──▶ RefundStatusCard + EmailToast
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/chat/stream?message=&session_id=&lang=` | SSE stream: agent reasoning + final answer (10 req/min) |
| `POST` | `/chat` | Non-streaming chat — full response at once (10 req/min) |
| `GET` | `/history/{session_id}` | Retrieve conversation history and reasoning log |
| `DELETE` | `/history/{session_id}` | Clear a session |
| `GET` | `/customers` | List all CRM customers (admin CRM tab) |
| `GET` | `/refund-history` | All processed refunds, newest first — `{"total": N, "refunds": [...]}` |
| `GET` | `/refund-history/{order_id}` | Single refund record by order ID, or 404 |
| `GET` | `/sessions` | List all active sessions with message counts |
| `GET` | `/health` | Health check — reports `groq_key_set` status |

---

## License

MIT
