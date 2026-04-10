import asyncio
import json
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import connect_db, close_db, get_db
from realtime_payload import build_broadcast_payload
from routers import (
    patient as patient_router,
    ambulance as ambulance_router,
    hospital as hospital_router,
    traffic as traffic_router,
    emergency as emergency_router,
    simulation_router,
)

ROUTER_MAP = {
    "patient": patient_router,
    "ambulance": ambulance_router,
    "hospital": hospital_router,
    "traffic": traffic_router,
    "emergency": emergency_router,
    "simulation": simulation_router,
}


class ConnectionManager:
    def __init__(self):
        self.connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)
        print(f"[WS] client connected — total: {len(self.connections)}")

    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)
        print(f"[WS] client disconnected — total: {len(self.connections)}")

    async def broadcast(self, data: dict):
        dead = []
        msg = json.dumps(data, default=str)
        for ws in self.connections:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


def create_service_app(service_name: str, router_keys: List[str], run_simulation_tick: bool) -> FastAPI:
    app = FastAPI(title=f"Ambulance Emergency System — {service_name}", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    for key in router_keys:
        module = ROUTER_MAP.get(key)
        if module is None:
            raise ValueError(f"Unknown router key: {key}")
        app.include_router(module.router)

    manager = ConnectionManager()

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        await manager.connect(websocket)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager.disconnect(websocket)

    async def broadcaster():
        await asyncio.sleep(3)
        while True:
            try:
                db = get_db()
                payload = await build_broadcast_payload(db, run_simulation_tick=run_simulation_tick)
                await manager.broadcast(payload)
            except Exception as e:
                print(f"[broadcaster:{service_name}] error: {e}")
                import traceback

                traceback.print_exc()
            await asyncio.sleep(2)

    @app.on_event("startup")
    async def startup():
        await connect_db()
        asyncio.create_task(broadcaster())
        print(f"[APP] {service_name} started")

    @app.on_event("shutdown")
    async def shutdown():
        await close_db()

    @app.get("/health")
    async def health():
        return {"status": "ok", "service": service_name}

    return app
