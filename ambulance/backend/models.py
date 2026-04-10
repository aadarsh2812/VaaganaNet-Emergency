from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


# ── Patient ────────────────────────────────────────────────────────────────────
class PatientCreate(BaseModel):
    name: str
    age: int
    location_lat: float   # where accident/patient is
    location_lon: float

class PatientVitalsIn(BaseModel):
    patient_id: str
    heart_rate: float
    spo2: float
    temperature: float
    # Optional fields from ESP32
    device_id: Optional[str] = None


# ── Ambulance ──────────────────────────────────────────────────────────────────
class AmbulanceCreate(BaseModel):
    lat: float
    lon: float
    label: Optional[str] = None   # e.g. "AMB-01"

class AmbulanceUpdate(BaseModel):
    status: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    fuel: Optional[float] = None
    engine_temp: Optional[float] = None
    battery: Optional[float] = None
    assigned_patient: Optional[str] = None
    assigned_hospital: Optional[str] = None


# ── Hospital ───────────────────────────────────────────────────────────────────
class HospitalCreate(BaseModel):
    name: str
    lat: float
    lon: float

# ── Traffic Light ──────────────────────────────────────────────────────────────
class TrafficLightCreate(BaseModel):
    lat: float
    lon: float
    intersection_name: Optional[str] = None

# ── Emergency ──────────────────────────────────────────────────────────────────
class EmergencyCreate(BaseModel):
    patient_id: str
    lat: float
    lon: float

# ── Simulation ─────────────────────────────────────────────────────────────────
class SimulationUpdate(BaseModel):
    speed: Optional[float] = 1.0
    traffic_sensitivity: Optional[float] = 0.05
