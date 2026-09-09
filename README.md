# RESQ-MIND — Trauma-Aware Longitudinal Victim Well-Being Intelligence

> **Non-Negotiable Legal & Ethical Framing**:  
> **RESQ-MIND never diagnoses. It never acts autonomously.**  
> Every score is a prioritization signal for an authorized human counsellor or official.  
> Every UI surface showing a risk score carries the mandatory label:  
> **"Prototype AI risk estimate — not a clinical diagnosis."**  
> No clinical diagnosis labels (such as "PTSD", "depression", or "MDD") exist anywhere in the schema, database, or user interface.

---

## 1. Product Overview

**RESQ-MIND** is an early-warning and well-being intelligence platform designed specifically for victims and complainants under the **Scheduled Castes and Scheduled Tribes (Prevention of Atrocities) Act, 1989 (SC/ST PoA Act)**.

It runs **alongside, not instead of, NHAA (National Helpline Against Atrocities — 14566)**. It operates in the prolonged, high-vulnerability intervals between legal milestones (FIR registration → investigation updates → court hearings → relief tranches → verdict → rehabilitation).

### Key Architectural Pillars
1. **Personal-Baseline-Relative Scoring (Module 8)**: Tracks deviations against the victim’s own historical rolling mean using Welford's online algorithm, preventing population distortion.
2. **Case-Event Stress Coupling (Module 11)**: Flagship temporal analysis linking legal milestones (e.g., hearing postponements, intimidation reports) to DDI spikes (`"Temporal association — not proof of causation."`).
3. **Abstention as a First-Class State (Module 16)**: Explicitly surfaces `"AI cannot reliably assess current distress. Human follow-up recommended."` whenever modality signals disagree or data is sparse, displaying unfused raw components to counsellors.
4. **India-Context Deterministic Intervention Engine (Module 17)**: Maps risk and case context to ranked suggestions (DLSA legal aid, Tele-MANAS 14416 referral, victim protection assessment). The selected option remains `null` until an authorized human counsellor records it.
5. **Human-in-the-Loop Constraint**: No alert or action can transition to `ACTION_INITIATED` without a verified User foreign key.
6. **Privacy-by-Design & Zero Caste Profiling**: Real PII is isolated in `IdentityStore` and never queried by aggregate dashboards. **No table or column in the entire database stores a caste or community field.**

---

## 2. Real vs. Simulated Capability Architecture (PRD §10)

| Capability | Status in Prototype | Mode Badge / UI Treatment |
|---|---|---|
| **Multilingual Text Sentiment & Distress Markers** | **Real** (Multilingual NLP, keyword distress & crisis gating) | `Mode: Real` |
| **Speech Prosody Feature Extraction** | **Real Pipeline** (Librosa/acoustic pitch variability, pause ratio, speaking rate) | `Mode: Real (Synthetic Audio)` |
| **DDI EWMA Fusion & Confidence Engine** | **Real** (Deterministic mathematical model, $\alpha=0.3$, tanh scaling) | `Mode: Real` |
| **Welford Personal Baseline** | **Real** (Online mean/variance updating, cold-start prior blending) | `Mode: Real` |
| **Flagship Case-Event Stress Coupling** | **Real** (Pre/post event DDI delta, confounded event detection) | `Mode: Real` |
| **Explainable Risk Cards** | **Real** (Derived strictly from non-zero component weights) | `Mode: Real` |
| **Conversational Assistant** | **Simulated Framing** (Deterministic, template-driven decision tree) | `Mode: Simulated` |
| **NHAA (14566) Docket Integration** | **Simulated Stub** (`/integrations/nhaa/docket/{id}`, labeled `MOCKED_NHAA_STUB`) | `Mode: Simulated` |
| **Government SSO** | **Simulated Stub** (Standard JWT demo authentication) | `Mode: Simulated` |
| **Real Telephony / IVRS** | **Simulated Stub** (In-app audio note simulation) | `Mode: Simulated` |

---

## 3. Technology Architecture & Directory Layout

```
resq-mind/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, database engine, security & Fernet encryption
│   │   ├── models/         # 18 SQLAlchemy models (PRD §20)
│   │   ├── schemas/        # Pydantic v2 request/response validation schemas
│   │   ├── ai/             # Core engines: DDI, Welford baseline, text, voice, coupling, forecast, explainability, interventions
│   │   ├── auth/           # Login & JWT token routes
│   │   ├── consent/        # Granular consent state machine (ACTIVE, PAUSED, WITHDRAWN, DELETION)
│   │   ├── victims/        # Victim profile & safety preference endpoints
│   │   ├── cases/          # Case lifecycle, trajectory, events & interventions
│   │   ├── checkins/       # Multimodal check-in ingestion & chat assistant
│   │   ├── alerts/         # Priority review queue (SLA countdowns) & alert transitions
│   │   ├── dashboard/      # District, State, and National dashboards (k >= 5 floor)
│   │   ├── audit/          # Immutable append-only audit trail
│   │   ├── demo/           # 1-click SIH Demo scenario activation
│   │   ├── integrations/   # NHAA (14566) mocked stub
│   │   ├── seed/           # Synthetic dataset generator (50+ victims, 140 check-ins, 120+ events)
│   │   └── main.py         # FastAPI application entrypoint & static /emergency pathway
│   ├── tests/              # 16 automated pytest unit, integration, and persona regression tests
│   ├── Dockerfile
│   ├── requirements.txt
│   └── run_backend.py
├── frontend/
│   ├── src/
│   │   ├── api/            # API client with token management
│   │   ├── components/     # DemoBanner, DisclaimerBadge, ModeBadge, DemoScenarioSelector, EmergencyModal, Navbar
│   │   ├── i18n/           # English, Hindi (हिन्दी), Marathi (मराठी) translations
│   │   ├── pages/          # Victim, Counsellor, District, State, National, Admin pages
│   │   ├── App.tsx         # Central application state & routing
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 4. Setup and Execution

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Seed the synthetic dataset (Cases A-E, 50 victims, 140 check-ins, 120+ events)
python -m app.seed.generator

# Run automated test suite
python -m pytest -v

# Start backend server (runs at http://localhost:8000)
python run_backend.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run dev
# Frontend runs at http://localhost:5173
```

