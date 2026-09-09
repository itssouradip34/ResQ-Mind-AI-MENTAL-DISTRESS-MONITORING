import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.models import Consent, Victim, Case

client = TestClient(app)

def test_consent_rejection_when_withdrawn():
    """Given a victim withdraws consent, subsequent check-in is rejected with 403 CONSENT_REQUIRED."""
    db = SessionLocal()
    # Create test victim with WITHDRAWN consent
    victim = Victim(victim_pseudo_id="VIC-TEST-WITHDRAWN", preferred_language="en", safety_preferences={})
    db.merge(victim)
    c = Consent(victim_pseudo_id="VIC-TEST-WITHDRAWN", status="WITHDRAWN", granted_scopes=["text"])
    db.merge(c)
    case = Case(id="CASE-TEST-WITHDRAWN", victim_pseudo_id="VIC-TEST-WITHDRAWN", district_id="DIST-PUN-01", state_id="MH", case_type="PoA_Harassment")
    db.merge(case)
    db.commit()
    db.close()

    response = client.post("/checkins", json={
        "victim_pseudo_id": "VIC-TEST-WITHDRAWN",
        "case_id": "CASE-TEST-WITHDRAWN",
        "answers": [{"question_id": "q1", "value": 3}],
        "free_text": "Trying to check in after withdrawing consent."
    })
    assert response.status_code == 403
    assert "CONSENT_REQUIRED" in response.json()["detail"]

def test_consent_scope_voice_exclusion():
    """Given consent scope only grants text, submitting with voice falls back without voice analysis error."""
    db = SessionLocal()
    victim = Victim(victim_pseudo_id="VIC-TEST-TEXTONLY", preferred_language="en", safety_preferences={})
    db.merge(victim)
    c = Consent(victim_pseudo_id="VIC-TEST-TEXTONLY", status="ACTIVE", granted_scopes=["text"])
    db.merge(c)
    case = Case(id="CASE-TEST-TEXTONLY", victim_pseudo_id="VIC-TEST-TEXTONLY", district_id="DIST-PUN-01", state_id="MH", case_type="PoA_Harassment")
    db.merge(case)
    db.commit()
    db.close()

    # Submit checkin requesting voice
    response = client.post("/checkins", json={
        "victim_pseudo_id": "VIC-TEST-TEXTONLY",
        "case_id": "CASE-TEST-TEXTONLY",
        "answers": [{"question_id": "q1", "value": 2}],
        "free_text": "I feel slightly better today.",
        "submitted_via": "voice"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "PROCESSED"
