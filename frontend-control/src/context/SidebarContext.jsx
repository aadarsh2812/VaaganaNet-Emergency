import { createContext, useContext, useState } from 'react'

const SidebarCtx = createContext(null)

export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(true)
  return (
    <SidebarCtx.Provider value={{ open, toggle: () => setOpen(o => !o), close: () => setOpen(false), show: () => setOpen(true) }}>
      {children}
    </SidebarCtx.Provider>
  )
}

export const useSidebar = () => useContext(SidebarCtx)
