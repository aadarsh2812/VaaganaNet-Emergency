# 🎛️ Control Centre Dashboard

**Run this on the Control Centre laptop.**

## What it does
- Full fleet monitoring: all ambulances, hospitals, traffic lights
- Live map showing real-time ambulance movement
- Add ambulances, hospitals, traffic lights by clicking on map
- See active emergencies and completed call logs

## Setup

### 1. Set the shared MongoDB URL
Edit ackend/.env:
`
MONGO_URL=mongodb://<SIMULATION_LAPTOP_IP>:27017
DB_NAME=ambulance_db
`

### 2. Start the backend
`ash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
`

### 3. Start the frontend
`ash
cd frontend
npm install
npm run dev
`

Open: http://localhost:5173
