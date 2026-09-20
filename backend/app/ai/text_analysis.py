import re
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# Global cached transformer pipeline and device holder
_transformer_pipeline = None
_model_device = "cpu"
_model_name = "lxyuan/distilbert-base-multilingual-cased-sentiments-student"

def get_transformer_pipeline():
    """
    Option 2: Lazy-load pre-trained Hugging Face multilingual transformer pipeline.
    Auto-detects NVIDIA RTX 2050 GPU (CUDA) or falls back to CPU.
    """
    global _transformer_pipeline, _model_device
    if _transformer_pipeline is not None:
        return _transformer_pipeline, _model_device

    try:
        import torch
        from transformers import pipeline

        if torch.cuda.is_available():
            device_idx = 0
            _model_device = f"cuda:0 ({torch.cuda.get_device_name(0)})"
        else:
            device_idx = -1
            _model_device = "cpu"

        logger.info(f"Loading multilingual transformer {_model_name} on device: {_model_device}")
        _transformer_pipeline = pipeline(
            "sentiment-analysis",
            model=_model_name,
            device=device_idx,
            truncation=True,
            max_length=512
        )
        return _transformer_pipeline, _model_device
    except Exception as e:
        logger.warning(f"Could not load Hugging Face pipeline (using heuristic fallback): {e}")
        return None, "fallback_heuristic"

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
        marathi_markers = ["आहे", "नाही", "झाले", "होते", "करावे", "माझे"]
        for marker in marathi_markers:
            if marker in text:
                return "mr"
        return "hi"
    return "en"

def analyze_text(free_text: Optional[str], preferred_language: str = "en") -> Dict[str, Any]:
    """
    Module 5: Multilingual Sentiment/Emotion & Distress Analysis
    Combines pre-trained Hugging Face Transformer inference with rule-based safety gating.
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
            "device": "cpu",
            "mode": "real"
        }

    text_lower = free_text.lower()
    lang = detect_language(free_text, fallback=preferred_language)
    
    # 1. Check Crisis Language (Deterministic non-negotiable safety check)
    detected_crisis = any(kw in text_lower for kw in CRISIS_KEYWORDS)

    # 2. Extract Distress Markers
    found_markers = []
    for marker_type, keywords in DISTRESS_KEYWORDS.items():
        matches = [kw for kw in keywords if kw in text_lower]
        if matches:
            found_markers.append(marker_type)

    # 3. Transformer Model Inference (Option 2: Pretrained Multilingual Pipeline)
    pipe, device_used = get_transformer_pipeline()
    transformer_sentiment = None
    transformer_label = "neutral"
    transformer_conf = 0.5

    if pipe is not None:
        try:
            preds = pipe(free_text)
            if preds and len(preds) > 0:
                transformer_label = preds[0]["label"].lower()
                transformer_conf = float(preds[0]["score"])
                # Map negative -> negative score (-1 to 0), positive -> positive (0 to +1)
                if "neg" in transformer_label:
                    transformer_sentiment = -round(transformer_conf, 2)
                elif "pos" in transformer_label:
                    transformer_sentiment = round(transformer_conf, 2)
                else:
                    transformer_sentiment = 0.0
        except Exception as e:
            logger.warning(f"Transformer inference error: {e}")

    # 4. Synthesize Distress Intensity
    # If transformer predicted negative, combine with marker count
    marker_intensity = min(1.0, len(found_markers) * 0.35 + (0.5 if detected_crisis else 0.0))
    if transformer_sentiment is not None:
        # Fused sentiment score
        model_distress = max(0.0, -transformer_sentiment)
        combined_intensity = min(1.0, 0.5 * marker_intensity + 0.5 * model_distress + (0.3 if detected_crisis else 0.0))
        sentiment_score = round(float(0.3 - (combined_intensity * 1.3)), 2)
    else:
        combined_intensity = marker_intensity
        sentiment_score = round(float(0.4 - (marker_intensity * 1.4)), 2)

    sentiment_score = max(-1.0, min(1.0, sentiment_score))
    text_distress_z = round(float(combined_intensity * 2.5 - 0.5), 2)

    # 5. Emotion Labels
    emotion_labels = []
    if "fear_for_safety" in found_markers:
        emotion_labels.append({"label": "fear", "score": 0.85})
    if "hopelessness" in found_markers or "social_isolation" in found_markers:
        emotion_labels.append({"label": "sadness", "score": 0.78})
    if "legal_anxiety" in found_markers:
        emotion_labels.append({"label": "frustration", "score": 0.72})
    if not emotion_labels:
        emotion_labels.append({"label": transformer_label if transformer_sentiment is not None else "neutral", "score": round(transformer_conf, 2)})

    return {
        "available": True,
        "sentiment_score": sentiment_score,
        "distress_z": text_distress_z,
        "emotion_labels": emotion_labels,
        "distress_markers": found_markers,
        "language_detected": lang,
        "detected_crisis": detected_crisis,
        "device": device_used,
        "mode": "real",
        "model_version": f"{_model_name} on {device_used}"
    }
