from fastapi import APIRouter
from models import SimulationUpdate
from simulation import update_sim_params, get_state, stop_simulation

router = APIRouter(prefix="/simulate", tags=["simulation"])


@router.post("/update")
async def update_simulation(data: SimulationUpdate):
    update_sim_params(speed=data.speed, traffic_sensitivity=data.traffic_sensitivity)
    state = get_state()
    return {
        "success": True,
        "speed": state.speed,
        "traffic_sensitivity": state.traffic_sensitivity,
    }


@router.get("/status")
async def simulation_status():
    state = get_state()
    return {
        "active":               state.active,
        "emergency_id":         state.emergency_id,
        "ambulance_id":         state.ambulance_id,
        "step":                 state.step_index,
        "total_steps":          len(state.route),
        "speed":                state.speed,
        "traffic_sensitivity":  state.traffic_sensitivity,
        "distance_km":          state.distance_km,
        "duration_min":         state.duration_min,
    }


@router.post("/stop")
async def stop_sim():
    stop_simulation()
    return {"success": True, "message": "Simulation stopped"}
