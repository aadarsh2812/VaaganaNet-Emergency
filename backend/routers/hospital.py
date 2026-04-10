from fastapi import APIRouter, HTTPException
from database import get_db
from models import HospitalCreate
import uuid

router = APIRouter(prefix="/hospital", tags=["hospital"])


@router.post("/add")
async def add_hospital(data: HospitalCreate):
    db = get_db()
    doc = {
        "_id":          str(uuid.uuid4()),
        "name":         data.name,
        "lat":          data.lat,
        "lon":          data.lon,
        "active_cases": 0,
        "capacity":     50,
    }
    await db["hospitals"].insert_one(doc)
    return {"success": True, "hospital": doc}


@router.get("/list")
async def list_hospitals():
    db = get_db()
    return await db["hospitals"].find({}).to_list(length=200)


@router.get("/{hospital_id}/patients")
async def hospital_patients(hospital_id: str):
    db = get_db()
    emergencies = await db["emergencies"].find(
        {"assigned_hospital": hospital_id}
    ).to_list(length=100)

    result = []
    for em in emergencies:
        patient = await db["patients"].find_one({"_id": em["patient_id"]})
        vitals  = await db["patient_vitals"].find_one(
            {"patient_id": em["patient_id"]}, sort=[("timestamp", -1)]
        )
        amb = await db["ambulances"].find_one({"_id": em.get("assigned_ambulance")})
        if vitals and "timestamp" in vitals:
            vitals["timestamp"] = vitals["timestamp"].isoformat()
        dist_km = None
        if amb:
            from routing import haversine_km
            dist_km = round(haversine_km(
                amb["lat"], amb["lon"],
                db["hospitals"].__class__,   # placeholder
                0
            ), 2) if False else em.get("distance_km")
        result.append({
            "emergency_id":  em["_id"],
            "status":        em.get("status"),
            "patient":       patient,
            "latest_vitals": vitals,
            "ambulance":     amb,
            "distance_km":   em.get("distance_km"),
            "duration_min":  em.get("duration_min"),
            "survival_pct":  em.get("survival_pct"),
        })
    return result
