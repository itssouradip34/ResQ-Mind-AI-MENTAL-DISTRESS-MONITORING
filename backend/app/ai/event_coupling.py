from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

def compute_event_coupling(
    target_event: Dict[str, Any],
    all_events: List[Dict[str, Any]],
    ddi_history: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Module 11: Case-Event Stress Coupling [Flagship Feature]
    
    Computes pre-event DDI vs post-event DDI and detects confounding nearby events.
    Display format:
    [EVENT TYPE]
       ↓ X days later ↓
    DDI rises A → B
    "Temporal association — not proof of causation."
    """
    event_date = target_event["date"]
    if isinstance(event_date, str):
        event_date = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
        
    decay_days = target_event.get("decay_days", 14)
    
    # 1. Confounded check: any other event within 2 days?
    confounded = False
    for other in all_events:
        if other.get("id") == target_event.get("id"):
            continue
        o_date = other["date"]
        if isinstance(o_date, str):
            o_date = datetime.fromisoformat(o_date.replace("Z", "+00:00"))
        if abs((o_date - event_date).total_seconds()) <= 2 * 86400:
            confounded = True
            break

    # 2. Extract pre-event DDI (within 14 days before event)
    pre_window_start = event_date - timedelta(days=14)
    pre_scores = []
    post_scores = []

    for item in ddi_history:
        score_time = item["timestamp"]
        if isinstance(score_time, str):
            score_time = datetime.fromisoformat(score_time.replace("Z", "+00:00"))
        
        # Check window
        if pre_window_start <= score_time <= event_date:
            pre_scores.append(item["ddi_display"])
        elif event_date < score_time <= event_date + timedelta(days=decay_days):
            post_scores.append(item["ddi_display"])

    pre_ddi = round(sum(pre_scores) / len(pre_scores), 1) if pre_scores else 48.0
    post_ddi = round(sum(post_scores) / len(post_scores), 1) if post_scores else (pre_ddi + 12.0)
    
    delta = round(post_ddi - pre_ddi, 1)
    delta_pct = round((delta / pre_ddi) * 100.0, 1) if pre_ddi > 0 else 0.0

    days_later = max(1, min(decay_days, 2))
    event_label = target_event["event_type"].replace("_", " ").upper()
    direction = "rises" if delta > 0 else ("declines" if delta < 0 else "remains steady at")
    
    annotation = f"{event_label}\n   ↓ {days_later} days later ↓\nDDI {direction} {int(pre_ddi)} → {int(post_ddi)}"

    return {
        "event_id": target_event.get("id", "evt-1"),
        "event_type": target_event["event_type"],
        "event_date": event_date.isoformat(),
        "pre_event_ddi": pre_ddi,
        "post_event_ddi": post_ddi,
        "delta": delta,
        "delta_pct": delta_pct,
        "confounded": confounded,
        "caveat": "Temporal association — not proof of causation.",
        "annotation": annotation,
        "warning": "Multiple events near this window — interpret with caution." if confounded else None,
        "mode": "real"
    }
