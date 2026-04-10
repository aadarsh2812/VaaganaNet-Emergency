from fastapi import APIRouter, HTTPException
from database import get_db
from models import EmergencyCreate
from routing import get_route, haversine_km
from simulation import start_simulation
from ml_model import predict_survival
import uuid
import os

router = APIRouter(prefix="/emergency", tags=["emergency"])


def _nearest(items, lat, lon):
    best, best_dist = None, float("inf")
    for item in items:
        d = haversine_km(lat, lon, item["lat"], item["lon"])
        if d < best_dist:
            best, best_dist = item, d
    return best, best_dist


async def _ensure_default_traffic_lights(db, route_coords):
    """
    Seed traffic lights once when dispatch starts if none exist.
    This guarantees traffic signal markers are visible during simulation.
    """
    if not route_coords:
        return

    existing_count = await db["traffic_lights"].count_documents({})
    if existing_count > 0:
        return

    total_points = len(route_coords)
    candidate_indexes = sorted({
        max(0, total_points // 4),
        max(0, total_points // 2),
        max(0, (total_points * 3) // 4),
    })

    docs = []
    for idx in candidate_indexes:
        lat, lon = route_coords[idx]
        docs.append({
            "_id": str(uuid.uuid4()),
            "lat": lat,
            "lon": lon,
            "intersection_name": f"Auto Junction {len(docs) + 1}",
            "state": "red",
        })

    if docs:
        await db["traffic_lights"].insert_many(docs)


async def _auto_dispatch(db, patient_id: str, lat: float, lon: float) -> dict:
    """
    Core dispatch logic — called automatically when patient is registered.
    Finds nearest idle ambulance + nearest hospital, creates emergency, starts sim.
    """
    ambulances = await db["ambulances"].find({"status": "idle"}).to_list(length=100)
    if not ambulances:
        return {"error": "No idle ambulances available"}

    hospitals = await db["hospitals"].find({}).to_list(length=100)
    if not hospitals:
        return {"error": "No hospitals registered"}

    nearest_amb,  _ = _nearest(ambulances, lat, lon)
    nearest_hosp, _ = _nearest(hospitals,  lat, lon)

    # Get route: ambulance → hospital (passes through accident area)
    route_data = await get_route(
        nearest_amb["lat"], nearest_amb["lon"],
        nearest_hosp["lat"], nearest_hosp["lon"],
    )
    await _ensure_default_traffic_lights(db, route_data["coords"])

    # ML prediction with default vitals (real ones stream in later)
    survival_pct = predict_survival(75, 97, 36.8, route_data["duration_min"], route_data["distance_km"])

    emergency_id = str(uuid.uuid4())
    emergency = {
        "_id":               emergency_id,
        "patient_id":        patient_id,
        "lat":               lat,
        "lon":               lon,
        "assigned_ambulance": nearest_amb["_id"],
        "assigned_hospital":  nearest_hosp["_id"],
        "route":             [list(c) for c in route_data["coords"]],
        "distance_km":       route_data["distance_km"],
        "duration_min":      route_data["duration_min"],
        "survival_pct":      survival_pct,
        "status":            "active",
    }
    await db["emergencies"].insert_one(emergency)

    await db["ambulances"].update_one(
        {"_id": nearest_amb["_id"]},
        {"$set": {
            "status":            "busy",
            "assigned_patient":  patient_id,
            "assigned_hospital": nearest_hosp["_id"],
        }},
    )
    await db["hospitals"].update_one(
        {"_id": nearest_hosp["_id"]},
        {"$inc": {"active_cases": 1}},
    )

    start_simulation(
        emergency_id=emergency_id,
        ambulance_id=nearest_amb["_id"],
        route=route_data["coords"],
        distance_km=route_data["distance_km"],
        duration_min=route_data["duration_min"],
    )

    return {
        "emergency_id":       emergency_id,
        "assigned_ambulance": nearest_amb["_id"],
        "ambulance_label":    nearest_amb.get("label", nearest_amb["_id"][:8]),
        "assigned_hospital":  {"id": nearest_hosp["_id"], "name": nearest_hosp["name"]},
        "distance_km":        route_data["distance_km"],
        "duration_min":       route_data["duration_min"],
        "survival_pct":       survival_pct,
        "route_source":       route_data["source"],
    }


@router.post("/create")
async def create_emergency(data: EmergencyCreate):
    """Manual emergency creation (for testing/API use)."""
    db = get_db()
    if os.getenv("SERVICE_ROLE", "simulation") != "simulation":
        raise HTTPException(
            status_code=403,
            detail="Emergency creation is allowed only on the simulation backend.",
        )
    patient = await db["patients"].find_one({"_id": data.patient_id})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    result = await _auto_dispatch(db, data.patient_id, data.lat, data.lon)
    if "error" in result:
        raise HTTPException(status_code=503, detail=result["error"])
    return {"success": True, **result}


@router.get("/list")
async def list_emergencies():
    db = get_db()
    docs = await db["emergencies"].find({}).to_list(length=200)
    for d in docs:
        d.pop("route", None)   # don't send full route in list
    return docs


@router.get("/{emergency_id}")
async def get_emergency(emergency_id: str):
    db = get_db()
    doc = await db["emergencies"].find_one({"_id": emergency_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc
