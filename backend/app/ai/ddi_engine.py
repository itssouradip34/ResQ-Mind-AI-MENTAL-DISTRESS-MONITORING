import os
import json
import math
import logging
import numpy as np
from typing import Dict, Any, Optional, Tuple, List, Union
from app.core.config import settings

logger = logging.getLogger(__name__)

# Default base weights for the 5 multimodal components per PRD Module 7
DEFAULT_BASE_WEIGHTS = {
    "T": 0.25,   # Text sentiment / distress z-score
    "V": 0.20,   # Voice prosody z-score
    "S": 0.25,   # Self-report Likert z-score
    "En": 0.15,  # -Engagement z-score (disengagement -> positive distress contribution)
    "Ev": 0.15   # Case-event stress impact
}

# Try loading calibrated weights
_calibrated_config = None
try:
    config_path = os.path.join(os.path.dirname(__file__), "weights", "ddi_calibration_config.json")
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            _calibrated_config = json.load(f)
            BASE_WEIGHTS = _calibrated_config.get("base_weights", DEFAULT_BASE_WEIGHTS)
    else:
        BASE_WEIGHTS = DEFAULT_BASE_WEIGHTS
except Exception:
    BASE_WEIGHTS = DEFAULT_BASE_WEIGHTS

def compute_variance(values: List[float]) -> float:
    """Compute normalized sample variance among available components."""
    if len(values) <= 1:
        return 0.0
    return float(np.var(values, ddof=1))

def compute_ddi_batch_tensor(
    components_matrix: np.ndarray,
    mask_matrix: np.ndarray,
    prev_ddi_vector: np.ndarray,
    use_gpu: bool = True
) -> Dict[str, Any]:
    """
    Vectorized Batch DDI Computation using PyTorch on NVIDIA RTX 2050 GPU (CUDA) or CPU.
    components_matrix: [N, 5] (T, V, S, En, Ev)
    mask_matrix: [N, 5] (1.0 if available, 0.0 if missing)
    prev_ddi_vector: [N] previous DDI raw values
    """
    try:
        import torch
        device = torch.device("cuda:0" if (use_gpu and torch.cuda.is_available()) else "cpu")
        
        comp = torch.tensor(components_matrix, dtype=torch.float32, device=device)
        mask = torch.tensor(mask_matrix, dtype=torch.float32, device=device)
        prev = torch.tensor(prev_ddi_vector, dtype=torch.float32, device=device).unsqueeze(-1)
        
        base_w = torch.tensor([BASE_WEIGHTS[k] for k in ["T", "V", "S", "En", "Ev"]], dtype=torch.float32, device=device)
        
        # Proportional weight redistribution
        masked_w = base_w * mask
        norm_w = masked_w / (masked_w.sum(dim=-1, keepdim=True) + 1e-8)
        
        raw_instant = (comp * norm_w).sum(dim=-1, keepdim=True)
        alpha = float(settings.EWMA_ALPHA)
        
        ddi_raw = alpha * raw_instant + (1.0 - alpha) * prev
        ddi_display = 50.0 + 25.0 * torch.tanh(ddi_raw)
        ddi_display = torch.clamp(ddi_display, 0.0, 100.0)
        
        return {
            "device": str(device),
            "ddi_raw": ddi_raw.squeeze(-1).cpu().numpy(),
            "ddi_display": np.round(ddi_display.squeeze(-1).cpu().numpy(), 1)
        }
    except Exception as e:
        logger.warning(f"PyTorch batch computation fallback to numpy: {e}")
        # Numpy vectorized fallback
        base_w = np.array([BASE_WEIGHTS[k] for k in ["T", "V", "S", "En", "Ev"]])
        masked_w = base_w * mask_matrix
        norm_w = masked_w / (masked_w.sum(axis=-1, keepdims=True) + 1e-8)
        raw_instant = (components_matrix * norm_w).sum(axis=-1, keepdims=True)
        alpha = float(settings.EWMA_ALPHA)
        ddi_raw = alpha * raw_instant + (1.0 - alpha) * prev_ddi_vector[:, np.newaxis]
        ddi_display = np.clip(50.0 + 25.0 * np.tanh(ddi_raw), 0.0, 100.0)
        return {
            "device": "cpu",
            "ddi_raw": ddi_raw.squeeze(-1),
            "ddi_display": np.round(ddi_display.squeeze(-1), 1)
        }

def compute_ddi(
    text_z: Optional[float],
    voice_z: Optional[float],
    self_report_z: Optional[float],
    engagement_z: Optional[float],
    event_impact: Optional[Union[float, Dict[str, Any]]],
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
    
    Acceptance Criteria (PRD):
    - Given fewer than 2 components available: risk_state = "ABSTAIN", ddi_band = "ABSTAIN",
      "Insufficient evidence (< 2 components available) — human follow-up recommended."
    - Given high variance among components (confidence < 0.50): risk_state = "ABSTAIN".
    - Given a victim whose DDI rises from 42 to 70 over three check-ins:
      velocity >= 5.0 pts/week, trend = "rising", band in review queue at HIGH/CRITICAL.
    """
    # Parse event impact numeric vs metadata
    event_numeric = None
    event_citation = None
    if isinstance(event_impact, dict):
        event_numeric = float(event_impact.get("impact_z", 0.0))
        event_citation = event_impact.get("citation")
    elif event_impact is not None:
        event_numeric = float(event_impact)

    components = {
        "T": float(text_z) if text_z is not None else None,
        "V": float(voice_z) if voice_z is not None else None,
        "S": float(self_report_z) if self_report_z is not None else None,
        "En": (-float(engagement_z)) if engagement_z is not None else None,
        "Ev": event_numeric
    }
    
    available_keys = [k for k, v in components.items() if v is not None]
    available_vals = [components[k] for k in available_keys]
    
    # 1. Check minimum evidence requirement (< 2 components forces ABSTAIN)
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
            "abstain_reason": "Insufficient evidence (< 2 components available) — human follow-up recommended.",
            "event_citation": event_citation,
            "mode": "real"
        }

    # 2. Redistribute weights proportionally across available components
    total_base_weight = sum(BASE_WEIGHTS[k] for k in available_keys)
    redistributed_weights = {
        k: (BASE_WEIGHTS[k] / total_base_weight) for k in available_keys
    }
    
    raw_instant = sum(components[k] * redistributed_weights[k] for k in available_keys)
    
    # 3. EWMA smoothing (alpha=0.3, beta=0.7)
    alpha = float(settings.EWMA_ALPHA)
    if prev_ddi_raw is not None:
        ddi_raw = alpha * raw_instant + (1.0 - alpha) * prev_ddi_raw
    else:
        ddi_raw = raw_instant
        
    # 4. Scaled DDI display: 50 + 25 * tanh(DDI_raw) -> range roughly 25 to 75 (or 0 to 100 with extreme input)
    ddi_display = round(float(np.clip(50.0 + 25.0 * math.tanh(ddi_raw), 0.0, 100.0)), 1)
    
    # 5. Confidence calculation
    # w1*(len(available)/5) + w2*(1 - variance(available)) + w3*(recency_factor)
    w1, w2, w3 = 0.40, 0.40, 0.20
    comp_variance = compute_variance(available_vals)
    # High variance (> 1.5) sharply lowers confidence
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
    # Hard constraint: confidence < 0.50 forces risk_state = "ABSTAIN"
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
        "abstain_reason": abstain_reason,
        "event_citation": event_citation,
        "mode": "real"
    }
