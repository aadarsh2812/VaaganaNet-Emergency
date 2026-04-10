# VaaganaNet Emergency — Ambulance Response System

A full-stack real-time emergency ambulance dispatch system with live patient vitals, ML survival prediction, and multi-dashboard coordination.

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│              Shared Backend                 │
│   FastAPI + MongoDB + WebSocket (port 8000) │
└────────────────────┬────────────────────────┘
                     │  ws://localhost:8000/ws (2s tick)
         ┌───────────┼───────────────┐───────────────┐
         ▼           ▼               ▼               ▼
  frontend-control  frontend-simulation  frontend-ambulance  frontend-hospital
   (port 5173)       (port 5174)          (port 5175)         (port 5176)
   Control Centre    Simulation Dash      Ambulance Dash      Hospital Dash
   Dispatcher/Admin  Demo/Training        Driver+Paramedic    Doctors+Nurses
```

All 4 frontends connect to the **same** WebSocket — when simulation runs in one tab, all others update simultaneously.

---

## Project Structure

```
ambulance-system/
├── backend/
│   ├── main.py                  FastAPI app + WebSocket broadcaster
│   ├── database.py              Async MongoDB (Motor) connection
│   ├── models.py                Pydantic schemas
│   ├── ml_model.py              Survival prediction (scikit-learn LogisticRegression)
│   ├── routing.py               OSRM routing + haversine fallback
│   ├── simulation.py            Ambulance movement engine (2s ticks)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── routers/
│       ├── patient.py           Patient CRUD + ESP32 /vitals endpoint
│       ├── ambulance.py         Ambulance fleet management
│       ├── hospital.py          Hospital + incoming patient list
│       ├── traffic.py           Traffic light management
│       ├── emergency.py         Auto-dispatch (nearest ambulance)
│       └── simulation_router.py Speed/sensitivity controls
│
├── frontend-control/            Port 5173 — Control Centre
├── frontend-simulation/         Port 5174 — Simulation Dashboard
├── frontend-ambulance/          Port 5175 — Ambulance Dashboard
├── frontend-hospital/           Port 5176 — Hospital Dashboard
│
│   Each frontend has identical structure:
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js           (port set per app)
│   └── src/
│       ├── App.jsx
│       ├── api.js               Axios calls → backend REST
│       ├── index.css            Design tokens + global styles
│       ├── main.jsx
│       ├── context/
│       │   ├── WSContext.jsx    WebSocket state (shared fleet data)
│       │   └── SidebarContext.jsx
│       ├── components/
│       │   ├── MapView.jsx      Leaflet map, SVG icons, CartoDB tiles
│       │   ├── Layout.jsx       Sidebar nav (links to all 4 apps)
│       │   ├── Toast.jsx
│       │   ├── ECGMonitor.jsx   Canvas ECG waveform (ambulance + hospital only)
│       │   └── SurvivalMeter.jsx  Circular ML prediction (ambulance + hospital only)
│       └── pages/
│           └── [Dashboard].jsx  Single page per app
│
├── frontend/                    Original single-app (reference only, not used)
├── docker-compose.yml
└── .gitignore
```

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+** and npm
- **MongoDB** — either via Docker (recommended) or a local install
- **Git**

---

## Setup & Running (5 Terminals)

### Terminal 1 — MongoDB

```bash
docker-compose up -d mongodb
```

Or if MongoDB is already installed locally, just make sure it's running on port 27017.

---

### Terminal 2 — Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check: http://localhost:8000/health  
API docs: http://localhost:8000/docs

---

### Terminal 3 — Control Centre (Dispatcher)

```bash
cd frontend-control
npm install
npm run dev
```

Opens at: http://localhost:5173

---

### Terminal 4 — Simulation Dashboard

```bash
cd frontend-simulation
npm install
npm run dev
```

Opens at: http://localhost:5174

---

### Terminal 5 — Ambulance Dashboard

```bash
cd frontend-ambulance
npm install
npm run dev
```

Opens at: http://localhost:5175

---

### Terminal 6 — Hospital Dashboard

```bash
cd frontend-hospital
npm install
npm run dev
```

Opens at: http://localhost:5176

---

## Dashboard Guide

### Control Centre — `localhost:5173`
**Who:** Dispatcher / Admin  
**What:**
- Live map of all ambulances, hospitals, traffic lights
- Add ambulances, hospitals, traffic lights via "Add Infrastructure" tab
- Monitor all active emergencies and fleet status
- View patient vitals history

### Simulation Dashboard — `localhost:5174`
**Who:** Demo / Training  
**What:**
- Register a patient (name, age, location on map)
- System auto-dispatches the nearest available ambulance
- Watch ambulance move on the map in real time
- Adjust simulation speed and traffic sensitivity
- Quick-scenario buttons for instant demos

### Ambulance Dashboard — `localhost:5175`
**Who:** Paramedic + Driver  
**What:**
- Select active ambulance unit
- Live patient vitals — heart rate, SpO₂, temperature (1s feed)
- AI condition assessment (ML survival probability)
- Live ECG waveform monitors
- Navigation map — shows route to hospital
- OBD vehicle telemetry (fuel, battery, engine temp)
- ETA progress bar at bottom

### Hospital Dashboard — `localhost:5176`
**Who:** Doctors + Nurses  
**What:**
- Select hospital
- List of incoming (en-route) and arrived patients
- Live ETA countdown for each ambulance
- Patient vitals + ECG on selection
- AI condition assessment
- Auto-generated preparation checklist based on severity

---

## Demo Flow (Quick Start)

1. Start backend + MongoDB (Terminals 1–2)
2. Open **Control Centre** → `Add Infrastructure` tab → add at least 1 ambulance and 1 hospital (click map to place)
3. Open **Simulation** → Register a patient → click on map to set their location
4. System auto-dispatches — ambulance appears moving on the map in **all** open dashboards
5. Open **Ambulance** → select the dispatched unit → see live vitals and route
6. Open **Hospital** → see the incoming ambulance ETA and prep checklist
7. Adjust speed in Simulation slider → all dashboards reflect immediately

---

## API Reference

Base URL: `http://localhost:8000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Backend health check |
| POST | `/patient/create` | Register a new patient |
| GET | `/patient/list` | List all patients |
| POST | `/patient/vitals` | Submit vitals (ESP32 or simulation) |
| GET | `/patient/{id}/vitals/history` | Vitals history for a patient |
| POST | `/ambulance/add` | Add ambulance to fleet |
| GET | `/ambulance/list` | List all ambulances |
| POST | `/hospital/add` | Add a hospital |
| GET | `/hospital/list` | List all hospitals |
| GET | `/hospital/{id}/patients` | Patients assigned to a hospital |
| POST | `/traffic/add` | Add a traffic light |
| GET | `/emergency/list` | List all emergencies |
| POST | `/simulate/update` | Update simulation speed/sensitivity |
| GET | `/simulate/status` | Current simulation state |
| POST | `/simulate/stop` | Stop simulation |
| WS | `/ws` | WebSocket — 2s broadcast of full system state |

