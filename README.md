# Ambulance Emergency Response System

## Quick Start (3 terminals)

### Terminal 1 — MongoDB
```bash
docker-compose up -d mongodb
```

### Terminal 2 — Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Check: http://localhost:8000/health

### Terminal 3 — Frontend
```bash
cd frontend
npm install
npm run dev
```
Open: http://localhost:5173

---

## Dashboard Logic

| Dashboard | Who uses it | Why |
|---|---|---|
| `/control` | Dispatcher / Admin | Monitor fleet, add infrastructure |
| `/ambulance` | Driver + Paramedic | Patient vitals + AI + navigation |
| `/hospital` | Doctors + Nurses | Incoming ambulances map + patient prep |
| `/simulation` | Demo / Training | Register patients → auto-dispatch |

---

## ESP32 Sensor Integration

Send real vitals to:
```
POST http://<server>:8000/patient/vitals
Content-Type: application/json

{
  "patient_id": "<uuid>",
  "heart_rate": 88.5,
  "spo2": 96.2,
  "temperature": 37.1,
  "device_id": "ESP32-001"
}
```

---

## Demo Flow

1. Go to `/simulation`
2. Add ambulances/hospitals via Control Centre `/control` → Add Infrastructure tab
3. Back in Simulation → Register a patient or click a Quick Scenario
4. System auto-dispatches nearest ambulance
5. Watch ambulance move on map in ALL three dashboards
6. Go to `/ambulance` → see vitals + AI prediction + navigation
7. Go to `/hospital` → see incoming ambulance on map + prep checklist
8. Adjust speed/sensitivity in Simulation → changes reflect immediately

---

## Project Structure

```
backend/
  main.py              FastAPI + WebSocket broadcaster
  database.py          MongoDB connection
  models.py            Pydantic schemas
  ml_model.py          LogisticRegression survival prediction
  routing.py           OSRM + fallback routing
  simulation.py        Ambulance movement engine
  routers/
    patient.py         Patient CRUD + ESP32 /vitals endpoint
    ambulance.py       Ambulance management
    hospital.py        Hospital + incoming patients
    traffic.py         Traffic light management
    emergency.py       Auto-dispatch logic
    simulation_router.py  Speed/sensitivity controls

frontend/src/
  pages/
    ControlCentre.jsx  Fleet monitoring + add infrastructure
    AmbulanceDash.jsx  Driver/paramedic view
    HospitalDash.jsx   Doctor/nurse view
    SimulationDash.jsx Demo tool
  components/
    MapView.jsx        Leaflet map with SVG icons
    ECGMonitor.jsx     Canvas ECG waveform
    Layout.jsx         Shared sidebar + nav
    SurvivalMeter.jsx  Circular ML prediction
```
