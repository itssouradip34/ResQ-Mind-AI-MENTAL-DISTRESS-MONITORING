from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, decode_token, oauth2_scheme
from app.models.models import User
from app.schemas.schemas import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == creds.email).first()
    if not user or not verify_password(creds.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    token = create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "district_id": user.district_id,
        "state_id": user.state_id
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user_id=user.id,
        name=user.name,
        district_id=user.district_id,
        state_id=user.state_id
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
