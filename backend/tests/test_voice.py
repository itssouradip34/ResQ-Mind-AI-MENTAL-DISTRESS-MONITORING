import io
import wave
import struct
import base64
import numpy as np
import pytest
from app.ai.voice_analysis import analyze_voice, extract_acoustic_dsp_from_bytes, get_voice_prosody_net

def generate_synthetic_wav_bytes(duration_sec: float = 1.0, freq: float = 180.0, sample_rate: int = 16000) -> bytes:
    """Generate in-memory WAV audio bytes with sine wave and periodic pauses."""
    n_samples = int(duration_sec * sample_rate)
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        # Create voiced tone with brief silent pause
        frames = []
        for i in range(n_samples):
            # Pause between 0.3s and 0.5s
            t = i / sample_rate
            if 0.3 <= t <= 0.55:
                val = 0
            else:
                val = int(12000.0 * np.sin(2 * np.pi * freq * t))
            frames.append(struct.pack('<h', val))
        wav.writeframes(b''.join(frames))
    return buf.getvalue()

def test_voice_acceptance_criteria_pause_ratio_above_mean():
    """
    PRD Module 6 Acceptance Criteria:
    Given two check-ins from the same victim_pseudo_id, when the second has a higher
    pause ratio than the personal rolling mean, then personal_z_scores.pause_ratio > 0.
    """
    baseline_stats = {
        "pause_ratio": {"mean": 0.22, "variance": 0.02, "n": 15},
        "pitch_variability": {"mean": 24.5, "variance": 16.0, "n": 15},
        "speaking_rate": {"mean": 3.6, "variance": 0.6, "n": 15}
    }
    
    # Check-in 1: normal pause ratio equal to personal rolling mean
    res1 = analyze_voice(
        pause_ratio=0.22,
        pitch_variability=24.5,
        speaking_rate=3.6,
        baseline_stats=baseline_stats
    )
    assert res1["personal_z_scores"]["pause_ratio"] == 0.0
    
    # Check-in 2: elevated pause ratio (0.35 > 0.22 rolling mean)
    res2 = analyze_voice(
        pause_ratio=0.35,
        pitch_variability=16.5,
        speaking_rate=2.9,
        baseline_stats=baseline_stats
    )
    # MUST be strictly > 0 per PRD
    assert res2["personal_z_scores"]["pause_ratio"] > 0.0
    assert res2["personal_z_scores"]["pause_ratio"] > res1["personal_z_scores"]["pause_ratio"]
    assert res2["voice_z"] > 0.5
    assert res2["mode"] == "real"

def test_voice_acoustic_dsp_from_bytes():
    """Verify acoustic DSP extraction from real WAV byte stream."""
    wav_bytes = generate_synthetic_wav_bytes(duration_sec=1.2, freq=210.0)
    b64_str = base64.b64encode(wav_bytes).decode('ascii')
    
    res = analyze_voice(audio_base64=b64_str)
    assert res["available"] is True
    assert res["pause_ratio"] > 0.10
    assert res["speaking_rate"] > 0.5
    assert res["audio_source"] == "live_recording"
    assert res["voice_z"] is not None

def test_voice_model_device_cuda_or_cpu():
    """Verify VoiceProsodyNet neural model loads and runs on device."""
    model, meta, device_name = get_voice_prosody_net()
    assert model is not None
    assert meta is not None
    assert "cuda" in device_name or "cpu" in device_name
