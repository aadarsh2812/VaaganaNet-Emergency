import os

from service_runtime import create_service_app

os.environ["SERVICE_ROLE"] = "ambulance"

app = create_service_app(
    service_name="ambulance-backend",
    router_keys=["patient"],
    run_simulation_tick=False,
)
