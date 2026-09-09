import base64
import hashlib
import os
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from cryptography.fernet import Fernet
from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/login", auto_error=False)

# Fernet symmetric encryption for IdentityStore PII fields
_fernet_key = Fernet.generate_key()
fernet = Fernet(_fernet_key)

def encrypt_pii(data: str) -> str:
    """Encrypt sensitive PII string using Fernet."""
    if not data:
        return ""
    return fernet.encrypt(data.encode("utf-8")).decode("utf-8")

def decrypt_pii(token: str) -> str:
    """Decrypt sensitive PII string."""
    if not token:
        return ""
    try:
        return fernet.decrypt(token.encode("utf-8")).decode("utf-8")
    except Exception:
        return "[ENCRYPTED_DATA]"

def mask_phone(phone: str) -> str:
    """Mask phone number for safe non-identifying representation."""
    if not phone or len(phone) < 4:
        return "XXXX"
    return f"XXXX-XXX-{phone[-4:]}"

def hash_password(password: str) -> str:
    """Hash password using PBKDF2 with SHA256."""
    salt = os.urandom(16)
    pw_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{salt.hex()}:{pw_hash.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against PBKDF2 hash."""
    try:
        salt_hex, hash_hex = hashed_password.split(":")
        salt = bytes.fromhex(salt_hex)
        pw_hash = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(pw_hash.hex(), hash_hex)
    except Exception:
        return False

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"}
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, token: Optional[str] = Depends(oauth2_scheme)) -> Dict[str, Any]:
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required"
            )
        payload = decode_token(token)
        user_role = payload.get("role")
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: role '{user_role}' not authorized"
            )
        return payload
