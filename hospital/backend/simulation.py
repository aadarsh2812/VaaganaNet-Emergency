"""
Simulation Engine
- Moves ambulance step-by-step along route
- Smaller steps = smoother animation on frontend
- Traffic lights turn green when ambulance approaches
"""

import math
from typing import List, Tuple, Optional


class SimulationState:
    def __init__(self):
        self.active:            bool  = False
        self.emergency_id:      Optional[str] = None
        self.ambulance_id:      Optional[str] = None
        self.route:             List[Tuple[float, float]] = []
        self.step_index:        int   = 0
        self.speed:             float = 1.0   # steps per tick
        self.traffic_sens:      float = 0.05  # degrees radius for green lights
        self.distance_km:       float = 0.0
        self.duration_min:      float = 0.0

    def reset(self):
        self.__init__()


_state = SimulationState()


def get_state() -> SimulationState:
    return _state


def start_simulation(
    emergency_id: str,
    ambulance_id: str,
    route: List[Tuple[float, float]],
    distance_km: float,
    duration_min: float,
):
    _state.active       = True
    _state.emergency_id = emergency_id
    _state.ambulance_id = ambulance_id
    _state.route        = route
    _state.step_index   = 0
    _state.distance_km  = distance_km
    _state.duration_min = duration_min
    print(f"[SIM] Started — {len(route)} waypoints, {distance_km:.1f} km, {duration_min:.1f} min")


def update_sim_params(speed: float = None, traffic_sensitivity: float = None):
    if speed is not None:
        _state.speed = max(0.5, min(speed, 10.0))
    if traffic_sensitivity is not None:
        _state.traffic_sens = max(0.005, min(traffic_sensitivity, 0.3))


def stop_simulation():
    _state.active = False
    print("[SIM] Stopped manually")


def _deg_dist(lat1, lon1, lat2, lon2) -> float:
    return math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2)


async def simulation_tick(db) -> dict:
    """
    Called every 2 seconds by the broadcaster.
    Advances ambulance position by `speed` steps along the route.
    Returns current position + progress info.
    """
    if not _state.active or not _state.route:
        return {}

    # Advance
    next_step = min(int(_state.step_index + _state.speed), len(_state.route) - 1)
    _state.step_index = next_step

    lat, lon = _state.route[_state.step_index]

    # Persist position to DB
    await db["ambulances"].update_one(
        {"_id": _state.ambulance_id},
        {"$set": {"lat": lat, "lon": lon}},
    )

    total  = max(len(_state.route) - 1, 1)
    progress = _state.step_index / total
    remaining_min = round(_state.duration_min * (1 - progress), 1)

    # Completed?
    if _state.step_index >= len(_state.route) - 1:
        _state.active = False
        await db["ambulances"].update_one(
            {"_id": _state.ambulance_id},
            {"$set": {"status": "idle", "assigned_patient": None, "assigned_hospital": None}},
        )
        await db["emergencies"].update_one(
            {"_id": _state.emergency_id},
            {"$set": {"status": "completed"}},
        )
        await db["hospitals"].update_one(
            {"assigned_ambulance_id": _state.ambulance_id},
            {"$inc": {"active_cases": 0}},  # keep count
        )
        print(f"[SIM] Completed emergency {_state.emergency_id}")

    # Traffic light control
    traffic_docs = await db["traffic_lights"].find({}).to_list(length=200)
    traffic_updates = []
    for tl in traffic_docs:
        dist = _deg_dist(lat, lon, tl["lat"], tl["lon"])
        new_state = "green" if dist <= _state.traffic_sens else "red"
        if tl.get("state") != new_state:
            await db["traffic_lights"].update_one(
                {"_id": tl["_id"]},
                {"$set": {"state": new_state}},
            )
        traffic_updates.append({
            "_id":   tl["_id"],
            "lat":   tl["lat"],
            "lon":   tl["lon"],
            "state": new_state,
            "intersection_name": tl.get("intersection_name"),
        })

    return {
        "emergency_id":  _state.emergency_id,
        "ambulance_id":  _state.ambulance_id,
        "lat":           lat,
        "lon":           lon,
        "progress_pct":  round(progress * 100, 1),
        "remaining_min": remaining_min,
        "distance_km":   _state.distance_km,
        "duration_min":  _state.duration_min,
        "traffic":       traffic_updates,
    }
