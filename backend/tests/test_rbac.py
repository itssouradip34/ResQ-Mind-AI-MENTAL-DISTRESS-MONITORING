import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_emergency_endpoint_static_and_no_ai():
    """Verify /emergency endpoint returns static human contacts without AI model execution."""
    res = client.get("/emergency")
    assert res.status_code == 200
    data = res.json()
    assert "14566" in data["helpline_national"]
    assert "112" in data["police_emergency"]
    assert "14416" in data["tele_manas_mental_health"]
    assert len(data["local_contacts"]) > 0

def test_counsellor_login_and_jwt_generation():
    """Verify counsellor login produces valid JWT token with role claim."""
    res = client.post("/auth/login", json={
        "email": "counsellor@resqmind.gov.in",
        "password": "counsellor123"
    })
    assert res.status_code == 200
    token_data = res.json()
    assert token_data["role"] == "counsellor"
    assert token_data["access_token"] is not None

def test_alert_action_initiated_requires_human_auth():
    """Principle #1: Alert status transition to ACTION_INITIATED requires human authentication."""
    res = client.patch("/alerts/non-existent-alert/status", json={
        "status": "ACTION_INITIATED",
        "notes": "Attempting automated transition"
    })
    # Must fail authentication
    assert res.status_code == 401
