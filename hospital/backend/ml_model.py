"""
ML Module — Survival Prediction
Features: heart_rate, spo2, temperature, eta_minutes, distance_km
Target:   survival (0/1)
"""

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
import warnings

warnings.filterwarnings("ignore")

# ─── Training Data (synthetic but realistic) ──────────────────────────────────

_X_TRAIN = np.array([
    # hr,   spo2, temp,  eta, dist  → label
    [72,   98,   36.6,  5,   2.0],   # stable
    [80,   97,   37.0,  8,   3.5],   # stable
    [65,   99,   36.5,  4,   1.5],   # stable
    [90,   95,   37.5, 10,   4.0],   # borderline
    [110,  92,   38.0, 12,   5.0],   # warning
    [130,  88,   38.5, 18,   8.0],   # critical
    [150,  82,   39.0, 22,  10.0],   # critical
    [160,  78,   39.5, 25,  12.0],   # critical
    [40,   75,   35.0, 20,   9.0],   # critical (bradycardia)
    [45,   80,   35.5, 15,   6.0],   # critical
    [85,   96,   37.2,  7,   3.0],   # stable
    [95,   94,   37.8, 11,   4.5],   # borderline
    [120,  90,   38.2, 16,   7.0],   # warning
    [140,  85,   38.8, 20,   9.5],   # critical
    [75,   97,   36.8,  6,   2.5],   # stable
    [68,   98,   36.6,  5,   2.0],   # stable
    [100,  93,   37.9, 13,   5.5],   # warning
    [115,  91,   38.1, 15,   6.5],   # warning
    [55,   85,   36.0, 18,   8.5],   # critical
    [170,  76,   40.0, 28,  14.0],   # critical
])

_Y_TRAIN = np.array([
    1, 1, 1, 1, 1,
    0, 0, 0, 0, 0,
    1, 1, 1, 0, 1,
    1, 1, 1, 0, 0,
])

# ─── Model ────────────────────────────────────────────────────────────────────

_scaler = StandardScaler()
_model = LogisticRegression(random_state=42, max_iter=500)

# Train at import time
_X_scaled = _scaler.fit_transform(_X_TRAIN)
_model.fit(_X_scaled, _Y_TRAIN)


def predict_survival(
    heart_rate: float,
    spo2: float,
    temperature: float,
    eta_minutes: float = 10.0,
    distance_km: float = 5.0,
) -> float:
    """
    Returns survival probability as a percentage (0–100).
    """
    features = np.array([[heart_rate, spo2, temperature, eta_minutes, distance_km]])
    scaled = _scaler.transform(features)
    prob = _model.predict_proba(scaled)[0][1]   # probability of class 1 (survival)
    return round(float(prob) * 100, 1)


def get_severity_label(survival_pct: float) -> str:
    if survival_pct >= 75:
        return "Stable"
    elif survival_pct >= 50:
        return "Moderate"
    elif survival_pct >= 30:
        return "Critical"
    else:
        return "Severe — Immediate Attention"