### Docker Compose Setup
```bash
docker-compose up --build
```

---

## 5. Canonical Demo Personas (Cases A–E) & SIH Demo Controls

Use the floating **"SIH 2026 Demo Mode"** panel located on the bottom-right corner of any screen to trigger 1-click scenario switches:

1. **Case C: Threat-Triggered Spike (`CASE-C-THREAT`)**:
   - Acute `threat_report` event coupled to sudden DDI surge ($44 \to 78.5$).
   - CRITICAL band alert with active 24h SLA countdown.
   - Flagship event-coupling card shows:  
     `THREAT REPORT ↓ 2 days later ↓ DDI rises 44 → 78 ("Temporal association — not proof of causation.")`.
2. **Case B: Gradual Deterioration (`CASE-B-RISING`)**:
   - Slow-rising DDI ($42 \to 71.5$) coupled to repeated hearing postponements.
   - Progresses into HIGH band, recommending DLSA legal aid referral.
3. **Case E: Conflicting Signals / Abstention (`CASE-E-ABSTAIN`)**:
   - Text check-in indicates distress ($T = +1.9$), while self-report indicates coping ($S = -1.4$).
   - High cross-modality variance drops confidence below $0.50$, forcing the **ABSTAIN** state.
   - Counsellor sees a neutral gray card with all 5 raw component signals displayed unfused.
4. **Case D: Silent Disengagement (`CASE-D-DISENGAGE`)**:
   - Missed check-in streak $\ge 3$ after a stressful police interaction.
   - Module 13 triggers 3-way collapse detection (`possible_deterioration`) with non-committal explanations.
5. **Case A: Stable Recovery (`CASE-A-STABLE`)**:
   - Declining DDI ($48 \to 34$).
   - Suggests recovery-momentum reinforcement.

---

## 6. Verification & Automated Test Results

The backend includes a comprehensive automated test suite in `backend/tests/`:
```bash
python -m pytest -v
```
All **16 tests pass with 100% success**:
- `test_consent.py`: Tests consent withdrawal 403 gating and scope exclusion.
- `test_ddi.py`: Tests EWMA smoothing ($\alpha=0.3$), $<2$ components abstention, variance penalties, and velocity calculation.
- `test_kanonymity.py`: Tests that district distributions enforce $k \ge 5$ anonymity floors and verify zero caste fields in national data.
- `test_personas.py`: Persona regression testing verifying Cases A through E produce their designated clinical states.
- `test_rbac.py`: Verifies static emergency pathway (zero AI), JWT role claims, and human-in-the-loop alert constraints.

---

## 7. Production PostgreSQL Migration Pathway

The schema is written using ANSI-compliant standard SQLAlchemy types:
1. To migrate from SQLite to PostgreSQL, update `DATABASE_URL` in `.env`:
   ```env
   DATABASE_URL="postgresql://resq_admin:secure_password@db-host:5432/resq_mind"
   ```
2. The JSON columns natively map to PostgreSQL `JSONB` for indexing.
3. UUID fields use standard 36-character string representations portable to PostgreSQL `uuid`.
4. Role permissions and row-level security can be added at the PostgreSQL layer.

---

## 8. Judge Attack Questions & Defensible Answers (Summary)

- **How is this different from a chatbot?** A chatbot only responds reactively. RESQ-MIND detects longitudinal change *between* legal touchpoints—tracking personal baseline drift and case-event stress coupling without waiting for a crisis complaint.
- **Why is this not just sentiment analysis?** Text sentiment is only one of five fused, personal-baseline-relative components ($T, V, S, En, Ev$). The actual engine fuses baseline deviations, velocity, event decay, and confidence gating.
- **Can AI diagnose mental illness?** No. It is architecturally impossible in this system: no diagnosis label exists anywhere in the schema, UI copy, or output vocabulary.
- **What about caste/community bias?** No structured caste or community field exists anywhere in the database schema or dashboard query layer.
- **What happens when AI is uncertain?** It abstains explicitly (`risk_state = "ABSTAIN"`), displays raw unfused signals to the human reviewer, and never forces a confident score from contradictory evidence.
- **Who makes the final decision?** An authorized human counsellor, always. The intervention recommendation engine only ranks options; the `selected_option` field is `null` until an authorized human writes to it.
