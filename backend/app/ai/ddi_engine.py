import math
import numpy as np
from typing import Dict, Any, Optional, Tuple, List
from app.core.config import settings

# Base weights for the 5 multimodal components
BASE_WEIGHTS = {
    "T": 0.25,   # Text sentiment / distress z-score
    "V": 0.20,   # Voice prosody z-score
    "S": 0.25,   # Self-report Likert z-score
    "En": 0.15,  # -Engagement z-score (disengagement -> positive distress contribution)
    "Ev": 0.15   # Case-event stress impact
}

def compute_variance(values: List[float]) -> float:
    """Compute normalized sample variance among available components."""
    if len(values) <= 1:
        return 0.0
    return float(np.var(values, ddof=1))

def compute_ddi(
    text_z: Optional[float],
    voice_z: Optional[float],
    self_report_z: Optional[float],
    engagement_z: Optional[float],
    event_impact: Optional[float],
    prev_ddi_raw: Optional[float] = None,
    prev_ddi_display: Optional[float] = None,
    days_since_prev: float = 7.0,
    prev_velocity: float = 0.0
) -> Dict[str, Any]:
    """
    Module 7: Dynamic Distress Index (DDI) Composite Engine
    
    Formula:
    components = {T: text_z, V: voice_z, S: self_report_z, En: -engagement_z, Ev: event_impact}
    available = [c for c in components if c is not None]
    if len(available) < 2: risk_state = "ABSTAIN"; return
    raw = weighted_mean(available, weights=redistributed_proportionally)
    DDI_raw(t) = 0.3 * raw + 0.7 * DDI_raw(t-1)  # EWMA, alpha=0.3
    DDI_display = 50 + 25 * tanh(DDI_raw)
    confidence = w1*(len(available)/5) + w2*(1 - variance(available)) + w3*(recency_factor)
    band_width = 25 * (1 - confidence)
    """
    components = {
        "T": text_z,
        "V": voice_z,
        "S": self_report_z,
        "En": (-engagement_z) if engagement_z is not None else None,
        "Ev": event_impact
    }
    
    available_keys = [k for k, v in components.items() if v is not None]
    available_vals = [components[k] for k in available_keys]
    
    # 1. Check minimum evidence requirement
    if len(available_vals) < 2:
        return {
            "ddi_raw": prev_ddi_raw or 0.0,
            "ddi_display": prev_ddi_display or 50.0,
            "ddi_band": "ABSTAIN",
            "confidence": 0.30,
            "band_width": 25.0 * (1 - 0.30),
            "velocity": 0.0,
            "acceleration": 0.0,
            "risk_state": "ABSTAIN",
            "trend": "uncertain",
            "component_breakdown": components,
            "available_count": len(available_vals),
            "abstain_reason": "Insufficient evidence (< 2 components available) — human follow-up recommended."
        }

    # 2. Redistribute weights proportionally
    total_base_weight = sum(BASE_WEIGHTS[k] for k in available_keys)
    redistributed_weights = {
        k: (BASE_WEIGHTS[k] / total_base_weight) for k in available_keys
    }
    
    raw_instant = sum(components[k] * redistributed_weights[k] for k in available_keys)
    
    # 3. EWMA smoothing (alpha=0.3, beta=0.7)
    alpha = settings.EWMA_ALPHA
    if prev_ddi_raw is not None:
        ddi_raw = alpha * raw_instant + (1.0 - alpha) * prev_ddi_raw
    else:
        ddi_raw = raw_instant
        
    # 4. Scaled DDI display: 50 + 25 * tanh(DDI_raw) -> range roughly 25 to 75 (or 0 to 100 with extreme input)
    # Clamp to [0, 100]
    ddi_display = round(float(np.clip(50.0 + 25.0 * math.tanh(ddi_raw), 0.0, 100.0)), 1)
    
    # 5. Confidence calculation
    # w1*(len(available)/5) + w2*(1 - variance(available)) + w3*(recency_factor)
    w1, w2, w3 = 0.40, 0.40, 0.20
    comp_variance = compute_variance(available_vals)
    # normalize variance penalty: high variance (> 1.5) sharply lowers confidence
    variance_term = max(0.0, 1.0 - (comp_variance / 2.5))
    recency_factor = max(0.2, min(1.0, 1.0 - (days_since_prev - 7.0) / 28.0)) if days_since_prev > 7 else 1.0
    
    confidence = round(float(w1 * (len(available_vals) / 5.0) + w2 * variance_term + w3 * recency_factor), 2)
    confidence = max(0.1, min(0.99, confidence))
    band_width = round(25.0 * (1.0 - confidence), 1)

    # 6. Velocity (pts/week) and Acceleration
    if prev_ddi_display is not None:
        weeks = max(0.14, days_since_prev / 7.0)
        velocity = round((ddi_display - prev_ddi_display) / weeks, 1)
        acceleration = round((velocity - prev_velocity) / weeks, 1)
    else:
        velocity = 0.0
        acceleration = 0.0
        
    # 7. Trend classification
    if velocity >= 5.0:
        trend = "rising"
    elif velocity <= -5.0:
        trend = "declining"
    else:
        trend = "stable"

    # 8. Risk state and Abstention enforcement
    # Hard constraint: confidence < 0.5 forces risk_state = "ABSTAIN"
    if confidence < settings.ABSTAIN_CONFIDENCE_THRESHOLD:
        risk_state = "ABSTAIN"
        ddi_band = "ABSTAIN"
        abstain_reason = "High modality disagreement or low confidence (< 0.50) — human follow-up recommended."
    else:
        abstain_reason = None
        if ddi_display >= 75.0 or (ddi_display >= 68.0 and velocity >= 8.0):
            risk_state = "CRITICAL"
        elif ddi_display >= 60.0 or velocity >= 6.0:
            risk_state = "HIGH"
        elif ddi_display >= 45.0:
            risk_state = "MEDIUM"
        else:
            risk_state = "LOW"
        ddi_band = risk_state

    return {
        "ddi_raw": round(ddi_raw, 4),
        "ddi_display": ddi_display,
        "ddi_band": ddi_band,
        "confidence": confidence,
        "band_width": band_width,
        "velocity": velocity,
        "acceleration": acceleration,
        "risk_state": risk_state,
        "trend": trend,
        "component_breakdown": {k: round(v, 3) if v is not None else None for k, v in components.items()},
        "redistributed_weights": {k: round(v, 3) for k, v in redistributed_weights.items()},
        "available_count": len(available_vals),
        "component_variance": round(comp_variance, 3),
        "abstain_reason": abstain_reason
    }
