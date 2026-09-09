import random
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password, encrypt_pii
from app.models.models import (
    User, Victim, IdentityStore, Case, Consent, CheckIn, TextAnalysis, VoiceAnalysis,
    BehaviorSignal, CaseEvent, PersonalBaseline, DistressScore, RiskPrediction,
    RiskExplanation, Alert, Intervention, AuditLog
)

DISTRICTS = [
    {"id": "DIST-PUN-01", "name": "Pune", "state": "MH"},
    {"id": "DIST-NGP-02", "name": "Nagpur", "state": "MH"},
    {"id": "DIST-WAR-01", "name": "Warangal", "state": "TS"}
]

CASE_TYPES = [
    "PoA_Land_Dispute",
    "PoA_Public_Harassment",
    "PoA_Physical_Assault",
    "PoA_Social_Boycott",
    "PoA_Workplace_Discrimination"
]

def seed_database():
    """
    Module 24: Comprehensive Synthetic Dataset Generator.
    Seeds:
    - 5 Demo Personas (Cases A-E)
    - 45 Additional Synthetic Cases (Total 50 victims)
    - 150+ Check-Ins
    - 120+ Case Events
    - Standard Users for each Role
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing synthetic data idempotently
    db.query(AuditLog).delete()
    db.query(Intervention).delete()
    db.query(Alert).delete()
    db.query(RiskExplanation).delete()
    db.query(RiskPrediction).delete()
    db.query(DistressScore).delete()
    db.query(PersonalBaseline).delete()
    db.query(CaseEvent).delete()
    db.query(BehaviorSignal).delete()
    db.query(VoiceAnalysis).delete()
    db.query(TextAnalysis).delete()
    db.query(CheckIn).delete()
    db.query(Consent).delete()
    db.query(IdentityStore).delete()
    db.query(Case).delete()
    db.query(Victim).delete()
    db.query(User).delete()
    db.commit()

    print("Cleared existing records. Seeding standard users...")

    # 1. Standard Role Users
    users = [
        User(
            id="USR-COUNSELLOR-1",
            email="counsellor@resqmind.gov.in",
            password_hash=hash_password("counsellor123"),
            name="Dr. Sunita Rao (Senior District Counsellor)",
            role="counsellor",
            district_id="DIST-PUN-01",
            state_id="MH"
        ),
        User(
            id="USR-OFFICER-1",
            email="district@resqmind.gov.in",
            password_hash=hash_password("district123"),
            name="Shri A. K. Verma (District Welfare Officer)",
            role="district_officer",
            district_id="DIST-PUN-01",
            state_id="MH"
        ),
        User(
            id="USR-STATE-1",
            email="state@resqmind.gov.in",
            password_hash=hash_password("state123"),
            name="Smt. Meera Kamble (State PoA Monitoring Cell)",
            role="state_admin",
            state_id="MH"
        ),
        User(
            id="USR-NAT-1",
            email="national@resqmind.gov.in",
            password_hash=hash_password("national123"),
            name="National Oversight Directorate (MoSJE)",
            role="national_admin"
        ),
        User(
            id="USR-AUDITOR-1",
            email="auditor@resqmind.gov.in",
            password_hash=hash_password("auditor123"),
            name="Independent Legal Compliance Auditor",
            role="auditor"
        ),
        User(
            id="USR-VICTIM-1",
            email="victim@resqmind.gov.in",
            password_hash=hash_password("victim123"),
            name="Complainant Self-Service Access",
            role="victim"
        )
    ]
    for u in users:
        db.add(u)
    db.commit()

    now = datetime.now(timezone.utc)

    # 2. SEED THE 5 CANONICAL DEMO PERSONAS
    print("Seeding canonical demo personas A through E...")

    # ----------------------------------------------------
    # Case A: Stable Recovery (flat/declining DDI)
    # ----------------------------------------------------
    va = Victim(
        victim_pseudo_id="VIC-PSEUDO-A101",
        preferred_language="en",
        safety_preferences={"do_not_call_after": "20:00", "safe_contact_time": "morning"},
        case_id="CASE-A-STABLE",
        enrolled_at=now - timedelta(days=60),
        is_synthetic=True
    )
    db.add(va)
    db.add(IdentityStore(victim_pseudo_id=va.victim_pseudo_id, real_name=encrypt_pii("Ramesh P. Kamble"), phone=encrypt_pii("9823011223")))
    db.add(Consent(victim_pseudo_id=va.victim_pseudo_id, status="ACTIVE", granted_scopes=["text", "voice", "case_linkage"]))
    db.add(Case(id="CASE-A-STABLE", victim_pseudo_id=va.victim_pseudo_id, district_id="DIST-PUN-01", state_id="MH", case_type="PoA_Land_Dispute", opened_at=now - timedelta(days=60), status="PENDING_HEARING", nhaa_docket_id="NHAA-2026-0914"))
    
    # Baseline
    db.add(PersonalBaseline(victim_pseudo_id=va.victim_pseudo_id, feature_name="response_latency_sec", running_mean=7.5, running_variance=1.8, n_observations=8))
    db.add(PersonalBaseline(victim_pseudo_id=va.victim_pseudo_id, feature_name="self_report_score", running_mean=2.1, running_variance=0.8, n_observations=8))
    
    # Scores: declining trend (48 -> 42 -> 38 -> 34)
    scores_a = [48.0, 44.0, 40.0, 36.5, 34.0]
    for i, s in enumerate(scores_a):
        t = now - timedelta(days=(len(scores_a) - i) * 7)
        ds = DistressScore(
            case_id="CASE-A-STABLE",
            timestamp=t,
            ddi_display=s,
            ddi_band="LOW",
            confidence=0.88,
            velocity=-2.5,
            acceleration=0.1,
            risk_state="LOW",
            component_breakdown={"T": -0.4, "V": -0.3, "S": -0.6, "En": -0.2, "Ev": 0.0}
        )
        db.add(ds)
        db.flush()
        if i == len(scores_a) - 1:
            rp = RiskPrediction(case_id="CASE-A-STABLE", ddi_score_id=ds.id, risk_state="LOW", forecast_probability=0.10)
            db.add(rp)
            db.flush()
            db.add(RiskExplanation(
                risk_prediction_id=rp.id,
                contributing_factors=[{"text": "Well-being metrics stable within personal baseline", "weight": 0.15}],
                protective_factors=[{"text": "Strong community support network"}, {"text": "Consistent check-in completion"}],
                recommended_action="Maintain routine supportive check-ins; reinforce recovery momentum."
            ))

    db.add(CaseEvent(case_id="CASE-A-STABLE", event_type="counselling_session", date=now - timedelta(days=21), notes="Victim reported steady agricultural resumption", stress_weight_prior=0.5, decay_days=14, created_by="USR-COUNSELLOR-1"))
    db.add(CaseEvent(case_id="CASE-A-STABLE", event_type="compensation_update", date=now - timedelta(days=10), notes="First relief installment credited", stress_weight_prior=0.3, decay_days=14, created_by="USR-OFFICER-1"))

    # ----------------------------------------------------
    # Case B: Gradual Deterioration (slow-rising DDI over weeks)
    # ----------------------------------------------------
    vb = Victim(
        victim_pseudo_id="VIC-PSEUDO-B102",
        preferred_language="mr",
        safety_preferences={"do_not_call_after": "19:00"},
        case_id="CASE-B-RISING",
        enrolled_at=now - timedelta(days=70),
        is_synthetic=True
    )
    db.add(vb)
    db.add(IdentityStore(victim_pseudo_id=vb.victim_pseudo_id, real_name=encrypt_pii("Shantabai Gavai"), phone=encrypt_pii("9765432109")))
    db.add(Consent(victim_pseudo_id=vb.victim_pseudo_id, status="ACTIVE", granted_scopes=["text", "voice", "case_linkage"]))
    db.add(Case(id="CASE-B-RISING", victim_pseudo_id=vb.victim_pseudo_id, district_id="DIST-NGP-02", state_id="MH", case_type="PoA_Public_Harassment", opened_at=now - timedelta(days=70), status="IN_INVESTIGATION", nhaa_docket_id="NHAA-2026-1182"))
    
    db.add(PersonalBaseline(victim_pseudo_id=vb.victim_pseudo_id, feature_name="response_latency_sec", running_mean=9.2, running_variance=3.2, n_observations=7))
    db.add(PersonalBaseline(victim_pseudo_id=vb.victim_pseudo_id, feature_name="self_report_score", running_mean=3.2, running_variance=1.1, n_observations=7))

    # Scores: rising (42 -> 48 -> 55 -> 64 -> 71)
    scores_b = [42.0, 48.0, 56.0, 64.0, 71.5]
    for i, s in enumerate(scores_b):
        t = now - timedelta(days=(len(scores_b) - i) * 7)
        band = "HIGH" if s >= 65 else ("MEDIUM" if s >= 45 else "LOW")
        ds = DistressScore(
            case_id="CASE-B-RISING",
            timestamp=t,
            ddi_display=s,
            ddi_band=band,
            confidence=0.84,
            velocity=6.8,
            acceleration=0.5,
            risk_state=band,
            component_breakdown={"T": 0.8, "V": 0.6, "S": 0.9, "En": 0.4, "Ev": 0.7}
        )
        db.add(ds)
        db.flush()
        if i == len(scores_b) - 1:
            rp = RiskPrediction(case_id="CASE-B-RISING", ddi_score_id=ds.id, risk_state="HIGH", forecast_probability=0.78)
            db.add(rp)
            db.flush()
            exp_b = RiskExplanation(
                risk_prediction_id=rp.id,
                contributing_factors=[
                    {"text": "Distress increased 59% from personal baseline", "weight": 0.88},
                    {"text": "Acoustic hesitation and elevated pause ratio (+42%)", "weight": 0.74},
                    {"text": "Repeated court hearing postponements", "weight": 0.68}
                ],
                protective_factors=[{"text": "Family co-habitation"}],
                recommended_action="Counsellor review within 24 hours; facilitate DLSA legal counsel meeting."
            )
            db.add(exp_b)
            db.flush()
            db.add(Alert(
                case_id="CASE-B-RISING",
                risk_prediction_id=rp.id,
                level="HIGH",
                contributing_factors=exp_b.contributing_factors,
                protective_factors=exp_b.protective_factors,
                recent_case_events=[{"event_type": "court_hearing"}],
                recommended_action=exp_b.recommended_action,
                confidence=0.84,
                timestamp=now - timedelta(hours=8),
                status="NEW"
            ))

    db.add(CaseEvent(case_id="CASE-B-RISING", event_type="court_hearing", date=now - timedelta(days=28), notes="Hearing postponed due to absent witness", stress_weight_prior=1.4, decay_days=14, created_by="USR-OFFICER-1"))
    db.add(CaseEvent(case_id="CASE-B-RISING", event_type="court_hearing", date=now - timedelta(days=7), notes="Second postponement for summons reissue", stress_weight_prior=1.8, decay_days=14, created_by="USR-OFFICER-1"))

    # ----------------------------------------------------
    # Case C: Threat-Triggered Spike (CRITICAL band, 24h SLA)
    # ----------------------------------------------------
    vc = Victim(
        victim_pseudo_id="VIC-PSEUDO-C103",
        preferred_language="hi",
        safety_preferences={"prefer_emergency_outreach": True},
        case_id="CASE-C-THREAT",
        enrolled_at=now - timedelta(days=45),
        is_synthetic=True
    )
    db.add(vc)
    db.add(IdentityStore(victim_pseudo_id=vc.victim_pseudo_id, real_name=encrypt_pii("Prakash Ahirwar"), phone=encrypt_pii("9123456789")))
    db.add(Consent(victim_pseudo_id=vc.victim_pseudo_id, status="ACTIVE", granted_scopes=["text", "voice", "case_linkage"]))
    db.add(Case(id="CASE-C-THREAT", victim_pseudo_id=vc.victim_pseudo_id, district_id="DIST-PUN-01", state_id="MH", case_type="PoA_Physical_Assault", opened_at=now - timedelta(days=45), status="ACTIVE", nhaa_docket_id="NHAA-2026-0412"))

    db.add(PersonalBaseline(victim_pseudo_id=vc.victim_pseudo_id, feature_name="response_latency_sec", running_mean=8.0, running_variance=2.0, n_observations=6))
    db.add(PersonalBaseline(victim_pseudo_id=vc.victim_pseudo_id, feature_name="self_report_score", running_mean=2.8, running_variance=0.9, n_observations=6))

    # Pre-event scores: 44, 46 -> Event at -3 days -> Spike to 78.5
    scores_c = [44.0, 46.5, 48.0, 78.5]
    for i, s in enumerate(scores_c):
        t = now - timedelta(days=21 - (i * 6)) if i < 3 else (now - timedelta(days=1))
        band = "CRITICAL" if s >= 75 else "LOW"
        ds = DistressScore(
            case_id="CASE-C-THREAT",
            timestamp=t,
            ddi_display=s,
            ddi_band=band,
            confidence=0.89,
            velocity=18.5 if i == 3 else 1.2,
            acceleration=12.0 if i == 3 else 0.0,
            risk_state=band,
            component_breakdown={"T": 1.8 if i == 3 else 0.1, "V": 1.4 if i == 3 else 0.0, "S": 2.0 if i == 3 else 0.2, "En": 0.8 if i == 3 else 0.0, "Ev": 2.2 if i == 3 else 0.0}
        )
        db.add(ds)
        db.flush()
        if i == 3:
            rp = RiskPrediction(case_id="CASE-C-THREAT", ddi_score_id=ds.id, risk_state="CRITICAL", forecast_probability=0.94)
            db.add(rp)
            db.flush()
            exp_c = RiskExplanation(
                risk_prediction_id=rp.id,
                contributing_factors=[
                    {"text": "Recent threat report event coupled to acute DDI surge", "weight": 0.96},
                    {"text": "Expressed acute fear and safety concerns in text check-in", "weight": 0.92},
                    {"text": "Severe sleep disturbance and hyperarousal markers", "weight": 0.84}
                ],
                protective_factors=[{"text": "Assigned special liaison officer"}],
                recommended_action="Urgent counsellor safety review and police protection assessment within 24 hours."
            )
            db.add(exp_c)
            db.flush()
            db.add(Alert(
                case_id="CASE-C-THREAT",
                risk_prediction_id=rp.id,
                level="CRITICAL",
                contributing_factors=exp_c.contributing_factors,
                protective_factors=exp_c.protective_factors,
                recent_case_events=[{"event_type": "threat_report"}],
                recommended_action=exp_c.recommended_action,
                confidence=0.89,
                timestamp=now - timedelta(hours=3),
                status="NEW"
            ))

    db.add(CaseEvent(case_id="CASE-C-THREAT", event_type="court_hearing", date=now - timedelta(days=14), notes="Accused appeared in court", stress_weight_prior=1.5, decay_days=14, created_by="USR-OFFICER-1"))
    db.add(CaseEvent(case_id="CASE-C-THREAT", event_type="threat_report", date=now - timedelta(days=3), notes="Verbal threat received near village entrance", stress_weight_prior=2.8, decay_days=14, created_by="USR-OFFICER-1"))

    # ----------------------------------------------------
    # Case D: Silent Disengagement (streak >= 3 missed)
    # ----------------------------------------------------
    vd = Victim(
        victim_pseudo_id="VIC-PSEUDO-D104",
        preferred_language="en",
        safety_preferences={},
        case_id="CASE-D-DISENGAGE",
        enrolled_at=now - timedelta(days=50),
        is_synthetic=True
    )
    db.add(vd)
    db.add(IdentityStore(victim_pseudo_id=vd.victim_pseudo_id, real_name=encrypt_pii("Anil Meshram"), phone=encrypt_pii("9456123780")))
    db.add(Consent(victim_pseudo_id=vd.victim_pseudo_id, status="ACTIVE", granted_scopes=["text", "voice", "case_linkage"]))
    db.add(Case(id="CASE-D-DISENGAGE", victim_pseudo_id=vd.victim_pseudo_id, district_id="DIST-WAR-01", state_id="TS", case_type="PoA_Social_Boycott", opened_at=now - timedelta(days=50), status="ACTIVE", nhaa_docket_id="NHAA-2026-0775"))
    
    # 3 consecutive missed checkins
    db.add(BehaviorSignal(victim_pseudo_id=vd.victim_pseudo_id, timestamp=now - timedelta(days=15), response_latency_sec=12.0, response_length_chars=40, missed_checkin=True))
    db.add(BehaviorSignal(victim_pseudo_id=vd.victim_pseudo_id, timestamp=now - timedelta(days=8), response_latency_sec=15.0, response_length_chars=20, missed_checkin=True))
    db.add(BehaviorSignal(victim_pseudo_id=vd.victim_pseudo_id, timestamp=now - timedelta(days=1), response_latency_sec=22.0, response_length_chars=0, missed_checkin=True))

    db.add(DistressScore(
        case_id="CASE-D-DISENGAGE",
        timestamp=now - timedelta(days=1),
        ddi_display=68.0,
        ddi_band="HIGH",
        confidence=0.62,
        velocity=5.5,
        acceleration=1.2,
        risk_state="HIGH",
        component_breakdown={"T": None, "V": None, "S": 0.8, "En": 1.4, "Ev": 1.1}
    ))
    db.add(CaseEvent(case_id="CASE-D-DISENGAGE", event_type="police_interaction", date=now - timedelta(days=18), notes="Hostile interrogation reported during statement recording", stress_weight_prior=2.0, decay_days=14, created_by="USR-OFFICER-1"))

    # ----------------------------------------------------
    # Case E: Conflicting Signals (Module 16 ABSTAIN State)
    # ----------------------------------------------------
    ve = Victim(
        victim_pseudo_id="VIC-PSEUDO-E105",
        preferred_language="mr",
        safety_preferences={},
        case_id="CASE-E-ABSTAIN",
        enrolled_at=now - timedelta(days=35),
        is_synthetic=True
    )
    db.add(ve)
    db.add(IdentityStore(victim_pseudo_id=ve.victim_pseudo_id, real_name=encrypt_pii("Vimalabai Thorat"), phone=encrypt_pii("9632587410")))
    db.add(Consent(victim_pseudo_id=ve.victim_pseudo_id, status="ACTIVE", granted_scopes=["text", "voice", "case_linkage"]))
    db.add(Case(id="CASE-E-ABSTAIN", victim_pseudo_id=ve.victim_pseudo_id, district_id="DIST-PUN-01", state_id="MH", case_type="PoA_Workplace_Discrimination", opened_at=now - timedelta(days=35), status="ACTIVE", nhaa_docket_id="NHAA-2026-0551"))
    
    # Text distress high (+1.8), self-report negative/coping (-1.2), voice neutral -> High variance -> Confidence < 0.5 -> ABSTAIN
    ds_e = DistressScore(
        case_id="CASE-E-ABSTAIN",
        timestamp=now - timedelta(hours=12),
        ddi_display=54.0,
        ddi_band="ABSTAIN",
        confidence=0.42,  # < 0.50 forces ABSTAIN
        velocity=0.0,
        acceleration=0.0,
        risk_state="ABSTAIN",
        component_breakdown={"T": 1.9, "V": 0.1, "S": -1.4, "En": 0.2, "Ev": None}
    )
    db.add(ds_e)
    db.flush()

    rp_e = RiskPrediction(case_id="CASE-E-ABSTAIN", ddi_score_id=ds_e.id, risk_state="ABSTAIN", forecast_probability=None)
    db.add(rp_e)
    db.flush()

    exp_e = RiskExplanation(
        risk_prediction_id=rp_e.id,
        contributing_factors=[
            {"text": "Elevated distress keywords in text check-in (T = +1.9)", "weight": 0.75},
            {"text": "Self-report Likert ratings indicate minimal distress (S = -1.4)", "weight": 0.70}
        ],
        protective_factors=[{"text": "Engagement remains active"}],
        recommended_action="AI cannot reliably assess due to modality disagreement. Human follow-up recommended."
    )
    db.add(exp_e)
    db.flush()

    db.add(Alert(
        case_id="CASE-E-ABSTAIN",
        risk_prediction_id=rp_e.id,
        level="ABSTAIN",
        contributing_factors=exp_e.contributing_factors,
        protective_factors=exp_e.protective_factors,
        recent_case_events=[],
        recommended_action=exp_e.recommended_action,
        confidence=0.42,
        timestamp=now - timedelta(hours=12),
        status="NEW"
    ))

    # ----------------------------------------------------
    # 3. Seed 45 Additional Synthetic Cases across Districts
    # ----------------------------------------------------
    print("Seeding remaining 45 synthetic cases across districts and languages...")
    languages = ["en", "hi", "mr"]
    for i in range(1, 46):
        c_id = f"CASE-SYNTH-{i:03d}"
        v_id = f"VIC-SYNTH-{i:03d}"
        d = DISTRICTS[i % len(DISTRICTS)]
        lang = languages[i % len(languages)]
        ctype = CASE_TYPES[i % len(CASE_TYPES)]

        vic = Victim(
            victim_pseudo_id=v_id,
            preferred_language=lang,
            safety_preferences={"safe_contact_time": "evening" if i % 2 == 0 else "morning"},
            case_id=c_id,
            enrolled_at=now - timedelta(days=random.randint(20, 90)),
            is_synthetic=True
        )
        db.add(vic)
        db.add(IdentityStore(victim_pseudo_id=v_id, real_name=encrypt_pii(f"Synthetic Complainant {i}"), phone=encrypt_pii(f"98000{i:05d}")))
        db.add(Consent(victim_pseudo_id=v_id, status="ACTIVE", granted_scopes=["text", "voice", "case_linkage"]))
        
        c = Case(
            id=c_id,
            victim_pseudo_id=v_id,
            district_id=d["id"],
            state_id=d["state"],
            case_type=ctype,
            opened_at=now - timedelta(days=random.randint(20, 90)),
            status=random.choice(["ACTIVE", "PENDING_HEARING", "IN_INVESTIGATION"]),
            nhaa_docket_id=f"NHAA-2026-{1000 + i}"
        )
        db.add(c)
        db.flush()

        # Seed 2-4 checkins per case
        num_checkins = random.randint(2, 4)
        base_score = random.uniform(35.0, 72.0)
        for j in range(num_checkins):
            t_checkin = now - timedelta(days=(num_checkins - j) * random.randint(5, 9))
            score_val = round(base_score + random.uniform(-4.0, 5.0), 1)
            b_state = "CRITICAL" if score_val >= 75 else ("HIGH" if score_val >= 60 else ("MEDIUM" if score_val >= 45 else "LOW"))
            
            chk = CheckIn(
                victim_pseudo_id=v_id,
                case_id=c_id,
                answers=[{"question_id": "q1", "value": random.randint(1, 4)}, {"question_id": "q2", "value": random.randint(1, 4)}],
                free_text="Routine check-in response for weekly monitoring.",
                language=lang,
                submitted_via="text",
                is_synthetic=True,
                created_at=t_checkin
            )
            db.add(chk)
            
            dscore = DistressScore(
                case_id=c_id,
                timestamp=t_checkin,
                ddi_display=score_val,
                ddi_band=b_state,
                confidence=round(random.uniform(0.75, 0.92), 2),
                velocity=round(random.uniform(-3.0, 4.0), 1),
                acceleration=0.0,
                risk_state=b_state,
                component_breakdown={"T": 0.1, "V": 0.0, "S": 0.2, "En": 0.0, "Ev": 0.0}
            )
            db.add(dscore)

        # Seed 2-3 case events per case to exceed 100 events total
        for _ in range(random.randint(2, 3)):
            db.add(CaseEvent(
                case_id=c_id,
                event_type=random.choice(["complaint_registration", "investigation_update", "court_hearing", "compensation_update", "police_interaction"]),
                date=now - timedelta(days=random.randint(5, 50)),
                notes="Formal administrative status recorded.",
                stress_weight_prior=random.choice([0.8, 1.2, 1.5, 2.0]),
                decay_days=14,
                created_by="USR-OFFICER-1"
            ))

    db.commit()
    print("Database seeding successfully completed!")
    print(f"Seeded: {db.query(User).count()} Users, {db.query(Case).count()} Cases, {db.query(CheckIn).count()} Check-ins, {db.query(CaseEvent).count()} Events.")
    db.close()

if __name__ == "__main__":
    seed_database()
