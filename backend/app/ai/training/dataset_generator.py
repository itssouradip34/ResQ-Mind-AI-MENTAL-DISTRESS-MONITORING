import os
import json
import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List

def generate_voice_prosody_dataset(num_samples: int = 2000, seed: int = 42) -> pd.DataFrame:
    """
    Generate synthetic acoustic prosody dataset grounded in trauma psychology speech literature.
    Features:
      - pitch_variability: Standard deviation of F0 in Hz (monotone voice -> lower variability -> higher distress)
      - pause_ratio: Fraction of silence/pause frames (psychomotor slowing -> higher pause ratio -> higher distress)
      - speaking_rate: Syllables / voiced segments per second (labored speech -> lower rate -> higher distress)
      - pitch_mean: Average fundamental frequency in Hz (acute fear/strain -> elevated pitch mean)
      - jitter: Pitch perturbation / voice tremor (instability -> higher distress)
    Target:
      - voice_distress_z: Continuous standardized distress z-score (-2.0 to +3.5)
    """
    np.random.seed(seed)
    
    # 1. Latent distress state (standard normal with positive skew for trauma-affected cases)
    latent_distress = np.random.normal(loc=0.0, scale=1.0, size=num_samples)
    
    # 2. Derive acoustic features correlated with distress
    # High distress: lower pitch variability (monotone flat affect)
    pitch_variability = np.clip(
        24.0 - 5.5 * latent_distress + np.random.normal(0, 2.0, num_samples),
        5.0, 45.0
    )
    
    # High distress: higher pause ratio (hesitant, psychomotor slowed)
    pause_ratio = np.clip(
        0.22 + 0.10 * latent_distress + np.random.normal(0, 0.04, num_samples),
        0.05, 0.75
    )
    
    # High distress: lower speaking rate (slowed, labored speech)
    speaking_rate = np.clip(
        3.6 - 0.55 * latent_distress + np.random.normal(0, 0.3, num_samples),
        1.2, 5.8
    )
    
    # High distress: elevated pitch mean under acute stress/fear
    pitch_mean = np.clip(
        165.0 + 12.0 * np.maximum(0, latent_distress) + np.random.normal(0, 15.0, num_samples),
        90.0, 300.0
    )
    
    # High distress: micro-tremor (jitter)
    jitter = np.clip(
        0.012 + 0.008 * np.maximum(0, latent_distress) + np.random.normal(0, 0.003, num_samples),
        0.002, 0.05
    )
    
    # True target with realistic psychological weighting
    # Pause ratio and pitch flattening are strongest acoustic markers
    voice_distress_z = (
        0.42 * ((pause_ratio - 0.22) / 0.10)
        - 0.35 * ((pitch_variability - 24.0) / 5.5)
        - 0.25 * ((speaking_rate - 3.6) / 0.55)
        + 0.12 * ((jitter - 0.012) / 0.008)
    )
    # Add minimal measurement noise
    voice_distress_z += np.random.normal(0, 0.08, num_samples)
    voice_distress_z = np.clip(voice_distress_z, -2.5, 4.0)
    
    df = pd.DataFrame({
        "pitch_variability": np.round(pitch_variability, 2),
        "pause_ratio": np.round(pause_ratio, 4),
        "speaking_rate": np.round(speaking_rate, 2),
        "pitch_mean": np.round(pitch_mean, 1),
        "jitter": np.round(jitter, 5),
        "voice_distress_z": np.round(voice_distress_z, 3)
    })
    return df

