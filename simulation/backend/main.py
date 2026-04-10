import os
from service_runtime import create_service_app

os.environ["SERVICE_ROLE"] = "simulation"

app = create_service_app(
    service_name="simulation-backend",
    router_keys=["patient", "ambulance", "hospital", "traffic", "emergency", "simulation"],
    run_simulation_tick=True,
)
