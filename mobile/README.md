# RESQ-MIND Mobile Application (Expo Go)

Cross-platform mental well-being and distress monitoring mobile application for victims and survivors under the SC/ST Prevention of Atrocities framework. Ready for immediate launch on **Expo Go** (Android & iOS).

---

## 🌟 Key Features Implemented

1. **Trained AI Chat Assistant (RTX 2050 GPU Accelerated)**
   - Conversational support with multilingual sentiment and distress inference.
   - Intelligent detection of panic, anxiety, trauma flashbacks, and somatic distress.
   - **Automatic Point 3 SOS escalation**: When acute suicidal ideation or danger is detected, the chatbot prompts immediate safety and triggers the Point 3 automated calling and SMS protocol.

2. **Cloud History & Onboarding Synchronization**
   - End-to-end encrypted signup and login.
   - Privacy-by-design: Real PII isolated in encrypted `IdentityStore`; zero demographic or caste attributes collected or stored.
   - Continuous synchronization of check-in answers, distress scores, and DDI timeline for confidential review by assigned district counsellors.

3. **Point 3: Automated Calling & SMS Broadcast Protocol**
   - **Contact 1 Automated Call**: Immediate automated phone call to Contact 1 with AI synthesized voice:  
     `"Emergency Alert from RESQ-MIND: Please call back to <User Name> immediately. They are in severe distress and need your urgent support."`
   - **3-Contact SMS Dispatch**: Simultaneous urgent SMS alerts sent to all 3 user-selected emergency contacts containing distress status and current GPS coordinates.
   - Direct dial handoff to Contact 1 and national helplines (`14566`, `14416`, `112`).

4. **GPS-Enabled Counsellor Directory**
   - Uses `expo-location` with Haversine distance calculations.
   - Locates nearest Tele-MANAS comprehensive mental health centres and District Legal Services Authority (DLSA) clinics.
   - In-app confidential appointment booking with date selection and counsellor notes.

5. **12-Hour Inactivity Recovery System**
   - Pure JavaScript & `AsyncStorage` inactivity tracking compatible with Expo Go.
   - Prompts check-in reminders if 12+ hours pass without opening the app to monitor emotional recovery and somatic stability.

6. **Somatic Appetite & Serotonin Tracker**
   - Regular weight tracking against Welford baseline algorithm.
   - Monitors rapid appetite loss and metabolic disruption linked to serotonin depletion during trauma.

7. **In-App Physiological Coping Micro-Interventions**
   - **4-4-4-4 Box Breathing**: Interactive countdown circle (Inhale 4s, Hold 4s, Exhale 4s, Hold 4s) stimulating the vagus nerve to down-regulate cortisol.
   - **5-4-3-2-1 Sensory Grounding**: Step-by-step sensory anchoring for panic or flashbacks.

---

## 🚀 Quick Start Guide

### Step 1: Start the Backend Server
In the project root or `backend/` directory:
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*(Listening on `0.0.0.0` allows your physical mobile device on the same local Wi-Fi to connect).*

### Step 2: Start the Expo Mobile App
In the `mobile/` directory:
```bash
cd mobile
npx expo start
```

### Step 3: Launch on Your Device
- **Physical Phone (Expo Go)**:
  1. Install the **Expo Go** app from Google Play Store or Apple App Store.
  2. Scan the QR code displayed in the terminal using your phone camera (iOS) or the Expo Go app (Android).
  3. In the app's **Settings** tab, verify that the Backend Base URL points to your computer's local Wi-Fi IP (e.g., `http://192.168.1.X:8000`).
- **Android Emulator**:
  - Press `a` in the terminal (default connects to `http://10.0.2.2:8000`).
- **Web Preview**:
  - Press `w` in the terminal to view in browser.

---

## 🔐 Credentials for Demonstration

- **Victim Demo Account**:
  - Email: `mobile_victim_test@resqmind.org`
  - Password: `SecurePassword123!`
  - Pre-enrolled with biometrics and 3 verified emergency contacts.
- **Counsellor Demo Account**:
  - Email: `counsellor_deshmukh@resqmind.org`
  - Password: `SecurePassword123!`

---

## 📋 PRD & Ethical Compliance Notice
> **PROTOTYPE AI ESTIMATE ONLY — NOT A CLINICAL DIAGNOSIS**  
> All distress indices, trajectories, and sentiment classifications are algorithmic estimates reviewed by human counsellors. Static zero-latency access to Tele-MANAS (`14416`), SC/ST PoA Helpline (`14566`), and Police Emergency (`112`) is permanently accessible across all screens.
