from fastapi import APIRouter, HTTPException
from database import get_db
from models import PatientCreate, PatientVitalsIn
from datetime import datetime
import uuid
import os

router = APIRouter(prefix="/patient", tags=["patient"])


@router.post("/create")
async def create_patient(data: PatientCreate):
    """
    Register a new patient (from simulation or real intake).
    Auto-dispatches nearest ambulance immediately.
    Returns emergency details including assigned ambulance + hospital.
    """
    db = get_db()
    if os.getenv("SERVICE_ROLE", "simulation") != "simulation":
        raise HTTPException(
            status_code=403,
            detail="Patient creation is allowed only on the simulation backend.",
        )

    # Save patient
    patient_id = str(uuid.uuid4())
    patient = {
        "_id": patient_id,
        "name": data.name,
        "age": data.age,
        "lat": data.location_lat,
        "lon": data.location_lon,
        "created_at": datetime.utcnow(),
    }
    await db["patients"].insert_one(patient)

    # Auto-dispatch: import here to avoid circular
    from routers.emergency import _auto_dispatch
    dispatch = await _auto_dispatch(db, patient_id, data.location_lat, data.location_lon)

    return {
        "success":   True,
        "patient":   {**patient, "created_at": patient["created_at"].isoformat()},
        "dispatch":  dispatch,
    }


@router.get("/list")
async def list_patients():
    db = get_db()
    docs = await db["patients"].find({}).to_list(length=200)
    for d in docs:
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
    return docs


# ── ESP32 / Sensor endpoint ────────────────────────────────────────────────────
@router.post("/vitals")
async def receive_vitals(data: PatientVitalsIn):
    """
    Real sensor data from ESP32 or any IoT device.
    POST to this endpoint with patient_id + vitals.
    These are stored and broadcast via WebSocket in real time.
    
    Example ESP32 code:
      HTTPClient http;
      http.begin("http://<server-ip>:8003/patient/vitals");
      http.addHeader("Content-Type", "application/json");
      String body = "{\\"patient_id\\":\\"<id>\\",\\"heart_rate\\":78,\\"spo2\\":98,\\"temperature\\":36.5}";
      http.POST(body);
    """
    db = get_db()
    patient = await db["patients"].find_one({"_id": data.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    record = {
        "_id":         str(uuid.uuid4()),
        "patient_id":  data.patient_id,
        "heart_rate":  data.heart_rate,
        "spo2":        data.spo2,
        "temperature": data.temperature,
        "device_id":   data.device_id,
        "timestamp":   datetime.utcnow(),
        "source":      "sensor" if data.device_id else "synthetic",
    }
    await db["patient_vitals"].insert_one(record)
    record["timestamp"] = record["timestamp"].isoformat()
    return {"success": True, "vitals": record}


# Keep /update as alias for ESP32 backward compat
@router.post("/update")
async def update_vitals_alias(data: PatientVitalsIn):
    return await receive_vitals(data)


@router.get("/{patient_id}/vitals/latest")
async def latest_vitals(patient_id: str):
    db = get_db()
    doc = await db["patient_vitals"].find_one(
        {"patient_id": patient_id}, sort=[("timestamp", -1)]
    )
    if not doc:
        raise HTTPException(status_code=404, detail="No vitals found")
    doc["timestamp"] = doc["timestamp"].isoformat()
    return doc


@router.get("/{patient_id}/vitals/history")
async def vitals_history(patient_id: str):
    db = get_db()
    docs = await db["patient_vitals"].find(
        {"patient_id": patient_id}, sort=[("timestamp", -1)]
    ).to_list(length=50)
    for d in docs:
        d["timestamp"] = d["timestamp"].isoformat()
    return list(reversed(docs))
