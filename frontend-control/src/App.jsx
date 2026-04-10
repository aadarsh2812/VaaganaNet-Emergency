import { WSProvider } from './context/WSContext'
import { SidebarProvider } from './context/SidebarContext'
import ControlCentre from './pages/ControlCentre'

export default function App() {
  return (
    <WSProvider>
      <SidebarProvider>
        <ControlCentre />
      </SidebarProvider>
    </WSProvider>
  )
}
