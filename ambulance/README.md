# 🚑 Ambulance Dashboard

**Run this on the Ambulance laptop.**

## What it does
- Shows the assigned patient's live vitals (ECG, SpO2, Temp)
- Shows the ambulance route on a real-time map
- Shows ETA to hospital and survival probability
- Patient monitor activates automatically after dispatch

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