def generate_longitudinal_ddi_dataset(num_trajectories: int = 500, checkins_per_traj: int = 5, seed: int = 42) -> List[Dict[str, Any]]:
    """
    Generate longitudinal victim well-being trajectories modeling SC/ST (PoA) Act case lifecycles:
    - Persona A: Stable / Gradual Recovery (DDI declining 48 -> 34)
    - Persona B: Gradual Deterioration (DDI rising 42 -> 72, court postponements)
    - Persona C: Acute Threat Spike (DDI spiking 44 -> 78, threat reports)
    - Persona D: Silent Disengagement (engagement latency climbing, missed check-ins)
    - Persona E: Modality Disagreement (Abstention, high component variance)
    """
    np.random.seed(seed)
    trajectories = []
    
    persona_types = ["stable_recovery", "gradual_deterioration", "threat_spike", "silent_disengagement", "modality_disagreement"]
    
    for i in range(num_trajectories):
        p_type = persona_types[i % len(persona_types)]
        traj_id = f"TRAJ-{i+1:04d}"
        
        prev_ddi = np.random.uniform(40.0, 52.0)
        history = []
        
        for step in range(checkins_per_traj):
            if p_type == "stable_recovery":
                target_ddi = max(28.0, prev_ddi - np.random.uniform(2.0, 5.0))
                text_z = np.random.normal(-0.4, 0.2)
                voice_z = np.random.normal(-0.3, 0.2)
                self_report_z = np.random.normal(-0.5, 0.2)
                eng_z = np.random.normal(0.2, 0.1)
                event_impact = 0.0
            elif p_type == "gradual_deterioration":
                target_ddi = min(82.0, prev_ddi + np.random.uniform(4.0, 8.0))
                text_z = np.random.normal(0.8 + step * 0.3, 0.2)
                voice_z = np.random.normal(0.6 + step * 0.25, 0.2)
                self_report_z = np.random.normal(0.7 + step * 0.3, 0.2)
                eng_z = np.random.normal(-0.3 - step * 0.2, 0.1)
                event_impact = 0.8 if step >= 2 else 0.2
            elif p_type == "threat_spike":
                if step < 2:
                    target_ddi = np.random.uniform(42.0, 48.0)
                    text_z = np.random.normal(-0.1, 0.2)
                    voice_z = np.random.normal(-0.1, 0.2)
                    self_report_z = np.random.normal(0.0, 0.2)
                    eng_z = 0.0
                    event_impact = 0.0
                else:
                    target_ddi = np.random.uniform(74.0, 82.0)
                    text_z = np.random.normal(1.8, 0.2)
                    voice_z = np.random.normal(1.4, 0.2)
                    self_report_z = np.random.normal(1.6, 0.2)
                    eng_z = np.random.normal(-0.8, 0.2)
                    event_impact = 1.8  # threat report
            elif p_type == "silent_disengagement":
                target_ddi = min(75.0, prev_ddi + np.random.uniform(2.0, 5.0))
                text_z = np.random.normal(0.5, 0.2)
                voice_z = None  # stops submitting audio
                self_report_z = np.random.normal(0.6, 0.2)
                eng_z = np.random.normal(-1.2 - step * 0.4, 0.2)  # acute disengagement
                event_impact = 0.3
            else:  # modality disagreement
                target_ddi = 50.0
                text_z = 1.8  # says scared
                voice_z = -1.2  # calm voice
                self_report_z = -1.5  # rates 5/5
                eng_z = 0.5
                event_impact = 0.0
            
            history.append({
                "step": step + 1,
                "text_z": round(float(text_z), 3) if text_z is not None else None,
                "voice_z": round(float(voice_z), 3) if voice_z is not None else None,
                "self_report_z": round(float(self_report_z), 3) if self_report_z is not None else None,
                "engagement_z": round(float(eng_z), 3) if eng_z is not None else None,
                "event_impact": round(float(event_impact), 3),
                "target_ddi": round(float(target_ddi), 1)
            })
            prev_ddi = target_ddi
            
        trajectories.append({
            "trajectory_id": traj_id,
            "persona_type": p_type,
            "history": history
        })
    return trajectories

