import os

from service_runtime import create_service_app

SERVICE_CONFIG = {
    "control": {
        "service_name": "control-backend",
        "router_keys": ["ambulance", "hospital", "traffic", "emergency"],
        "run_simulation_tick": False,
    },
    "simulation": {
        "service_name": "simulation-backend",
        "router_keys": ["patient", "ambulance", "hospital", "traffic", "emergency", "simulation"],
        "run_simulation_tick": True,
    },
    "ambulance": {
        "service_name": "ambulance-backend",
        "router_keys": ["patient"],
        "run_simulation_tick": False,
    },
    "hospital": {
        "service_name": "hospital-backend",
        "router_keys": ["hospital", "patient"],
        "run_simulation_tick": False,
    },
}

role = os.getenv("SERVICE_ROLE", "simulation")
if role not in SERVICE_CONFIG:
    role = "simulation"
cfg = SERVICE_CONFIG[role]
os.environ["SERVICE_ROLE"] = role

app = create_service_app(
    service_name=cfg["service_name"],
    router_keys=cfg["router_keys"],
    run_simulation_tick=cfg["run_simulation_tick"],
)
