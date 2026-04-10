import os
from service_runtime import create_service_app

os.environ["SERVICE_ROLE"] = "control"

app = create_service_app(
    service_name="control-backend",
    router_keys=["ambulance", "hospital", "traffic", "emergency"],
    run_simulation_tick=False,
)
