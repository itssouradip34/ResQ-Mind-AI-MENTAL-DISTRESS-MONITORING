import os
from pydantic_settings import BaseSettings
from typing import Dict, Any

class Settings(BaseSettings):
    PROJECT_NAME: str = "RESQ-MIND"
    PROJECT_DESCRIPTION: str = (
        "Trauma-Aware Longitudinal Victim Well-Being Intelligence & Early-Warning Platform "
        "under SC/ST (PoA) Act, 1989"
    )
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    
    DEMO_MODE: bool = True
    SECRET_KEY: str = os.getenv("JWT_SECRET", "resq-mind-demo-secret-key-for-sih-eval-2026-secure-32b")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # SQLite default, PostgreSQL-portable
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./resq_mind.db")
    
    # Field-level encryption key for IdentityStore PII
    FIELD_ENCRYPTION_KEY: str = os.getenv(
        "FIELD_ENCRYPTION_KEY", 
        "gAAAAABmZ1Y2X9Q4tL7nP8vK1mR3sJ6uT0wY4cA8eD2fG5hI="
    )

    # Cloud Telephony & SMS Gateway (Twilio API)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER: str = os.getenv("TWILIO_PHONE_NUMBER", "")
    
    # Privacy & Safety parameters
    K_ANONYMITY_FLOOR: int = 5
    ABSTAIN_CONFIDENCE_THRESHOLD: float = 0.5
    EWMA_ALPHA: float = 0.3
    
    # Non-negotiable mandatory notices
    DISCLAIMER_TEXT: str = "Prototype AI risk estimate — not a clinical diagnosis."
    RESEARCH_FORECAST_DISCLAIMER: str = "Prototype research estimate — not a clinical prediction."
    SYNTHETIC_BANNER_TEXT: str = "DEMO ENVIRONMENT — SYNTHETIC DATA ONLY"
    TEMPORAL_CAVEAT_TEXT: str = "Temporal association — not proof of causation."

    # Cold-start population priors for Welford blending
    POPULATION_PRIORS: Dict[str, Dict[str, float]] = {
        "response_latency_sec": {"mean": 8.0, "variance": 4.0},
        "response_length_chars": {"mean": 85.0, "variance": 600.0},
        "self_report_score": {"mean": 3.0, "variance": 1.2},
        "pitch_variability": {"mean": 24.5, "variance": 16.0},
        "pause_ratio": {"mean": 0.22, "variance": 0.02},
        "speaking_rate": {"mean": 3.6, "variance": 0.6}
    }

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
