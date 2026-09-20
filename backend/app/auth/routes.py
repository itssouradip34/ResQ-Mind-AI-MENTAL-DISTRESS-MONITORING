from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, decode_token, oauth2_scheme
from app.models.models import User
from app.schemas.schemas import LoginRequest, TokenResponse, UserOut, SignupRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email).first()
    if not user or not verify_password(creds.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    victim_pseudo_id = None
    case_id = None
    if user.role == "victim":
        from app.models.models import AuditLog, Case
        v_log = db.query(AuditLog).filter(AuditLog.actor_id == user.id, AuditLog.action == "VICTIM_SIGNUP").first()
        if v_log and isinstance(v_log.after_state, dict):
            victim_pseudo_id = v_log.entity_id
            case_id = v_log.after_state.get("case_id")
        else:
            c = db.query(Case).filter(Case.district_id == user.district_id).first()
            if c:
                case_id = c.id
                victim_pseudo_id = c.victim_pseudo_id

    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "district_id": user.district_id,
        "state_id": user.state_id,
        "victim_pseudo_id": victim_pseudo_id,
        "case_id": case_id
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        name=user.name,
        district_id=user.district_id,
        state_id=user.state_id,
        victim_pseudo_id=victim_pseudo_id,
        case_id=case_id
    )

@router.get("/me", response_model=UserOut)
def get_me(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(token)
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    import uuid
    from datetime import datetime, timezone
    from app.core.security import hash_password, encrypt_pii
    from app.models.models import Victim, IdentityStore, Case, Consent, PersonalBaseline, AuditLog

    # Check if user already exists
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account with this email already exists"
        )

    user_id = f"USR-{uuid.uuid4().hex[:8].upper()}"
    pseudo_id = f"VIC-PSEUDO-{uuid.uuid4().hex[:8].upper()}"
    case_id = f"CASE-MOB-{uuid.uuid4().hex[:6].upper()}"

    # 1. Create User
    new_user = User(
        id=user_id,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="victim",
        name=payload.name,
        district_id=payload.district_id or "DIST-PUN-01",
        state_id=payload.state_id or "MH"
    )
    db.add(new_user)

    # 2. Store real PII encrypted in IdentityStore
    ident = IdentityStore(
        victim_pseudo_id=pseudo_id,
        real_name=encrypt_pii(payload.name),
        phone=encrypt_pii(payload.phone or "0000000000")
    )
    db.add(ident)

    # 3. Create Case record
    new_case = Case(
        id=case_id,
        victim_pseudo_id=pseudo_id,
        district_id=payload.district_id or "DIST-PUN-01",
        state_id=payload.state_id or "MH",
        case_type="sc_st_poa_grievance",
        status="ACTIVE"
    )
    db.add(new_case)

    # 4. Create Victim Profile with Somatics & 3 Emergency Contacts
    emergency_contacts_data = [c.model_dump() for c in (payload.emergency_contacts or [])]
    # Ensure at least standard emergency structure if empty
    if not emergency_contacts_data:
        emergency_contacts_data = [
            {"name": "Primary Support Contact", "phone": "9876543210", "relationship": "Family / Friend"},
            {"name": "Secondary Emergency Contact", "phone": "9876543211", "relationship": "Neighbour"},
            {"name": "Local Trusted Contact", "phone": "9876543212", "relationship": "Community Member"}
        ]

    victim = Victim(
        victim_pseudo_id=pseudo_id,
        preferred_language=payload.preferred_language or "en",
        safety_preferences={
            "age": payload.age or 28,
            "height_cm": payload.height_cm or 165.0,
            "weight_kg": payload.weight_kg or 62.0,
            "activity_level": payload.activity_level or "moderate",
            "emergency_contacts": emergency_contacts_data,
            "allow_automated_calling": True,
            "allow_sms_alerts": True,
            "initial_assessment": {
                "enrolled_at": datetime.now(timezone.utc).isoformat(),
                "baseline_completed": True
            }
        },
        case_id=case_id,
        is_synthetic=False
    )
    db.add(victim)

    # 5. Initialize Consent with default active scopes
    consent = Consent(
        victim_pseudo_id=pseudo_id,
        status="ACTIVE",
        granted_scopes=["text", "voice", "case_linkage"]
    )
    db.add(consent)

    # 6. Initialize Personal Baselines (self-report & weight)
    db.add(PersonalBaseline(
        victim_pseudo_id=pseudo_id,
        feature_name="self_report_score",
        running_mean=3.0,
        running_variance=1.0,
        n_observations=1
    ))
    if payload.weight_kg:
        db.add(PersonalBaseline(
            victim_pseudo_id=pseudo_id,
            feature_name="weight_kg",
            running_mean=float(payload.weight_kg),
            running_variance=1.5,
            n_observations=1
        ))

    # 7. Audit log
    audit = AuditLog(
        actor_id=user_id,
        action="VICTIM_SIGNUP",
        entity_type="Victim",
        entity_id=pseudo_id,
        before_state=None,
        after_state={"case_id": case_id, "district": new_user.district_id}
    )
    db.add(audit)
    db.commit()

    token = create_access_token({
        "sub": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "district_id": new_user.district_id,
        "state_id": new_user.state_id,
        "victim_pseudo_id": pseudo_id,
        "case_id": case_id
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=new_user.role,
        user_id=new_user.id,
        name=new_user.name,
        district_id=new_user.district_id,
        state_id=new_user.state_id,
        victim_pseudo_id=pseudo_id,
        case_id=case_id
    )
