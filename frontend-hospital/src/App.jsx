import { WSProvider } from './context/WSContext'
import { SidebarProvider } from './context/SidebarContext'
import HospitalDash from './pages/HospitalDash'

export default function App() {
  return (
    <WSProvider>
      <SidebarProvider>
        <HospitalDash />
      </SidebarProvider>
    </WSProvider>
  )
}
