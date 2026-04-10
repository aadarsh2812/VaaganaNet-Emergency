from fastapi import APIRouter
from database import get_db
from models import TrafficLightCreate
import uuid

router = APIRouter(prefix="/traffic", tags=["traffic"])


@router.post("/add")
async def add_traffic_light(data: TrafficLightCreate):
    db = get_db()
    doc = {
        "_id":               str(uuid.uuid4()),
        "lat":               data.lat,
        "lon":               data.lon,
        "intersection_name": data.intersection_name or f"Junction-{uuid.uuid4().hex[:4].upper()}",
        "state":             "red",
    }
    await db["traffic_lights"].insert_one(doc)
    return {"success": True, "traffic_light": doc}


@router.get("/list")
async def list_traffic():
    db = get_db()
    return await db["traffic_lights"].find({}).to_list(length=300)
