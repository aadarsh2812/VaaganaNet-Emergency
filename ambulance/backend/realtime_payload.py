from datetime import datetime

from ml_model import predict_survival, get_severity_label
from simulation import simulation_tick, get_state

REALTIME_STATE_ID = "global"


async def _get_emergency_location(db, emergency_id: str):
    if not emergency_id:
        return None
    em_doc = await db["emergencies"].find_one({"_id": emergency_id})
    if not em_doc:
        return None
    return {"lat": em_doc.get("lat"), "lon": em_doc.get("lon")}


async def _build_patient_data(db, emergencies, sim_emergency_id, sim_eta, sim_distance):
    patient_data = []
    for em in emergencies:
        patient_id = em.get("patient_id")
        vitals = await db["patient_vitals"].find_one(
            {"patient_id": patient_id},
            sort=[("timestamp", -1)],
        )
        if not vitals:
            continue

        if vitals.get("timestamp"):
            vitals["timestamp"] = vitals["timestamp"].isoformat()

        eta_remaining = em.get("duration_min") or 0
        distance_km = em.get("distance_km") or 0
        if sim_emergency_id and em.get("_id") == sim_emergency_id:
            if sim_eta is not None:
                eta_remaining = sim_eta
            if sim_distance is not None:
                distance_km = sim_distance

        survival_pct = predict_survival(
            vitals["heart_rate"],
            vitals["spo2"],
            vitals["temperature"],
            eta_remaining,
            distance_km,
        )
        patient_data.append(
            {
                "patient_id": patient_id,
                "emergency_id": em["_id"],
                "vitals": vitals,
                "survival_pct": survival_pct,
                "severity": get_severity_label(survival_pct),
            }
        )
    return patient_data


async def _read_snapshot_state(db):
    snapshot = await db["realtime_state"].find_one({"_id": REALTIME_STATE_ID}) or {}
    simulation = snapshot.get("simulation") or {}
    route = snapshot.get("route") or []
    emergency_loc = snapshot.get("emergency_loc")
    sim_emergency_id = simulation.get("emergency_id")
    sim_eta = simulation.get("remaining_min")
    sim_distance = simulation.get("distance_km")
    return simulation, route, emergency_loc, sim_emergency_id, sim_eta, sim_distance


async def _run_live_state(db):
    simulation = await simulation_tick(db)
    state = get_state()

    route = [list(c) for c in state.route] if state.active and state.route else []
    emergency_loc = await _get_emergency_location(db, state.emergency_id)

    total_steps = max(len(state.route) - 1, 1) if state.route else 1
    progress = state.step_index / total_steps if state.route else 0
    sim_eta = max(state.duration_min * (1 - progress), 0)
    sim_distance = state.distance_km

    simulation = {
        **simulation,
        "emergency_id": state.emergency_id,
        "distance_km": state.distance_km,
        "duration_min": state.duration_min,
    }
    return simulation, route, emergency_loc, state.emergency_id, sim_eta, sim_distance


async def build_broadcast_payload(db, run_simulation_tick: bool):
    if run_simulation_tick:
        simulation, route, emergency_loc, sim_emergency_id, sim_eta, sim_distance = await _run_live_state(db)
    else:
        simulation, route, emergency_loc, sim_emergency_id, sim_eta, sim_distance = await _read_snapshot_state(db)

    ambulances = await db["ambulances"].find({}).to_list(length=100)
    hospitals = await db["hospitals"].find({}).to_list(length=100)
    traffic = await db["traffic_lights"].find({}).to_list(length=200)
    emergencies = await db["emergencies"].find({"status": "active"}).to_list(length=20)
    patient_data = await _build_patient_data(
        db,
        emergencies,
        sim_emergency_id=sim_emergency_id,
        sim_eta=sim_eta,
        sim_distance=sim_distance,
    )

    payload = {
        "timestamp": datetime.utcnow().isoformat(),
        "simulation": simulation,
        "route": route,
        "emergency_loc": emergency_loc,
        "ambulances": ambulances,
        "hospitals": hospitals,
        "traffic": traffic,
        "patients": patient_data,
    }

    if run_simulation_tick:
        await db["realtime_state"].update_one(
            {"_id": REALTIME_STATE_ID},
            {"$set": payload},
            upsert=True,
        )

    return payload
