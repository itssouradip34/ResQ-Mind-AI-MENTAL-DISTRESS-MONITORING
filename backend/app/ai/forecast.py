from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import numpy as np

def generate_trajectory_forecast(
    history: List[Dict[str, Any]],
    horizon_days: int = 7
) -> Optional[List[Dict[str, Any]]]:
    """
    Module 9/14: Trajectory 7-Day Forecast Model
    
    Only computed if >= 4 check-ins exist.
    Outputs points with mean estimate and upper/lower uncertainty bounds.
    Labeled: 'Prototype research estimate — not a clinical prediction.'
    """
    if len(history) < 4:
        return None

    scores = [h["ddi"] for h in history if h.get("ddi") is not None]
    if len(scores) < 4:
        return None

    # Linear / autoregressive trend fit on recent points
    x = np.arange(len(scores))
    y = np.array(scores)
    
    # Simple linear regression slope
    slope, intercept = np.polyfit(x, y, 1)
    
    last_timestamp_str = history[-1]["timestamp"]
    if isinstance(last_timestamp_str, str):
        last_dt = datetime.fromisoformat(last_timestamp_str.replace("Z", "+00:00"))
    else:
        last_dt = last_timestamp_str

    forecast_points = []
    current_idx = len(scores) - 1
    
    for day in range(1, horizon_days + 1, 2):
        step_dt = last_dt + timedelta(days=day)
        projected = slope * (current_idx + (day / 7.0)) + intercept
        # Dampen toward bounds [0, 100]
        projected_ddi = round(float(np.clip(projected, 15.0, 95.0)), 1)
        
        # Uncertainty widens with forecast horizon
        uncertainty = 3.0 + day * 1.5
        upper = round(min(100.0, projected_ddi + uncertainty), 1)
        lower = round(max(0.0, projected_ddi - uncertainty), 1)
        
        forecast_points.append({
            "timestamp": step_dt.isoformat(),
            "ddi": projected_ddi,
            "upper_bound": upper,
            "lower_bound": lower,
            "is_forecast": True
        })

    return forecast_points
