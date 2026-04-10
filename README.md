# 🚑 VaaganaNet Emergency — Ambulance System

A real-time emergency response system with **4 independent applications** that sync together through a shared MongoDB database.

## Architecture

```
simulation/    ← Run on Simulation Laptop   (MASTER — drives the system)
control/       ← Run on Control Centre Laptop
ambulance/     ← Run on Ambulance Laptop
hospital/      ← Run on Hospital Laptop
```

Each folder is a fully self-contained app with its own `backend/` (FastAPI) and `frontend/` (React + Vite).

## How Sync Works

```
[Simulation Backend]
    ↓ every 2 seconds
    Moves ambulance along route
    Updates traffic lights
    Writes state → MongoDB (shared)

[Control / Ambulance / Hospital Backends]
    ↓ every 2 seconds
    Reads state from MongoDB
    Broadcasts via WebSocket to their frontend

[All 4 Frontends]
    Connected via WebSocket → stay in real-time sync ✅
```

## Quick Start (All 4 Laptops)

### Step 1 — Simulation laptop runs MongoDB
```bash
mongod --dbpath /data/db --bind_ip_all
```
**Note your IP address** (e.g. `192.168.1.10`) — other laptops need this.

### Step 2 — All other laptops set their MongoDB URL
Edit `backend/.env` in each app folder:
```
MONGO_URL=mongodb://192.168.1.10:27017
DB_NAME=ambulance_db
```

### Step 3 — Each laptop starts their app
```bash
cd <app_folder>/backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

cd <app_folder>/frontend
npm install && npm run dev
```

Open browser: **http://localhost:5173**

## Run Order
1. Start MongoDB on Simulation laptop
2. Start all 4 backends (any order)
3. Open Control Centre → Add ambulances + hospitals on the map
4. Open Simulation → Register a patient → Watch all 3 dashboards update live!

## Port Summary

| Laptop | App | Backend Port | Frontend Port |
|---|---|---|---|
| Simulation | `simulation/` | 8000 | 5173 |
| Control | `control/` | 8000 | 5173 |
| Ambulance | `ambulance/` | 8000 | 5173 |
| Hospital | `hospital/` | 8000 | 5173 |

Each runs on the same ports because they're on **different machines**.

## Technology Stack
- **Backend**: FastAPI + Motor (async MongoDB) + WebSocket + scikit-learn (ML)
- **Frontend**: React + Vite + Leaflet (maps) + Canvas (ECG monitor)
- **Database**: MongoDB (shared, on simulation laptop or cloud)
- **Routing**: OSRM (real road routing) with straight-line fallback
