"""
refund_tools.py
---------------
LangChain tools for the Refund Processing Agent.

Tools:
  1. lookup_customer     – Find a customer in the CRM by order_id or customer name
  2. validate_policy     – Check if the refund request satisfies policy rules
  3. process_refund      – Approve or deny the refund and record the decision

Persistence:
  Refund decisions are persisted to backend/data/refund_history.json.
  All writes are atomic (write to .tmp then os.replace).
"""

import json
import os
import tempfile
from datetime import date, datetime
from typing import Optional

from langchain_core.tools import tool

# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

_DATA_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "data"))
_REFUND_HISTORY_PATH = os.path.join(_DATA_DIR, "refund_history.json")


def _load_crm() -> dict:
    path = os.path.join(_DATA_DIR, "crm.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_policy() -> str:
    path = os.path.join(_DATA_DIR, "policy.txt")
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


# ---------------------------------------------------------------------------
# Persistent refund history helpers
# ---------------------------------------------------------------------------

def _load_refund_history() -> list[dict]:
    """
    Load all refund records from disk.
    Returns an empty list if the file does not exist or is corrupt.
    """
    if not os.path.exists(_REFUND_HISTORY_PATH):
        return []
    try:
        with open(_REFUND_HISTORY_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        # Unexpected structure — treat as corrupt
        return []
    except (json.JSONDecodeError, OSError):
        # Graceful corruption recovery: return empty and let next write heal it
        return []


def _save_refund_history(records: list[dict]) -> None:
    """
    Atomically write the refund records list to disk.
    Writes to a temp file first, then renames to avoid partial writes.
    """
    os.makedirs(_DATA_DIR, exist_ok=True)
    # Write to a temp file in the same directory so rename is atomic
    tmp_fd, tmp_path = tempfile.mkstemp(dir=_DATA_DIR, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, _REFUND_HISTORY_PATH)
    except Exception:
        # Clean up temp file if something went wrong
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def _append_refund_record(record: dict) -> None:
    """Load history, append a new record, and atomically persist."""
    records = _load_refund_history()
    # Overwrite any existing record for the same order_id to avoid duplicates
    records = [r for r in records if r.get("order_id") != record.get("order_id")]
    records.append(record)
    _save_refund_history(records)


def get_all_refund_history() -> list[dict]:
    """
    Public helper: return all refund records sorted by processed_at descending.
    Used by the /refund-history API endpoint.
    """
    records = _load_refund_history()
    records.sort(
        key=lambda r: r.get("processed_at", ""),
        reverse=True,
    )
    return records


# ---------------------------------------------------------------------------
# Tool 1: lookup_customer
# ---------------------------------------------------------------------------

@tool
def lookup_customer(query: str) -> str:
    """
    Look up a customer in the CRM database.

    Args:
        query: The customer's order ID (e.g. 'ORD001'), customer ID (e.g. 'C001'),
               or full name (e.g. 'Arjun Sharma').

    Returns:
        JSON string with customer details or an error message if not found.
    """
    crm = _load_crm()
    customers = crm.get("customers", [])

    q = query.strip().upper()

    for c in customers:
        if (
            c.get("order_id", "").upper() == q
            or c.get("id", "").upper() == q
            or c.get("name", "").upper() == query.strip().upper()
        ):
            return json.dumps({
                "found": True,
                "customer": {
                    "id": c["id"],
                    "name": c["name"],
                    "email": c["email"],
                    "order_id": c["order_id"],
                    "product": c["product"],
                    "purchase_date": c["purchase_date"],
                    "order_value": c["order_value"],
                    "reason": c["reason"],
                    "status": c["status"],
                }
            }, indent=2)

    return json.dumps({
        "found": False,
        "message": f"No customer found for query: '{query}'. "
                   f"Valid order IDs are ORD001–ORD015."
    })


# ---------------------------------------------------------------------------
# Tool 2: validate_policy
# ---------------------------------------------------------------------------

@tool
def validate_policy(order_id: str) -> str:
    """
    Validate whether a refund request complies with the company refund policy.

    Checks:
      - Whether the order has been delivered
      - Days since purchase vs. policy window for the refund reason
      - Order value limits (>10000 needs manager approval, >5000 partial only)
      - Special rules: allergic reactions need medical proof; electronics must be unused
      - Auto-deny: older than 30 days, order in transit

    Args:
        order_id: The order ID to validate (e.g. 'ORD001').

    Returns:
        JSON string with policy validation result and detailed reasoning.
    """
    crm = _load_crm()
    policy_text = _load_policy()
    customers = crm.get("customers", [])

    customer = None
    for c in customers:
        if c.get("order_id", "").upper() == order_id.strip().upper():
            customer = c
            break

    if not customer:
        return json.dumps({
            "eligible": False,
            "reason": f"Order ID '{order_id}' not found in CRM.",
            "policy_excerpt": ""
        })

    today = date.today()
    purchase_date = datetime.strptime(customer["purchase_date"], "%Y-%m-%d").date()
    days_since = (today - purchase_date).days
    refund_reason = customer["reason"].lower()
    order_value = customer["order_value"]
    status = customer["status"].lower()

    violations = []
    flags = []

    # Rule: must be delivered
    if status != "delivered":
        violations.append(f"Order is currently '{status}' — refunds only allowed for delivered orders.")

    # Rule: absolute 30-day cutoff
    if days_since > 30:
        violations.append(
            f"Purchase was {days_since} days ago. Auto-deny: older than 30 days (any reason)."
        )

    # Rule: reason-specific windows
    if "defective" in refund_reason or "wrong item" in refund_reason:
        window = 30
        reason_label = "defective/wrong item"
    elif "change of mind" in refund_reason or "changed my mind" in refund_reason:
        window = 7
        reason_label = "change of mind"
    elif "wrong size" in refund_reason or "size issue" in refund_reason:
        window = 15
        reason_label = "wrong size"
    elif "not as described" in refund_reason:
        window = 30
        reason_label = "not as described"
    elif "allergic" in refund_reason:
        window = 30
        reason_label = "allergic reaction"
        flags.append("Allergic reaction claim: eligible only with medical proof.")
    else:
        window = 30
        reason_label = "general"

    if days_since > window and not violations:
        violations.append(
            f"'{reason_label}' refund window is {window} days. "
            f"Purchase was {days_since} days ago — outside the allowed window."
        )

    # Rule: order value limits
    if order_value > 10000:
        flags.append(f"Order value Rs.{order_value:,} exceeds Rs.10,000 — requires manager approval.")
    elif order_value > 5000:
        flags.append(f"Order value Rs.{order_value:,} exceeds Rs.5,000 — only partial refund allowed.")

    eligible = len(violations) == 0

    return json.dumps({
        "eligible": eligible,
        "customer_name": customer["name"],
        "order_id": order_id.upper(),
        "product": customer["product"],
        "reason": customer["reason"],
        "days_since_purchase": days_since,
        "order_value": order_value,
        "violations": violations,
        "flags": flags,
        "policy_window_days": window,
        "policy_excerpt": (
            "Refund window: Defective/Wrong=30d, Mind=7d, Size=15d. "
            "Auto-deny: >30 days, in transit. "
            f">Rs.10,000=manager approval, >Rs.5,000=partial only."
        )
    }, indent=2)


# ---------------------------------------------------------------------------
# Tool 3: process_refund
# ---------------------------------------------------------------------------

@tool
def process_refund(order_id: str, decision: str, reason: str, refund_amount: Optional[float] = None) -> str:
    """
    Process (approve or deny) a refund request after policy validation.

    Args:
        order_id:      The order ID to process (e.g. 'ORD001').
        decision:      Either 'APPROVED' or 'DENIED'.
        reason:        Human-readable explanation for the decision.
        refund_amount: The refund amount in rupees. If None, uses the full order value.

    Returns:
        JSON string confirming the refund decision and record ID.
    """
    crm = _load_crm()
    customers = crm.get("customers", [])

    customer = None
    for c in customers:
        if c.get("order_id", "").upper() == order_id.strip().upper():
            customer = c
            break

    if not customer:
        return json.dumps({
            "success": False,
            "message": f"Cannot process refund: order '{order_id}' not found."
        })

    decision_upper = decision.strip().upper()
    if decision_upper not in ("APPROVED", "DENIED"):
        return json.dumps({
            "success": False,
            "message": f"Invalid decision '{decision}'. Must be 'APPROVED' or 'DENIED'."
        })

    amount = refund_amount if refund_amount is not None else customer["order_value"]

    record = {
        "record_id": f"REF-{order_id.upper()}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "order_id": order_id.upper(),
        "customer_id": customer["id"],
        "customer_name": customer["name"],
        "product": customer["product"],
        "decision": decision_upper,
        "refund_amount": amount if decision_upper == "APPROVED" else 0,
        "reason": reason,
        "processed_at": datetime.now().isoformat(),
        "status": "PROCESSED",
    }

    # Persist the record atomically to disk
    _append_refund_record(record)

    return json.dumps({
        "success": True,
        "record": record,
        "message": (
            f"Refund APPROVED for {customer['name']} — Rs.{amount:,.0f} will be credited within 5-7 business days."
            if decision_upper == "APPROVED"
            else f"Refund DENIED for {customer['name']}. Reason: {reason}"
        )
    }, indent=2)


# Expose all tools as a list for easy import
ALL_TOOLS = [lookup_customer, validate_policy, process_refund]
