from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/integrations/nhaa", tags=["NHAA (14566) Integration"])

@router.get("/docket/{docket_id}")
def get_nhaa_docket(docket_id: str):
    """
    NHAA (14566) Integration Stub.
    Runs alongside, not instead of, NHAA grievance docket.
    Returns mocked docket status clearly flagged as MOCKED_NHAA_STUB.
    """
    return {
        "docket_id": docket_id,
        "fir_number": "FIR-2026-POAA-0481",
        "police_station": "Hingoli Rural Police Station",
        "investigation_officer": "DySP R. K. Shinde",
        "special_court_designation": "Special Court (SC/ST PoA Act) Hingoli",
        "current_legal_stage": "Charge sheet scrutiny and framing of charges",
        "relief_disbursed_stage_1": "INR 1,00,000 disbursed via Social Welfare Dept",
        "relief_stage_2_status": "Pending special court charge framing",
        "compliance_reminders_sent": 3,
        "last_hearing_date": "2026-08-14T10:30:00Z",
        "next_hearing_date": "2026-09-22T11:00:00Z",
        "source": "MOCKED_NHAA_STUB",
        "mode": "simulated",
        "notice": "Simulated docket response — real deployment interfaces with NHAA 14566 National Portal."
    }
