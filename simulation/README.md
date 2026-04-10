# ⚡ Simulation Engine

**Run this on the Simulation laptop (the PRIMARY machine).**

## ⚠️ This is the MASTER machine
The simulation backend drives ALL other dashboards.
It runs the ambulance movement tick every 2 seconds and
writes state to MongoDB, which all other apps read from.

## What it does
- Register patients → auto-dispatches nearest ambulance to nearest hospital
- Quick demo scenarios (Road Accident, Cardiac Event, etc.)
- Click on map to set accident location
- Control simulation speed and traffic light sensitivity
- Stop simulation at any time

## Setup

### 1. Start MongoDB here (or use cloud MongoDB)
If running MongoDB locally on this machine:
`ash
mongod --dbpath /data/db --bind_ip_all
`
Note your IP address (e.g. 192.168.1.x) — other laptops need this.

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

## Before running simulation
Use Control Centre to:
- Add at least 1 ambulance (click map → place ambulance)
- Add at least 1 hospital (click map → place hospital)
Then come back here and register a patient.
