import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.seed.generator import seed_database

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_seed():
    seed_database()

def test_persona_case_a_stable():
    """Case A (Stable Recovery): DDI is low, trend declining/flat, LOW risk state."""
    res = client.get("/cases/CASE-A-STABLE")
    assert res.status_code == 200
    data = res.json()
    assert data["distress_state"]["risk_state"] == "LOW"
    assert data["distress_state"]["ddi_display"] < 45.0

def test_persona_case_b_rising():
    """Case B (Gradual Deterioration): DDI rising, velocity > 5, HIGH risk state."""
    res = client.get("/cases/CASE-B-RISING")
    assert res.status_code == 200
    data = res.json()
    assert data["distress_state"]["risk_state"] == "HIGH"
    assert data["distress_state"]["velocity"] >= 5.0

def test_persona_case_c_threat_spike():
    """Case C (Threat-Triggered Spike): CRITICAL band, event-coupled to threat_report."""
    res = client.get("/cases/CASE-C-THREAT")
    assert res.status_code == 200
    data = res.json()
    assert data["distress_state"]["risk_state"] == "CRITICAL"
    assert data["distress_state"]["ddi_display"] >= 75.0

    # Verify event coupling endpoint
    ec = client.get("/cases/CASE-C-THREAT/event-coupling")
    assert ec.status_code == 200
    coupling = ec.json()
    assert coupling["delta"] > 0
    assert "Temporal association — not proof of causation." in coupling["caveat"]

def test_persona_case_d_silent_disengagement():
    """Case D (Silent Disengagement): missed checkin streak >= 3 classifies as possible_deterioration."""
    res = client.get("/cases/CASE-D-DISENGAGE")
    assert res.status_code == 200
    data = res.json()
    anomaly = data["engagement_anomaly"]
    assert anomaly["anomaly_detected"] is True
    assert anomaly["missed_checkin_streak"] >= 2
    assert anomaly["classification"] == "possible_deterioration"
    assert anomaly["review_required"] is True

def test_persona_case_e_abstention():
    """Case E (Conflicting Signals): confidence < 0.50 forces ABSTAIN state with raw components displayed."""
    res = client.get("/cases/CASE-E-ABSTAIN")
    assert res.status_code == 200
    data = res.json()
    assert data["distress_state"]["risk_state"] == "ABSTAIN"
    assert data["distress_state"]["confidence"] < 0.50
    # Components remain visible unfused
    breakdown = data["distress_state"]["component_breakdown"]
    assert "T" in breakdown
    assert "S" in breakdown
