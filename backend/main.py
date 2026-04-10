"""
Intelligent Ambulance Emergency Response System — Backend
FastAPI + MongoDB + WebSocket + ML
"""

import asyncio
import json
from datetime import datetime
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import connect_db, close_db, get_db
from simulation import simulation_tick, get_state
from ml_model import predict_survival, get_severity_label

from routers import (
    patient as patient_router,
    ambulance as ambulance_router,
    hospital as hospital_router,
    traffic as traffic_router,
    emergency as emergency_router,
    simulation_router,
)

app = FastAPI(title="Ambulance Emergency System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patient_router.router)
app.include_router(ambulance_router.router)
app.include_router(hospital_router.router)
app.include_router(traffic_router.router)
app.include_router(emergency_router.router)
app.include_router(simulation_router.router)


# ─── WebSocket Manager ────────────────────────────────────────────────────────

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
        msg  = json.dumps(data, default=str)
        for ws in self.connections:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()   # keep-alive ping from client
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ─── Background Broadcaster ───────────────────────────────────────────────────

async def broadcaster():
    """Every 2 seconds: run sim tick + broadcast full state to all clients."""
    await asyncio.sleep(3)   # wait for startup
    while True:
        try:
            db = get_db()

            # ── 1. Advance simulation one tick ────────────────────────────────
            sim_result = await simulation_tick(db)

            # ── 2. Fetch current DB state ─────────────────────────────────────
            ambulances  = await db["ambulances"].find({}).to_list(length=100)
            hospitals   = await db["hospitals"].find({}).to_list(length=100)
            traffic     = await db["traffic_lights"].find({}).to_list(length=200)
            emergencies = await db["emergencies"].find({"status": "active"}).to_list(length=20)

            # ── 3. Build route + emergency location from sim state ────────────
            state        = get_state()
            active_route = []
            emergency_loc = None

            if state.active and state.route:
                # Full route list → [[lat,lon], ...]
                active_route = [list(c) for c in state.route]

            # Get emergency location (accident scene lat/lon) from DB record
            if state.emergency_id:
                em_doc = await db["emergencies"].find_one({"_id": state.emergency_id})
                if em_doc:
                    emergency_loc = {
                        "lat": em_doc.get("lat"),
                        "lon": em_doc.get("lon"),
                    }

            # ── 4. Patient vitals + ML predictions ───────────────────────────
            patient_data = []
            for em in emergencies:
                pid = em.get("patient_id")
                vitals = await db["patient_vitals"].find_one(
                    {"patient_id": pid},
                    sort=[("timestamp", -1)],
                )
                if vitals:
                    vitals["timestamp"] = vitals["timestamp"].isoformat()
                    total_steps   = max(len(state.route) - 1, 1) if state.route else 1
                    progress      = state.step_index / total_steps
                    eta_remaining = max(state.duration_min * (1 - progress), 0)

                    survival_pct = predict_survival(
                        vitals["heart_rate"],
                        vitals["spo2"],
                        vitals["temperature"],
                        eta_remaining,
                        state.distance_km,
                    )
                    patient_data.append({
                        "patient_id":   pid,
                        "emergency_id": em["_id"],
                        "vitals":       vitals,
                        "survival_pct": survival_pct,
                        "severity":     get_severity_label(survival_pct),
                    })

            # ── 5. Build and broadcast payload ────────────────────────────────
            payload = {
                "timestamp":     datetime.utcnow().isoformat(),
                "simulation":    sim_result,          # ambulance_id, lat, lon, progress_pct, remaining_min
                "route":         active_route,        # [[lat,lon],...] full route polyline
                "emergency_loc": emergency_loc,       # {lat, lon} accident marker
                "ambulances":    ambulances,          # full ambulance list with updated positions
                "hospitals":     hospitals,
                "traffic":       traffic,
                "patients":      patient_data,
            }

            await manager.broadcast(payload)

        except Exception as e:
            print(f"[broadcaster] error: {e}")
            import traceback; traceback.print_exc()

        await asyncio.sleep(2)


# ─── Lifecycle ────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    await connect_db()
    asyncio.create_task(broadcaster())
    print("[APP] Ambulance System backend started")


@app.on_event("shutdown")
async def shutdown():
    await close_db()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ambulance-backend"}
