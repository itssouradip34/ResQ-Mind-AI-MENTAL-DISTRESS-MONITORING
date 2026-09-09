from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import engine, Base
from app.auth.routes import router as auth_router
from app.consent.routes import router as consent_router
from app.victims.routes import router as victims_router
from app.cases.routes import router as cases_router
from app.checkins.routes import router as checkins_router
from app.alerts.routes import router as alerts_router
from app.dashboard.routes import router as dashboard_router
from app.audit.routes import router as audit_router
from app.demo.routes import router as demo_router
from app.integrations.nhaa import router as nhaa_router
from app.schemas.schemas import EmergencyResponse, EmergencyContact

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for local Vite development & demonstration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Emergency Contact Pathway (Principle #9: Never calls AI model)
@app.get("/emergency", response_model=EmergencyResponse, tags=["Emergency Pathway"])
def get_emergency_pathway():
    """
    Module Principle #9: The /emergency endpoint never calls an AI model.
    It is an always-available, zero-latency static human-contact pathway.
    """
    return EmergencyResponse(
        mode="real",
        notice="Static human emergency contact pathway — completely autonomous from AI models.",
        helpline_national="14566 (National Helpline for SC/ST PoA - 24x7 Free)",
        police_emergency="112 (National Police Emergency Response Support System)",
        tele_manas_mental_health="14416 (Tele-MANAS Comprehensive Mental Health Helpline)",
        local_contacts=[
            EmergencyContact(
                name="Special District SC/ST Protection Cell (Pune)",
                phone="020-26123456",
                category="Protection & Police Escort",
                available_hours="24x7"
            ),
            EmergencyContact(
                name="District Legal Services Authority (DLSA) Help Desk",
                phone="020-25501234",
                category="Free Legal Aid & Witness Safeguard",
                available_hours="09:30 - 18:00"
            ),
            EmergencyContact(
                name="Special Mobile Support Unit (Nagpur)",
                phone="0712-2567890",
                category="Emergency Relocation & Medical Escort",
                available_hours="24x7"
            )
        ]
    )

# Include Modular API Routers
app.include_router(auth_router)
app.include_router(consent_router)
app.include_router(victims_router)
app.include_router(cases_router)
app.include_router(checkins_router)
app.include_router(alerts_router)
app.include_router(dashboard_router)
app.include_router(audit_router)
app.include_router(demo_router)
app.include_router(nhaa_router)

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "demo_mode": settings.DEMO_MODE,
        "synthetic_notice": settings.SYNTHETIC_BANNER_TEXT,
        "disclaimer": settings.DISCLAIMER_TEXT
    }

@app.get("/", tags=["System"])
def root():
    return {
        "message": "Welcome to RESQ-MIND Well-Being Intelligence API",
        "documentation": "/docs",
        "emergency_endpoint": "/emergency",
        "demo_mode": settings.DEMO_MODE,
        "disclaimer": settings.DISCLAIMER_TEXT
    }
