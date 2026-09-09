from typing import List, Dict, Any, Optional

INTERVENTION_RULES = [
    {
        "id": "rule-threat",
        "condition": lambda risk, events, markers: risk in ["HIGH", "CRITICAL"] and any(e.get("event_type") == "threat_report" for e in events),
        "options": [
            "Immediate counsellor safety review",
            "Victim protection assessment request",
            "Authorized district welfare officer notification"
        ]
    },
    {
        "id": "rule-health",
        "condition": lambda risk, events, markers: risk in ["HIGH", "CRITICAL"] and ("sleep_disturbed" in markers or "health_distress" in markers),
        "options": [
            "Tele-MANAS (14416) specialized mental health referral",
            "District civil hospital psychiatric / counselling consultation",
            "Dedicated trauma counselor assignment"
        ]
    },
    {
        "id": "rule-compensation",
        "condition": lambda risk, events, markers: any("compensation" in e.get("event_type", "") for e in events),
        "options": [
            "Social Welfare Department relief tranche status inquiry",
            "District legal services authority compensation tracking",
            "Emergency interim victim compensation fund requisition"
        ]
    },
    {
        "id": "rule-isolation",
        "condition": lambda risk, events, markers: risk in ["MEDIUM", "HIGH", "CRITICAL"] and "social_isolation" in markers,
        "options": [
            "Local community support liaison outreach",
            "Women / SC/ST community self-help network connection",
            "Peer support and safety escort coordination"
        ]
    },
    {
        "id": "rule-legal",
        "condition": lambda risk, events, markers: "legal_anxiety" in markers or any("court" in e.get("event_type", "") or "police" in e.get("event_type", "") for e in events),
        "options": [
            "District Legal Services Authority (DLSA) pro-bono advocate assign",
            "Special Public Prosecutor hearing prep briefing",
            "Witness protection protocol assessment"
        ]
    }
]

DEFAULT_OPTIONS = [
    "Routine supportive counsellor check-in",
    "Periodic well-being call adjustment",
    "Legal and administrative rights awareness brochure sharing"
]

def recommend_interventions(
    risk_state: str,
    recent_events: List[Dict[str, Any]],
    distress_markers: List[str]
) -> List[str]:
    """
    Module 17: Intervention Recommendation Engine
    
    Deterministic rule engine mapping risk state + context tags -> ranked candidate interventions.
    The human counsellor ALWAYS selects the final option.
    """
    suggested = []
    
    for rule in INTERVENTION_RULES:
        try:
            if rule["condition"](risk_state, recent_events, distress_markers):
                for opt in rule["options"]:
                    if opt not in suggested:
                        suggested.append(opt)
        except Exception:
            continue

    if not suggested:
        suggested = DEFAULT_OPTIONS.copy()

    return suggested[:4]