def generate_case_events_dataset() -> Dict[str, Any]:
    """
    Generate empirical case event parameters for SC/ST (PoA) Act legal/administrative milestones.
    Defines baseline stress weight prior, decay half-life, and multi-event compounding interaction.
    """
    event_specs = {
        "threat_report": {
            "stress_weight_prior": 1.8,
            "decay_days": 21,
            "description": "Report of witness intimidation or direct threat to victim safety",
            "vulnerability_tier": "critical"
        },
        "court_hearing": {
            "stress_weight_prior": 1.2,
            "decay_days": 14,
            "description": "Scheduled trial hearing, cross-examination, or appearance",
            "vulnerability_tier": "high"
        },
        "police_interaction": {
            "stress_weight_prior": 0.9,
            "decay_days": 10,
            "description": "Station visit, statement recording under Sec 161 CrPC, or inquiry",
            "vulnerability_tier": "medium"
        },
        "investigation_update": {
            "stress_weight_prior": 0.8,
            "decay_days": 14,
            "description": "Chargesheet filing, scene inspection, or forensic status update",
            "vulnerability_tier": "medium"
        },
        "compensation_update": {
            "stress_weight_prior": 0.6,
            "decay_days": 14,
            "description": "Relief installment status under Rule 12(4) of SC/ST (PoA) Rules",
            "vulnerability_tier": "medium"
        },
        "relocation": {
            "stress_weight_prior": 1.1,
            "decay_days": 30,
            "description": "Emergency temporary shelter relocation or change of residence",
            "vulnerability_tier": "high"
        },
        "complaint_registration": {
            "stress_weight_prior": 0.7,
            "decay_days": 14,
            "description": "Initial FIR lodging under SC/ST (PoA) Act",
            "vulnerability_tier": "medium"
        },
        "counselling_session": {
            "stress_weight_prior": -0.5,
            "decay_days": 14,
            "description": "Trauma-informed psychosocial support session with counsellor",
            "vulnerability_tier": "protective"
        },
        "rehabilitation": {
            "stress_weight_prior": -0.6,
            "decay_days": 30,
            "description": "Livelihood support, vocational aid, or educational restoration",
            "vulnerability_tier": "protective"
        }
    }
    
    # Interaction matrix (compounding stress multipliers when multiple events co-occur)
    interaction_rules = [
        {
            "event_a": "threat_report",
            "event_b": "court_hearing",
            "compounding_multiplier": 1.45,
            "description": "Threat report preceding trial hearing severely elevates victim intimidation stress"
        },
        {
            "event_a": "threat_report",
            "event_b": "police_interaction",
            "compounding_multiplier": 1.30,
            "description": "Threat report with pending police inquiry requires immediate protection review"
        },
        {
            "event_a": "court_hearing",
            "event_b": "counselling_session",
            "compounding_multiplier": 0.75,
            "description": "Counselling immediately preceding/following court hearing buffers legal anxiety"
        }
    ]
    
    return {
        "event_specs": event_specs,
        "interaction_rules": interaction_rules
    }

def save_all_datasets(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Voice dataset
    voice_df = generate_voice_prosody_dataset(num_samples=2500)
    voice_path = os.path.join(output_dir, "voice_prosody_dataset.csv")
    voice_df.to_csv(voice_path, index=False)
    print(f"Generated voice dataset: {voice_path} ({len(voice_df)} samples)")
    
    # 2. Longitudinal DDI dataset
    ddi_trajs = generate_longitudinal_ddi_dataset(num_trajectories=600)
    ddi_path = os.path.join(output_dir, "longitudinal_ddi_dataset.json")
    with open(ddi_path, "w", encoding="utf-8") as f:
        json.dump(ddi_trajs, f, indent=2)
    print(f"Generated longitudinal DDI dataset: {ddi_path} ({len(ddi_trajs)} trajectories)")
    
    # 3. Case events dataset
    events_data = generate_case_events_dataset()
    events_path = os.path.join(output_dir, "case_events_dataset.json")
    with open(events_path, "w", encoding="utf-8") as f:
        json.dump(events_data, f, indent=2)
    print(f"Generated case events dataset: {events_path}")

if __name__ == "__main__":
    out_dir = os.path.join(os.path.dirname(__file__), "..", "..", "data")
    save_all_datasets(out_dir)
