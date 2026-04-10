# 🏥 Hospital Dashboard

**Run this on the Hospital laptop.**

## What it does
- Shows all incoming patients assigned to this hospital
- Live ECG vitals and survival probability for each patient
- ETA countdown for ambulances en route
- Preparation checklist based on patient condition
- Full patient details overlay

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
