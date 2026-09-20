import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.seed.generator import seed_database

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_seed():
    seed_database()

def test_mobile_signup_and_onboarding():
    """Verify victim onboarding with biometrics & 3 emergency contacts."""
    payload = {
        "email": "mobile_victim_test@resqmind.org",
        "password": "SecurePassword123!",
        "name": "Pooja Kamble",
        "phone": "9823012345",
        "age": 26,
        "height_cm": 162.0,
        "weight_kg": 54.0,
        "activity_level": "moderate",
        "preferred_language": "en",
        "district_id": "DIST-PUN-01",
        "state_id": "MH",
        "emergency_contacts": [
            {"name": "Anil Kamble (Brother)", "phone": "9823098765", "relationship": "Brother"},
            {"name": "Savita Kamble (Mother)", "phone": "9823098766", "relationship": "Mother"},
            {"name": "Gram Panchayat Officer", "phone": "9823098767", "relationship": "Community Support"}
        ]
    }
    res = client.post("/auth/signup", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "victim"
    assert data["name"] == "Pooja Kamble"

def test_nearby_counsellors():
    """Verify GPS-enabled nearby counsellor directory calculation."""
    res = client.get("/counsellors/nearby?latitude=18.5204&longitude=73.8567&radius_km=50")
    assert res.status_code == 200
    counsellors = res.json()
    assert len(counsellors) >= 2
    # Verify distance is computed and sorted
    assert "distance_km" in counsellors[0]
    assert counsellors[0]["distance_km"] <= counsellors[1]["distance_km"]
    assert "Tele-MANAS" in counsellors[0]["organization"] or "DLSA" in counsellors[0]["organization"] or "Counsellor" in counsellors[0]["title"]

def test_appointment_booking():
    """Verify victim booking a mental health appointment."""
    login_res = client.post("/auth/login", json={"email": "mobile_victim_test@resqmind.org", "password": "SecurePassword123!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    appt_payload = {
        "case_id": "CASE-MH-2026-001",
        "counsellor_id": "COUNS-PUN-01",
        "preferred_date": "2026-09-25T10:00:00Z",
        "notes": "Follow-up support for case hearing stress"
    }
    res = client.post("/counsellors/appointments", json=appt_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["CONFIRMED", "SCHEDULED"]
    assert "counsellor has been notified" in data["message"].lower()

def test_point3_automated_sos_call_and_sms():
    """
    Verify Point 3: Immediate automated call to Contact 1 with AI synthesized voice:
    'Emergency Alert from RESQ-MIND: Please call back to <User Name> immediately'
    and SMS dispatched to all 3 selected contacts.
    """
    login_res = client.post("/auth/login", json={"email": "mobile_victim_test@resqmind.org", "password": "SecurePassword123!"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    sos_payload = {
        "victim_pseudo_id": "VIC-PSEUDO-TEST",
        "case_id": "CASE-MH-2026-001",
        "user_name": "Pooja Kamble",
        "user_phone": "9823012345",
        "trigger_source": "manual_sos_button",
        "latitude": 18.5204,
        "longitude": 73.8567
    }
    res = client.post("/sos/trigger", json=sos_payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    
    # Check automated call to Contact 1
    call_info = data["automated_call"]
    assert call_info["status"] == "INITIATED"
    assert "Please call back to" in call_info["ai_voice_message"]
    assert "Pooja Kamble" in call_info["ai_voice_message"]
    assert call_info["contact_phone"] == "9823098765"

    # Check SMS alert to all 3 contacts
    sms_list = data["sms_dispatched"]
    assert len(sms_list) == 3
    assert sms_list[0]["recipient_phone"] == "9823098765"
    assert sms_list[1]["recipient_phone"] == "9823098766"
    assert sms_list[2]["recipient_phone"] == "9823098767"

def test_conversational_chat_crisis_trigger():
    """Verify chat bot triggers Point 3 SOS and emergency pathway on crisis keywords."""
    payload = {
        "victim_pseudo_id": "VIC-PSEUDO-TEST",
        "case_id": "CASE-MH-2026-001",
        "message": "I feel hopeless and I want to end my life, I cannot take it anymore",
        "language": "en"
    }
    res = client.post("/chat/message", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["detected_crisis"] is True
    assert data["trigger_point3_sos"] is True
    assert data["emergency_pathway_suggested"] is True
    assert "Tele-MANAS" in data["reply"]

def test_conversational_chat_panic_and_coping():
    """Verify chat bot suggests Box Breathing on acute panic."""
    payload = {
        "victim_pseudo_id": "VIC-PSEUDO-TEST",
        "case_id": "CASE-MH-2026-001",
        "message": "I am having severe panic and my heart is racing, I can't breathe",
        "language": "en"
    }
    res = client.post("/chat/message", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["suggested_coping_exercise"] == "box_breathing"
    assert "Box Breathing" in data["reply"]

def test_conversational_chat_somatic_appetite():
    """Verify chat bot detects appetite suppression & serotonin exhaustion."""
    payload = {
        "victim_pseudo_id": "VIC-PSEUDO-TEST",
        "case_id": "CASE-MH-2026-001",
        "message": "I have not been eating for three days, no appetite and losing weight",
        "language": "en"
    }
    res = client.post("/chat/message", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["somatic_alert"] is not None
    assert "serotonin" in data["reply"].lower()
