from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ai.case_events import compute_case_events_stress_impact, EVENT_SPECS
from app.ai.ddi_engine import compute_ddi

client = TestClient(app)

def test_case_event_stress_impact_and_citation():
    """
    PRD Module 10 Acceptance Criteria:
    Given a threat_report event is logged, when the next DDI computation runs
    within the event's decay window, then component_breakdown.Ev is non-zero
    and cites the event in the explanation.
    """
    now = datetime.now(timezone.utc)
    threat_event = {
        "id": "EV-THREAT-TEST",
        "event_type": "threat_report",
        "date": now - timedelta(days=2),
        "stress_weight_prior": 1.8,
        "decay_days": 21
    }
    
    # Calculate stress impact
    decay_res = compute_case_events_stress_impact([threat_event], now)
    assert decay_res["impact_z"] > 1.2
    assert "threat_report" in decay_res["citation"]
    assert decay_res["active_events_count"] == 1

    # Pass into DDI computation
    ddi_res = compute_ddi(
        text_z=1.0,
        voice_z=0.8,
        self_report_z=1.0,
        engagement_z=0.0,
        event_impact=decay_res
    )
    assert ddi_res["component_breakdown"]["Ev"] is not None
    assert ddi_res["component_breakdown"]["Ev"] > 1.0
    assert ddi_res["event_citation"] == decay_res["citation"]

def test_case_event_temporal_exponential_decay():
    """Verify that event stress decays exponentially over time."""
    now = datetime.now(timezone.utc)
    # Event logged today vs 21 days later (one full half-life)
    event_fresh = {"event_type": "court_hearing", "date": now, "decay_days": 14, "stress_weight_prior": 1.2}
    event_decayed = {"event_type": "court_hearing", "date": now - timedelta(days=14), "decay_days": 14, "stress_weight_prior": 1.2}
    
    res_fresh = compute_case_events_stress_impact([event_fresh], now)
    res_decayed = compute_case_events_stress_impact([event_decayed], now)
    
    # After 1 tau, exp(-1) = 0.368
    assert res_fresh["impact_z"] > res_decayed["impact_z"]
    assert res_decayed["impact_z"] < res_fresh["impact_z"] * 0.50

def test_case_events_api_endpoints():
    """Verify GET and POST /cases/{case_id}/events API."""
    case_id = "CASE-A-STABLE"
    
    # 1. GET events
    res = client.get(f"/cases/{case_id}/events")
    assert res.status_code == 200
    events = res.json()
    assert isinstance(events, list)

    # 2. POST new event with default prior lookup
    post_payload = {
        "case_id": case_id,
        "event_type": "threat_report",
        "date": datetime.now(timezone.utc).isoformat(),
        "notes": "Witness intimidation noted by local protection officer",
        "stress_weight_prior": 1.0,  # Should auto-fill to spec 1.8
        "decay_days": 14             # Should auto-fill to spec 21
    }
    create_res = client.post(f"/cases/{case_id}/events", json=post_payload)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["event_type"] == "threat_report"
    assert created["stress_weight_prior"] == 1.8
    assert created["decay_days"] == 21

    # 3. Clean up via DELETE
    event_id = created["id"]
    del_res = client.delete(f"/cases/{case_id}/events/{event_id}")
    assert del_res.status_code == 200
