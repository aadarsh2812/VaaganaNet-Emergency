import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WSProvider } from './context/WSContext'
import { SidebarProvider } from './context/SidebarContext'
import ControlCentre  from './pages/ControlCentre'
import AmbulanceDash  from './pages/AmbulanceDash'
import HospitalDash   from './pages/HospitalDash'
import SimulationDash from './pages/SimulationDash'

export default function App() {
  return (
    <WSProvider>
      <SidebarProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"           element={<Navigate to="/control" replace />} />
            <Route path="/control"    element={<ControlCentre />} />
            <Route path="/ambulance"  element={<AmbulanceDash />} />
            <Route path="/hospital"   element={<HospitalDash />} />
            <Route path="/simulation" element={<SimulationDash />} />
          </Routes>
        </BrowserRouter>
      </SidebarProvider>
    </WSProvider>
  )
}
