import math
from typing import Dict, Any, Tuple
from app.core.config import settings

def update_welford(running_mean: float, running_variance: float, n_observations: int, x: float) -> Tuple[float, float, int]:
    """
    Online update of sample mean and sample variance using Welford's algorithm.
    """
    n = n_observations + 1
    delta = x - running_mean
    new_mean = running_mean + delta / n
    delta2 = x - new_mean
    # M2 estimation
    m2 = running_variance * max(1, n_observations - 1) + delta * delta2
    new_variance = m2 / max(1, n - 1) if n > 1 else max(0.01, running_variance)
    return new_mean, max(0.001, new_variance), n

def compute_blended_baseline(
    feature_name: str,
    running_mean: float,
    running_variance: float,
    n_observations: int
) -> Dict[str, Any]:
    """
    Blend personal baseline with population prior during cold start (n < 15).
    Blend weight = min(n_observations / 15.0, 1.0)
    """
    prior = settings.POPULATION_PRIORS.get(
        feature_name,
        {"mean": 0.0, "variance": 1.0}
    )
    
    blend_weight = min(n_observations / 15.0, 1.0)
    blended_mean = blend_weight * running_mean + (1.0 - blend_weight) * prior["mean"]
    blended_variance = blend_weight * running_variance + (1.0 - blend_weight) * prior["variance"]
    blended_variance = max(0.001, blended_variance)
    
    is_early = n_observations < 3
    confidence_label = "early baseline — low confidence" if is_early else "normal"
    
    std_dev = math.sqrt(blended_variance)
    band_low = blended_mean - 1.5 * std_dev
    band_high = blended_mean + 1.5 * std_dev
    
    return {
        "feature_name": feature_name,
        "n_observations": n_observations,
        "blend_weight": blend_weight,
        "blended_mean": round(blended_mean, 2),
        "blended_variance": round(blended_variance, 4),
        "std_dev": round(std_dev, 2),
        "band_low": round(band_low, 2),
        "band_high": round(band_high, 2),
        "is_early": is_early,
        "confidence_label": confidence_label
    }

def compute_z_score(
    feature_name: str,
    value: float,
    running_mean: float,
    running_variance: float,
    n_observations: int
) -> Tuple[float, Dict[str, Any]]:
    """
    Calculate personal z-score relative to blended baseline.
    """
    baseline = compute_blended_baseline(feature_name, running_mean, running_variance, n_observations)
    diff = value - baseline["blended_mean"]
    pct_change = (diff / baseline["blended_mean"] * 100.0) if baseline["blended_mean"] != 0 else 0.0
    z = diff / baseline["std_dev"]
    
    metadata = {
        "value": value,
        "baseline_mean": baseline["blended_mean"],
        "pct_change": round(pct_change, 1),
        "z_score": round(z, 2),
        "confidence_label": baseline["confidence_label"],
        "display_comparison": f"Normal {round(baseline['blended_mean'], 1)} -> Current {round(value, 1)} ({'+' if pct_change >= 0 else ''}{round(pct_change, 1)}%)"
    }
    return z, metadata
