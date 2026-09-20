import os
import json
import math
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

# Standard default stress weight priors and decay days for SC/ST (PoA) Act milestones
DEFAULT_EVENT_SPECS = {
    "threat_report": {
        "stress_weight_prior": 1.8,
        "decay_days": 21,
        "description": "Report of witness intimidation or direct threat to victim safety"
    },
    "court_hearing": {
        "stress_weight_prior": 1.2,
        "decay_days": 14,
        "description": "Scheduled trial hearing, cross-examination, or appearance"
    },
    "police_interaction": {
        "stress_weight_prior": 0.9,
        "decay_days": 10,
        "description": "Station visit, statement recording under Sec 161 CrPC, or inquiry"
    },
    "investigation_update": {
        "stress_weight_prior": 0.8,
        "decay_days": 14,
        "description": "Chargesheet filing, scene inspection, or forensic status update"
    },
    "compensation_update": {
        "stress_weight_prior": 0.6,
        "decay_days": 14,
        "description": "Relief installment status under Rule 12(4) of SC/ST (PoA) Rules"
    },
    "relocation": {
        "stress_weight_prior": 1.1,
        "decay_days": 30,
        "description": "Emergency temporary shelter relocation or change of residence"
    },
    "complaint_registration": {
        "stress_weight_prior": 0.7,
        "decay_days": 14,
        "description": "Initial FIR lodging under SC/ST (PoA) Act"
    },
    "counselling_session": {
        "stress_weight_prior": -0.5,
        "decay_days": 14,
        "description": "Trauma-informed psychosocial support session with counsellor"
    },
    "rehabilitation": {
        "stress_weight_prior": -0.6,
        "decay_days": 30,
        "description": "Livelihood support, vocational aid, or educational restoration"
    }
}

# Compounding interaction rules
DEFAULT_INTERACTIONS = [
    {"event_a": "threat_report", "event_b": "court_hearing", "multiplier": 1.45},
    {"event_a": "threat_report", "event_b": "police_interaction", "multiplier": 1.30},
    {"event_a": "court_hearing", "event_b": "counselling_session", "multiplier": 0.75}
]

# Load calibrated model if available
_calibrated_decay = None
try:
    decay_path = os.path.join(os.path.dirname(__file__), "weights", "case_event_decay.json")
    if os.path.exists(decay_path):
        with open(decay_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            EVENT_SPECS = data.get("event_specs", DEFAULT_EVENT_SPECS)
            INTERACTION_RULES = data.get("interaction_rules", DEFAULT_INTERACTIONS)
    else:
        EVENT_SPECS = DEFAULT_EVENT_SPECS
        INTERACTION_RULES = DEFAULT_INTERACTIONS
except Exception:
    EVENT_SPECS = DEFAULT_EVENT_SPECS
    INTERACTION_RULES = DEFAULT_INTERACTIONS

def compute_case_events_stress_impact(
    events: List[Any],
    reference_time: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Module 10: Case-Event Stress Impact & Temporal Decay Modeling
    
    Computes time-decayed exponential stress for events relative to reference_time:
      decay_factor = exp(- delta_t / tau_i)
      stress_i = prior_weight * decay_factor
      compound_stress = max(stress_i) + 0.30 * sum(remaining) * compounding_multiplier
      
    Acceptance Criteria (PRD):
    Given a threat_report event is logged, when the next DDI computation runs
    within the event's decay window, then component_breakdown.Ev is non-zero
    and cites the event in the explanation (Module 15).
    """
    if not events:
        return {
            "impact_z": 0.0,
            "citable_event_id": None,
            "citable_event_type": None,
            "citation": None,
            "active_events_count": 0,
            "decayed_events_count": 0
        }

    now = reference_time or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    event_contributions = []
    
    for ev in events:
        # Handle dict or SQLAlchemy model
        e_id = getattr(ev, "id", None) or ev.get("id")
        e_type = getattr(ev, "event_type", None) or ev.get("event_type")
        e_date = getattr(ev, "date", None) or ev.get("date")
        e_prior = getattr(ev, "stress_weight_prior", None)
        if e_prior is None and isinstance(ev, dict):
            e_prior = ev.get("stress_weight_prior")
        e_decay = getattr(ev, "decay_days", None)
        if e_decay is None and isinstance(ev, dict):
            e_decay = ev.get("decay_days")

        # Fallback to defaults from specs
        spec = EVENT_SPECS.get(e_type, {})
        prior_weight = float(e_prior) if e_prior is not None else float(spec.get("stress_weight_prior", 1.0))
        decay_tau = float(e_decay) if e_decay is not None else float(spec.get("decay_days", 14))

        if isinstance(e_date, str):
            try:
                e_date = datetime.fromisoformat(e_date.replace("Z", "+00:00"))
            except Exception:
                continue

        if e_date.tzinfo is None:
            e_date = e_date.replace(tzinfo=timezone.utc)

        delta_days = max(0.0, (now - e_date).total_seconds() / 86400.0)
        
        # Exponential decay function: exp(- delta_t / tau)
        decay_factor = math.exp(-delta_days / max(1.0, decay_tau))
        decayed_stress = prior_weight * decay_factor
        
        # An event is active if within 1.5 * decay_days and decay_factor >= 0.10
        is_active = (delta_days <= decay_tau * 1.5) and (decay_factor >= 0.08)
        
        event_contributions.append({
            "id": e_id,
            "event_type": e_type,
            "date": e_date,
            "days_ago": round(delta_days, 1),
            "prior_weight": prior_weight,
            "decay_factor": round(decay_factor, 3),
            "decayed_stress": decayed_stress,
            "is_active": is_active
        })

    active_events = [e for e in event_contributions if e["is_active"]]
    decayed_events = [e for e in event_contributions if not e["is_active"]]

    if not active_events:
        return {
            "impact_z": 0.0,
            "citable_event_id": None,
            "citable_event_type": None,
            "citation": None,
            "active_events_count": 0,
            "decayed_events_count": len(decayed_events)
        }

    # Sort active events by absolute stress magnitude descending
    active_events.sort(key=lambda x: abs(x["decayed_stress"]), reverse=True)
    primary_event = active_events[0]

    # Check for compounding interactions between active events
    compounding_mult = 1.0
    active_types = {e["event_type"] for e in active_events}
    for rule in INTERACTION_RULES:
        ea = rule.get("event_a")
        eb = rule.get("event_b")
        if ea in active_types and eb in active_types:
            compounding_mult = max(compounding_mult, float(rule.get("multiplier", rule.get("compounding_multiplier", 1.2))))

    # Compound stress: max + 0.30 * remaining
    primary_val = primary_event["decayed_stress"]
    remaining_sum = sum(e["decayed_stress"] for e in active_events[1:])
    total_stress = (primary_val + 0.30 * remaining_sum) * compounding_mult
    
    # Bound to realistic distress z-scale [-0.8, 2.5]
    impact_z = round(float(np.clip(total_stress, -0.8, 2.5)), 2)

    # Format human-readable citation string
    date_str = primary_event["date"].strftime("%Y-%m-%d")
    citation = f"{primary_event['event_type']} on {date_str} ({int(primary_event['days_ago'])}d ago)"

    return {
        "impact_z": impact_z,
        "citable_event_id": primary_event["id"],
        "citable_event_type": primary_event["event_type"],
        "citation": citation,
        "active_events_count": len(active_events),
        "decayed_events_count": len(decayed_events),
        "primary_event": primary_event
    }
