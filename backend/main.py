"""
main.py
-------
FastAPI application for the AI Customer Support / Refund Agent.

Endpoints:
  POST /chat                    – Single-turn, non-streaming chat
  GET  /chat/stream             – SSE streaming: agent reasoning + final answer
  GET  /history/{sid}           – Retrieve conversation history for a session
  DELETE /history/{sid}         – Clear conversation history
  GET  /health                  – Health check
  GET  /customers               – List all CRM customers (for admin dashboard)
  GET  /sessions                – List all active sessions
  GET  /refund-history          – All processed refunds, newest first
  GET  /refund-history/{order_id} – Single refund record by order ID
"""

import json
import os
import re
import sys
import uuid
from datetime import datetime
from typing import AsyncIterator

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# ---------------------------------------------------------------------------
# Path setup (allow imports from backend/ root)
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.dirname(__file__))

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from agent.graph import run_agent_streaming          # noqa: E402
from tools.refund_tools import get_all_refund_history  # noqa: E402

# ---------------------------------------------------------------------------
# Rate limiter setup
# ---------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AI Customer Support Agent",
    description="Workpodd Assessment – Refund Processing Agent powered by LangGraph + Groq",
    version="1.0.0",
)

# Attach rate-limiter state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",          # local Vite dev server
        "http://localhost:4173",          # local Vite preview
        "https://shopease-ai-agent.vercel.app",  # production frontend — update to your Vercel URL
        "*",                              # keep open during development; restrict after go-live
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory conversation store  {session_id: [{\"role\": ..., \"content\": ...}]}
# ---------------------------------------------------------------------------
_conversations: dict[str, list[dict]] = {}

# In-memory reasoning log store  {session_id: [log_entry, ...]}
_reasoning_logs: dict[str, list[dict]] = {}

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Message cannot be empty")
        if len(v) > 2000:
            raise ValueError("Message too long (max 2000 characters)")
        # Strip null bytes and non-printable control characters (keep \n \r \t)
        v = "".join(char for char in v if ord(char) >= 32 or char in "\n\r\t")
        return v


class ChatResponse(BaseModel):
    session_id: str
    response: str
    reasoning_log: list[dict]

# ---------------------------------------------------------------------------
# Helper: SSE event formatter
# ---------------------------------------------------------------------------

def _sse_event(data: dict, event: str = "message") -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"

# ---------------------------------------------------------------------------
# SSE Streaming endpoint
# ---------------------------------------------------------------------------

@app.get("/chat/stream")
@limiter.limit("10/minute")
async def chat_stream(
    request: Request,
    message: str = Query(..., description="User message", max_length=2000),
    session_id: str = Query(None, description="Session ID (creates new if omitted)"),
):
    """
    Server-Sent Events endpoint.
    Streams agent reasoning steps and final answer as SSE events.

    Event types sent to client:
      - agent_thinking : LLM reasoning text
      - tool_call      : Tool being invoked with args and result
      - final_answer   : Agent's final response to the user
      - error          : Error during processing
      - done           : Stream completed
    """
    # Validate session_id format if provided
    if session_id and not _UUID_RE.match(session_id):
        raise HTTPException(
            status_code=422,
            detail="session_id must be a valid UUID (e.g. 550e8400-e29b-41d4-a716-446655440000)",
        )

    # Sanitise message: strip control chars, enforce length
    message = message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Message cannot be empty")
    message = "".join(char for char in message if ord(char) >= 32 or char in "\n\r\t")

    if not session_id:
        session_id = str(uuid.uuid4())

    history = _conversations.get(session_id, [])
    log_store = _reasoning_logs.setdefault(session_id, [])

    async def event_generator() -> AsyncIterator[str]:
        # Send session_id first so frontend can track the session
        yield _sse_event({"session_id": session_id}, event="session")

        final_answer = ""
        try:
            async for event in run_agent_streaming(message, history):
                event["timestamp"] = datetime.now().isoformat()
                log_store.append(event)

                event_type = event.get("type", "message")

                if event_type == "final_answer":
                    final_answer = event.get("content", "")
                    yield _sse_event(event, event="final_answer")
                elif event_type == "agent_thinking":
                    yield _sse_event(event, event="agent_thinking")
                elif event_type == "tool_call":
                    yield _sse_event(event, event="tool_call")
                elif event_type == "error":
                    yield _sse_event(event, event="error")
                else:
                    yield _sse_event(event, event="message")

        except Exception as exc:
            yield _sse_event({"type": "error", "content": str(exc)}, event="error")
            final_answer = f"Sorry, an error occurred: {str(exc)}"

        # Update conversation history
        _conversations.setdefault(session_id, []).append(
            {"role": "user", "content": message}
        )
        if final_answer:
            _conversations[session_id].append(
                {"role": "assistant", "content": final_answer}
            )

        # Signal stream end
        yield _sse_event({"session_id": session_id}, event="done")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ---------------------------------------------------------------------------
# Non-streaming chat endpoint (fallback / testing)
# ---------------------------------------------------------------------------

@app.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat(request: Request, req: ChatRequest):
    """Non-streaming chat — collects all agent events then returns at once."""
    session_id = req.session_id or str(uuid.uuid4())
    history = _conversations.get(session_id, [])
    log_store = _reasoning_logs.setdefault(session_id, [])

    reasoning_log = []
    final_answer = ""

    try:
        async for event in run_agent_streaming(req.message, history):
            event["timestamp"] = datetime.now().isoformat()
            reasoning_log.append(event)
            log_store.append(event)
            if event.get("type") == "final_answer":
                final_answer = event.get("content", "")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    _conversations.setdefault(session_id, []).append(
        {"role": "user", "content": req.message}
    )
    if final_answer:
        _conversations[session_id].append(
            {"role": "assistant", "content": final_answer}
        )

    return ChatResponse(
        session_id=session_id,
        response=final_answer,
        reasoning_log=reasoning_log,
    )


# ---------------------------------------------------------------------------
# History endpoints
# ---------------------------------------------------------------------------

@app.get("/history/{session_id}")
async def get_history(session_id: str):
    """Get conversation history and reasoning logs for a session."""
    if session_id not in _conversations:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session_id,
        "messages": _conversations[session_id],
        "reasoning_log": _reasoning_logs.get(session_id, []),
    }


@app.delete("/history/{session_id}")
async def clear_history(session_id: str):
    """Clear conversation history for a session."""
    _conversations.pop(session_id, None)
    _reasoning_logs.pop(session_id, None)
    return {"message": f"Session '{session_id}' cleared."}


# ---------------------------------------------------------------------------
# Refund history endpoints
# ---------------------------------------------------------------------------

@app.get("/refund-history")
async def list_refund_history():
    """
    Return all processed refunds from refund_history.json, sorted newest first.
    Response shape: {"total": N, "refunds": [...]}
    """
    refunds = get_all_refund_history()
    return {"total": len(refunds), "refunds": refunds}


@app.get("/refund-history/{order_id}")
async def get_refund_by_order(order_id: str):
    """
    Return the refund record for a specific order ID.
    Returns 404 if no record exists for that order.
    """
    order_id_upper = order_id.strip().upper()
    refunds = get_all_refund_history()
    for record in refunds:
        if record.get("order_id", "").upper() == order_id_upper:
            return record
    raise HTTPException(
        status_code=404,
        detail=f"No refund record found for order '{order_id_upper}'.",
    )


# ---------------------------------------------------------------------------
# Admin / utility endpoints
# ---------------------------------------------------------------------------

@app.get("/customers")
async def list_customers():
    """Return all CRM customer profiles (for admin dashboard)."""
    data_path = os.path.join(os.path.dirname(__file__), "data", "crm.json")
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


@app.get("/sessions")
async def list_sessions():
    """List all active sessions with message counts."""
    return {
        "sessions": [
            {
                "session_id": sid,
                "message_count": len(msgs),
                "log_count": len(_reasoning_logs.get(sid, [])),
            }
            for sid, msgs in _conversations.items()
        ]
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "AI Customer Support Agent",
        "version": "1.0.0",
        "groq_key_set": bool(os.getenv("GROQ_API_KEY")),
    }


# ---------------------------------------------------------------------------
# Run directly
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
