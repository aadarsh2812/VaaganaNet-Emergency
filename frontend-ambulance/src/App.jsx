import { WSProvider } from './context/WSContext'
import { SidebarProvider } from './context/SidebarContext'
import AmbulanceDash from './pages/AmbulanceDash'

export default function App() {
  return (
    <WSProvider>
      <SidebarProvider>
        <AmbulanceDash />
      </SidebarProvider>
    </WSProvider>
  )
}
