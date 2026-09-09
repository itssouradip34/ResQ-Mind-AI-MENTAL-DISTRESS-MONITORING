from typing import Dict, Any, List, Optional

POSSIBLE_EXPLANATIONS = [
    "Recovery / symptom stabilization",
    "Loss of phone or connectivity access",
    "Privacy or local safety concerns",
    "High acute distress / avoidance",
    "Relocation or temporary migration",
    "App or technical barrier"
]

def classify_engagement_collapse(
    missed_checkin_streak: int,
    prior_ddi_trend: str,  # "rising", "declining", "stable", "uncertain"
    recent_negative_event: bool = False
) -> Dict[str, Any]:
    """
    Module 13: Engagement Collapse Detection
    
    Classifies a disengagement pattern into:
    - possible_recovery
    - possible_deterioration
    - uncertain
    Never silently assumes improvement!
    """
    if missed_checkin_streak < 2:
        return {
            "anomaly_detected": False,
            "missed_checkin_streak": missed_checkin_streak,
            "classification": "normal",
            "review_required": False,
            "possible_explanations": []
        }

    if prior_ddi_trend == "declining" and not recent_negative_event:
        classification = "possible_recovery"
        review_required = False
    elif prior_ddi_trend == "rising" or recent_negative_event:
        classification = "possible_deterioration"
        review_required = True
    else:
        classification = "uncertain"
        review_required = True

    return {
        "anomaly_detected": True,
        "missed_checkin_streak": missed_checkin_streak,
        "classification": classification,
        "review_required": review_required,
        "banner_message": f"Engagement anomaly detected — {classification.replace('_', ' ').title()}",
        "possible_explanations": POSSIBLE_EXPLANATIONS,
        "human_action_required": review_required,
        "recommended_action": "Schedule proactive check-in phone call or outreach through designated community coordinator."
    }
