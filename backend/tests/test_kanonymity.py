import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ai.ddi_engine import compute_variance

client = TestClient(app)

def test_district_dashboard_k_anonymity():
    """Verify district dashboard suppresses any count < 5 into 'Other / Suppressed (<5)'."""
    res = client.get("/dashboard/district/DIST-PUN-01")
    assert res.status_code == 200
    data = res.json()
    assert data["k_anonymity_satisfied"] is True
    
    # Check risk distribution cells: none should be 1, 2, 3, or 4
    for key, count in data["risk_band_distribution"].items():
        if key != "Other / Suppressed (<5)":
            assert count >= 5, f"Cell '{key}' with count {count} violated k >= 5 anonymity floor!"

def test_national_dashboard_no_caste_fields():
    """Verify national dashboard contains NO caste or community field."""
    res = client.get("/dashboard/national")
    assert res.status_code == 200
    content = str(res.json()).lower()
    assert "caste" not in content
    assert "sub-caste" not in content
    assert "community_type" not in content
