from fastapi import APIRouter, HTTPException
from database import get_db
from models import AmbulanceCreate
import uuid, random

router = APIRouter(prefix="/ambulance", tags=["ambulance"])


@router.post("/add")
async def add_ambulance(data: AmbulanceCreate):
    db = get_db()
    count = await db["ambulances"].count_documents({})
    doc = {
        "_id":             str(uuid.uuid4()),
        "label":           data.label or f"AMB-{count+1:02d}",
        "status":          "idle",
        "lat":             data.lat,
        "lon":             data.lon,
        "fuel":            round(random.uniform(75, 100), 1),
        "engine_temp":     round(random.uniform(87, 95), 1),
        "battery":         round(random.uniform(88, 100), 1),
        "assigned_patient":  None,
        "assigned_hospital": None,
    }
    await db["ambulances"].insert_one(doc)
    return {"success": True, "ambulance": doc}


@router.get("/list")
async def list_ambulances():
    db = get_db()
    return await db["ambulances"].find({}).to_list(length=200)


@router.get("/{ambulance_id}")
async def get_ambulance(ambulance_id: str):
    db = get_db()
    doc = await db["ambulances"].find_one({"_id": ambulance_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc
