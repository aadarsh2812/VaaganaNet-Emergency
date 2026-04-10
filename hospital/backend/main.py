import os
from service_runtime import create_service_app

os.environ["SERVICE_ROLE"] = "hospital"

app = create_service_app(
    service_name="hospital-backend",
    router_keys=["hospital", "patient"],
    run_simulation_tick=False,
)
