import axios from 'axios'
const api = axios.create({ baseURL: 'http://localhost:8000' })

export const createPatient = (name, age, lat, lon) =>
  api.post('/patient/create', { name, age, location_lat: lat, location_lon: lon }).then(r => r.data)
export const listPatients = () => api.get('/patient/list').then(r => r.data)
export const sendVitals = (patient_id, heart_rate, spo2, temperature, device_id) =>
  api.post('/patient/vitals', { patient_id, heart_rate, spo2, temperature, device_id }).then(r => r.data)
export const getVitalsHistory = (pid) =>
  api.get(`/patient/${pid}/vitals/history`).then(r => r.data)

export const addAmbulance = (lat, lon, label) =>
  api.post('/ambulance/add', { lat, lon, label }).then(r => r.data)
export const listAmbulances = () => api.get('/ambulance/list').then(r => r.data)

export const addHospital = (name, lat, lon) =>
  api.post('/hospital/add', { name, lat, lon }).then(r => r.data)
export const listHospitals = () => api.get('/hospital/list').then(r => r.data)
export const getHospitalPatients = (id) =>
  api.get(`/hospital/${id}/patients`).then(r => r.data)

export const addTrafficLight = (lat, lon, intersection_name) =>
  api.post('/traffic/add', { lat, lon, intersection_name }).then(r => r.data)

export const listEmergencies = () => api.get('/emergency/list').then(r => r.data)

export const updateSimulation = (speed, traffic_sensitivity) =>
  api.post('/simulate/update', { speed, traffic_sensitivity }).then(r => r.data)
export const getSimStatus = () => api.get('/simulate/status').then(r => r.data)
export const stopSimulation = () => api.post('/simulate/stop').then(r => r.data)
