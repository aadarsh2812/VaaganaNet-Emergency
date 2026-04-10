import { WSProvider } from './context/WSContext'
import { SidebarProvider } from './context/SidebarContext'
import SimulationDash from './pages/SimulationDash'

export default function App() {
  return (
    <WSProvider>
      <SidebarProvider>
        <SimulationDash />
      </SidebarProvider>
    </WSProvider>
  )
}
