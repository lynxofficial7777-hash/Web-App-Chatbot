"""
graph.py
--------
LangGraph agent loop for the AI Customer Support / Refund Agent.

Flow:
  START → agent_node → (tool_calls?) → tool_node → agent_node → ... → END

The agent uses Groq (Llama 3.3 70B) via langchain-groq and has access to
three tools: lookup_customer, validate_policy, process_refund.

Streaming: Each event (reasoning step, tool call, tool result, final answer)
is yielded as a dict so FastAPI can forward it via SSE.

Intelligence additions:
  - detect_sentiment()       : Keyword-based sentiment classifier attached to
                               every agent_thinking log entry.
  - _calculate_confidence()  : 0-1 confidence score attached to every
                               tool_call log entry (most meaningful for
                               process_refund).
"""

from __future__ import annotations

import json
import os
from typing import Annotated, AsyncIterator

from dotenv import load_dotenv
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

from tools.refund_tools import ALL_TOOLS

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# ---------------------------------------------------------------------------
# Feature A: Sentiment Detection (pure Python, no external library)
# ---------------------------------------------------------------------------

_ANGRY_KEYWORDS = {
    "furious", "outrage", "outrageous", "ridiculous", "unacceptable", "terrible",
    "worst", "hate", "disgusting", "scam", "fraud", "lawsuit", "demand",
    "immediately", "useless",
}

_FRUSTRATED_KEYWORDS = {
    "frustrated", "annoyed", "disappointed", "waiting", "still", "again",
    "not working", "why", "horrible", "bad", "wrong", "broken", "issue", "problem",
}

_POSITIVE_KEYWORDS = {
    "thank", "please", "appreciate", "happy", "great", "love", "good",
    "excellent", "wonderful",
}


def detect_sentiment(text: str) -> dict:
    """
    Keyword-based sentiment classifier.

    Returns:
        {"sentiment": "angry" | "frustrated" | "neutral" | "positive", "score": 0.0-1.0}

    Score = matched_keywords / total_words, capped at 1.0.
    The highest-scoring sentiment category wins; ties broken by priority order
    (angry > frustrated > positive > neutral).
    """
    if not text or not text.strip():
        return {"sentiment": "neutral", "score": 0.0}

    words = text.lower().split()
    total = len(words) or 1

    # Multi-word phrases first, then single words
    text_lower = text.lower()

    def _count(keyword_set: set) -> int:
        count = 0
        for kw in keyword_set:
            if " " in kw:
                count += text_lower.count(kw)
            else:
                count += words.count(kw)
        return count

    angry_hits      = _count(_ANGRY_KEYWORDS)
    frustrated_hits = _count(_FRUSTRATED_KEYWORDS)
    positive_hits   = _count(_POSITIVE_KEYWORDS)

    scores = {
        "angry":      min(angry_hits / total, 1.0),
        "frustrated": min(frustrated_hits / total, 1.0),
        "positive":   min(positive_hits / total, 1.0),
        "neutral":    0.0,
    }

    # Priority order for tie-breaking: angry > frustrated > positive > neutral
    priority = ["angry", "frustrated", "positive", "neutral"]
    best = max(priority, key=lambda s: scores[s])

    return {"sentiment": best, "score": round(scores[best], 3)}


# ---------------------------------------------------------------------------
# Feature B: Confidence Scoring
# ---------------------------------------------------------------------------

def _calculate_confidence(tool_name: str, args: dict, result_parsed: dict) -> float:
    """
    Returns a 0.0–1.0 confidence score for the agent's decision.

    For process_refund:
      1.0  if the result contains a valid record with a clear decision
      0.7  if the result is successful but decision is ambiguous
      0.5  otherwise / on parse failure

    For other tools:
      0.9  if result has no 'error' key
      0.3  if result has an 'error' key
    """
    if tool_name == "process_refund":
        try:
            if not result_parsed.get("success", False):
                return 0.5
            record = result_parsed.get("record", {})
            decision = record.get("decision", "")
            if decision in ("APPROVED", "DENIED"):
                return 1.0
            return 0.7
        except Exception:
            return 0.5
    else:
        if "error" in result_parsed:
            return 0.3
        return 0.9


# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are an AI Customer Support Agent for an e-commerce platform specialising in refund processing.

Your workflow for every refund request:
1. Use `lookup_customer` to find the customer's record (by order ID, customer ID, or name).
2. Use `validate_policy` to check if the refund request meets the refund policy rules.
3. Use `process_refund` to record and communicate your final APPROVED or DENIED decision.