Full interactive docs: http://localhost:8000/docs

---

## ESP32 / IoT Sensor Integration

To stream real patient vitals from hardware, POST to:

```
POST http://<server-ip>:8000/patient/vitals
Content-Type: application/json

{
  "patient_id": "<patient _id from /patient/list>",
  "heart_rate": 88.5,
  "spo2": 96.2,
  "temperature": 37.1,
  "device_id": "ESP32-001"
}
```

The Ambulance and Hospital dashboards update within 2 seconds via WebSocket.

---

## WebSocket Payload Structure

Every 2 seconds all connected clients receive:

```json
{
  "ambulances": [
    {
      "_id": "...",
      "label": "AMB-01",
      "lat": 12.9716,
      "lon": 77.5946,
      "status": "busy",
      "assigned_patient": "...",
      "fuel": 78.4,
      "battery": 91.2,
      "engine_temp": 88.0
    }
  ],
  "hospitals": [{ "_id": "...", "name": "City Hospital", "lat": 12.98, "lon": 77.60 }],
  "traffic": [{ "_id": "...", "lat": 12.97, "lon": 77.59, "state": "red" }],
  "patients": [
    {
      "patient_id": "...",
      "survival_pct": 74.3,
      "severity": "Moderate",
      "vitals": { "heart_rate": 88, "spo2": 96, "temperature": 37.1 }
    }
  ],
  "route": [[12.97, 77.59], [12.975, 77.595], ...],
  "emergency_loc": [12.965, 77.581],
  "simulation": {
    "ambulance_id": "...",
    "progress_pct": 42,
    "remaining_min": 3.2
  },
  "timestamp": 1712345678.0
}
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python 3.10+ |
| Database | MongoDB (Motor async driver) |
| ML Model | scikit-learn LogisticRegression |
| Routing | OSRM API + haversine fallback |
| Real-time | WebSocket (native FastAPI) |
| Frontend | React 18 + Vite |
| Maps | Leaflet.js (CartoDB Positron tiles) |
| Styling | Tailwind CSS + CSS custom properties |
| Charts | HTML5 Canvas (custom ECG renderer) |

---

## Environment Variables (Optional)

Create `backend/.env` to override defaults:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=ambulance_db
OSRM_URL=http://router.project-osrm.org
```

---

## Common Issues

**Map shows no icons during simulation**
- Leaflet CSS is imported directly from npm in `MapView.jsx` — do not add a CDN link in `index.html`
- Make sure `npm install` completed successfully in the frontend directory

**WebSocket not connecting**
- Ensure backend is running on port 8000
- Check `src/context/WSContext.jsx` — URL must be `ws://localhost:8000/ws`

**MongoDB connection failed**
- Run `docker-compose up -d mongodb` or check local MongoDB is on port 27017
- Backend logs show connection status on startup

**Port already in use**
- Each frontend is fixed to its port in `vite.config.js`
- Kill the process using the port: `npx kill-port 5173`

---

## Team Workflow

```bash
# Clone
git clone https://github.com/aadarsh2812/VaaganaNet-Emergency.git
cd VaaganaNet-Emergency

# Backend setup (once)
cd backend && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt

# Frontend setup (once per app)
cd ../frontend-control && npm install
cd ../frontend-simulation && npm install
cd ../frontend-ambulance && npm install
cd ../frontend-hospital && npm install

# Pull latest changes
git pull origin main
```

To contribute, create a feature branch:

```bash
git checkout -b feature/your-feature-name
# make changes
git add .
git commit -m "describe your change"
git push origin feature/your-feature-name
# open a Pull Request on GitHub
```
