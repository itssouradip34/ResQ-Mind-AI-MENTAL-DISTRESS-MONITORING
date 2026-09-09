import pytest
from app.ai.ddi_engine import compute_ddi

def test_ddi_abstain_on_insufficient_components():
    """Given fewer than 2 components available, DDI engine must ABSTAIN."""
    result = compute_ddi(
        text_z=1.2,
        voice_z=None,
        self_report_z=None,
        engagement_z=None,
        event_impact=None
    )
    assert result["risk_state"] == "ABSTAIN"
    assert result["ddi_band"] == "ABSTAIN"
    assert result["available_count"] == 1
    assert "Insufficient evidence" in result["abstain_reason"]

def test_ddi_abstain_on_high_variance_disagreement():
    """Given high modality disagreement (e.g. text distress high, self-report very positive),
    variance lowers confidence < 0.5, forcing ABSTAIN."""
    result = compute_ddi(
        text_z=2.5,          # Strong distress
        voice_z=None,
        self_report_z=-2.2,  # Strong coping / low distress
        engagement_z=0.0,
        event_impact=None
    )
    assert result["confidence"] < 0.50
    assert result["risk_state"] == "ABSTAIN"
    assert result["abstain_reason"] is not None

def test_ddi_ewma_smoothing():
    """Verify EWMA smoothing: DDI_raw(t) = 0.3 * raw + 0.7 * DDI_raw(t-1)."""
    # First step
    res1 = compute_ddi(
        text_z=1.0,
        voice_z=1.0,
        self_report_z=1.0,
        engagement_z=0.0,
        event_impact=0.0,
        prev_ddi_raw=None
    )
    raw1 = res1["ddi_raw"]
    
    # Second step with higher distress across all components
    res2 = compute_ddi(
        text_z=2.0,
        voice_z=2.0,
        self_report_z=2.0,
        engagement_z=-2.0,  # En = -engagement_z = 2.0
        event_impact=2.0,   # Ev = 2.0
        prev_ddi_raw=raw1
    )
    # The new raw value is smoothed: 0.3 * 2.0 + 0.7 * raw1
    expected_raw = 0.3 * 2.0 + 0.7 * raw1
    assert abs(res2["ddi_raw"] - expected_raw) < 0.05

def test_ddi_rising_trend_and_velocity():
    """Given rising values over check-ins, velocity > 0 and trend == 'rising'."""
    res = compute_ddi(
        text_z=1.5,
        voice_z=1.2,
        self_report_z=1.8,
        engagement_z=0.5,
        event_impact=1.0,
        prev_ddi_display=42.0,
        days_since_prev=7.0
    )
    assert res["ddi_display"] > 42.0
    assert res["velocity"] > 5.0
    assert res["trend"] == "rising"
    assert res["risk_state"] in ["HIGH", "CRITICAL"]