Guidelines:
- Always be empathetic, professional and concise.
- Explain your reasoning clearly to the customer.
- If a refund is denied, explain exactly why and reference the policy.
- If you cannot find a customer, ask for a valid order ID (ORD001-ORD015).
- Never skip the policy validation step before processing.
- If the customer asks a general question (not a refund), answer helpfully without using tools.
- If the customer appears angry or frustrated, acknowledge their frustration empathetically before proceeding with the refund process. Use a calm, reassuring tone.
- If sentiment is angry, prioritize speed and clarity in your response.
"""

# ---------------------------------------------------------------------------
# State definition
# ---------------------------------------------------------------------------

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    reasoning_log: list[dict]   # streaming log of agent steps


# ---------------------------------------------------------------------------
# LLM + tool binding
# ---------------------------------------------------------------------------

def _build_llm_with_tools():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not found in environment variables.")

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=api_key,
        temperature=0.3,
    )
    return llm.bind_tools(ALL_TOOLS)


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

def _agent_node(state: AgentState, llm_with_tools) -> dict:
    """Call the LLM with the current message history."""
    messages = state["messages"]
    # Prepend system prompt if not already present
    if not messages or not isinstance(messages[0], SystemMessage):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + list(messages)

    response: AIMessage = llm_with_tools.invoke(messages)

    # Feature A: detect sentiment from the latest HumanMessage
    latest_human_content = ""
    for msg in reversed(list(messages)):
        if isinstance(msg, HumanMessage):
            latest_human_content = msg.content if isinstance(msg.content, str) else ""
            break
    sentiment_result = detect_sentiment(latest_human_content)

    log_entry = {
        "type": "agent_thinking",
        "content": response.content if response.content else "(Deciding which tool to call...)",
        "tool_calls": [
            {
                "tool": tc["name"],
                "args": tc["args"],
            }
            for tc in (response.tool_calls or [])
        ],
        "sentiment": sentiment_result,  # Feature A
    }

    return {
        "messages": [response],
        "reasoning_log": state.get("reasoning_log", []) + [log_entry],
    }


def _tool_node(state: AgentState) -> dict:
    """Execute any tool calls made by the agent."""
    messages = state["messages"]
    last_message: AIMessage = messages[-1]

    tool_map = {t.name: t for t in ALL_TOOLS}
    new_messages = []
    new_logs = []

    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        tool_id = tool_call["id"]

        log_entry = {
            "type": "tool_call",
            "tool": tool_name,
            "args": tool_args,
        }

        if tool_name in tool_map:
            try:
                result = tool_map[tool_name].invoke(tool_args)
                log_entry["result"] = result
                log_entry["status"] = "success"
            except Exception as exc:
                result = json.dumps({"error": str(exc)})
                log_entry["result"] = result
                log_entry["status"] = "error"
        else:
            result = json.dumps({"error": f"Unknown tool: {tool_name}"})
            log_entry["result"] = result
            log_entry["status"] = "error"

        # Feature B: calculate and attach confidence score
        try:
            result_parsed = json.loads(result) if isinstance(result, str) else result
            if not isinstance(result_parsed, dict):
                result_parsed = {}
        except (json.JSONDecodeError, TypeError):
            result_parsed = {}
        log_entry["confidence"] = _calculate_confidence(tool_name, tool_args, result_parsed)

        new_messages.append(
            ToolMessage(content=result, tool_call_id=tool_id, name=tool_name)
        )
        new_logs.append(log_entry)

    return {
        "messages": new_messages,
        "reasoning_log": state.get("reasoning_log", []) + new_logs,
    }


def _should_continue(state: AgentState) -> str:
    """Route: if last AI message has tool_calls → run tools; else → END."""
    last = state["messages"][-1]
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tools"
    return END


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------

def build_graph():
    """Build and compile the LangGraph agent graph."""
    llm_with_tools = _build_llm_with_tools()

    # Bind llm into the node closure
    def agent_node(state: AgentState) -> dict:
        return _agent_node(state, llm_with_tools)

    builder = StateGraph(AgentState)
    builder.add_node("agent", agent_node)
    builder.add_node("tools", _tool_node)

    builder.add_edge(START, "agent")
    builder.add_conditional_edges(
        "agent",
        _should_continue,
        {"tools": "tools", END: END},
    )
    builder.add_edge("tools", "agent")

    return builder.compile()


# ---------------------------------------------------------------------------
# Public interface: streaming run
# ---------------------------------------------------------------------------

# Singleton graph — built once on import
_graph = None

def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


async def run_agent_streaming(
    user_message: str,
    conversation_history: list[dict],
) -> AsyncIterator[dict]:
    """
    Run the agent and yield streaming events as dicts.

    Each yielded dict has a 'type' key:
      - 'agent_thinking'  : LLM reasoning / response text (includes 'sentiment')
      - 'tool_call'       : A tool being invoked (includes 'confidence')
      - 'final_answer'    : The agent's final message to the user
      - 'error'           : An error occurred

    Args:
        user_message:          The latest user message.
        conversation_history:  Prior messages as list of {"role": ..., "content": ...} dicts.
    """
    graph = get_graph()

    # Build LangChain message history
    lc_messages: list[BaseMessage] = []
    for msg in conversation_history:
        if msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=msg["content"]))

    lc_messages.append(HumanMessage(content=user_message))

    initial_state: AgentState = {
        "messages": lc_messages,
        "reasoning_log": [],
    }

    try:
        # Track emitted log indices to avoid duplicate yields
        emitted_count = 0
        final_answer = ""

        # Stream node-by-node updates from the graph
        async for event in graph.astream(initial_state, stream_mode="values"):
            reasoning_log = event.get("reasoning_log", [])

            # Yield any new log entries since last emission
            new_entries = reasoning_log[emitted_count:]
            for entry in new_entries:
                yield entry
            emitted_count = len(reasoning_log)

            # Capture final answer from latest AI message with content
            messages = event.get("messages", [])
            for msg in reversed(messages):
                if isinstance(msg, AIMessage) and msg.content and not msg.tool_calls:
                    final_answer = msg.content
                    break

        # Yield final answer
        yield {
            "type": "final_answer",
            "content": final_answer,
        }

    except Exception as exc:
        yield {
            "type": "error",
            "content": f"Agent error: {str(exc)}",
        }
