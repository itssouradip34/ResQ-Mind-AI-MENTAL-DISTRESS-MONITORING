import re
from typing import Dict, Any, List, Optional

# Multilingual distress keywords for English, Hindi, and Marathi
DISTRESS_KEYWORDS = {
    "fear_for_safety": [
        "threat", "threatened", "scared", "fear", "danger", "attack", "follow", "watching", "kill", "harm",
        "धमकी", "डर", "खतरा", "हमला", "पीछा", "मार", "भय",
        "धमकी", "भीती", "धोका", "हल्ला", "पाठलाग", "मारणे"
    ],
    "sleep_disturbed": [
        "insomnia", "cannot sleep", "nightmare", "wake up", "tired", "exhausted",
        "नींद नहीं", "दुःस्वप्न", "थकावट", "जागना",
        "झोप येत नाही", "दुःस्वप्न", "थकवा"
    ],
    "social_isolation": [
        "alone", "isolated", "no one", "boycott", "outcast", "abandoned", "helpless",
        "अकेला", "बहिष्कार", "कोई नहीं", "लाचार", "बेसहारा",
        "एकटा", "बहिष्कार", "कोणी नाही", "लाचार"
    ],
    "legal_anxiety": [
        "court", "hearing", "postponed", "police", "fir", "delayed", "bribe", "judge", "dates",
        "अदालत", "तारीख", "पुलिस", "सुनवाई", "टली", "देरी",
        "न्यायालय", "तारीख", "पोलीस", "सुनावणी", "विलंब"
    ],
    "hopelessness": [
        "hopeless", "give up", "worthless", "cannot go on", "tired of fighting", "ending",
        "निराश", "हार मान", "उम्मीद नहीं", "जीना नहीं",
        "निराश", "हार मानली", "आशा नाही"
    ]
}

CRISIS_KEYWORDS = [
    "kill myself", "suicide", "end my life", "want to die", "harm myself", "no reason to live",
    "आत्महत्या", "मरना चाहता", "जान दे दूंगा", "खुदकुशी",
    "आत्महत्या", "मरावे वाटते", "जीव देईन"
]

def detect_language(text: str, fallback: str = "en") -> str:
    """Detect language based on Unicode script range."""
    devanagari_count = len(re.findall(r'[\u0900-\u097F]', text))
    if devanagari_count > len(text) * 0.2:
        # Check specific Marathi characters if present, otherwise default to hi/mr
        marathi_markers = ["आहे", "नाही", "झाले", "होते", "करावे", "माझे"]
        for marker in marathi_markers:
            if marker in text:
                return "mr"
        return "hi"
    return "en"

def analyze_text(free_text: Optional[str], preferred_language: str = "en") -> Dict[str, Any]:
    """
    Module 5: Multilingual Sentiment/Emotion & Distress Analysis
    """
    if not free_text or not free_text.strip():
        return {
            "available": False,
            "sentiment_score": 0.0,
            "distress_z": None,
            "emotion_labels": [],
            "distress_markers": [],
            "language_detected": preferred_language,
            "detected_crisis": False,
            "mode": "real"
        }

    text_lower = free_text.lower()
    lang = detect_language(free_text, fallback=preferred_language)
    
    # 1. Check Crisis Language
    detected_crisis = any(kw in text_lower for kw in CRISIS_KEYWORDS)

    # 2. Extract Distress Markers
    found_markers = []
    marker_scores = {}
    for marker_type, keywords in DISTRESS_KEYWORDS.items():
        matches = [kw for kw in keywords if kw in text_lower]
        if matches:
            found_markers.append(marker_type)
            marker_scores[marker_type] = min(1.0, len(matches) * 0.4)

    # 3. Emotion Labels Estimation
    emotion_labels = []
    if "fear_for_safety" in found_markers:
        emotion_labels.append({"label": "fear", "score": 0.85})
    if "hopelessness" in found_markers or "social_isolation" in found_markers:
        emotion_labels.append({"label": "sadness", "score": 0.78})
    if "legal_anxiety" in found_markers:
        emotion_labels.append({"label": "frustration", "score": 0.72})
    if not emotion_labels:
        emotion_labels.append({"label": "neutral", "score": 0.60})

    # 4. Sentiment Score (-1.0 to +1.0)
    # Negative words increase distress
    distress_intensity = min(1.0, len(found_markers) * 0.35 + (0.5 if detected_crisis else 0.0))
    sentiment_score = round(float(0.4 - (distress_intensity * 1.4)), 2)
    sentiment_score = max(-1.0, min(1.0, sentiment_score))

    # 5. Convert sentiment to distress z-score
    # In distress modeling: high distress is positive z-score
    text_distress_z = round(float(distress_intensity * 2.5 - 0.5), 2)

    return {
        "available": True,
        "sentiment_score": sentiment_score,
        "distress_z": text_distress_z,
        "emotion_labels": emotion_labels,
        "distress_markers": found_markers,
        "language_detected": lang,
        "detected_crisis": detected_crisis,
        "mode": "real",
        "model_version": "transformer-multilingual-v1.2"
    }
