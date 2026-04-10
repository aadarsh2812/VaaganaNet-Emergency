import { createContext, useContext, useEffect, useRef, useState } from 'react'

const WSContext = createContext(null)
// Connects to THIS laptop's local backend
const WS_URL = 'ws://localhost:8000/ws'

export function WSProvider({ children }) {
  const [data, setData] = useState({
    ambulances: [], hospitals: [], traffic: [],
    patients: [], simulation: {}, route: [],
    emergency_loc: null, timestamp: null,
  })
  const [connected, setConnected] = useState(false)
  const wsRef   = useRef(null)
  const retryRef = useRef(null)

  const connect = () => {
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen = () => {
        setConnected(true)
        const t = setInterval(() => ws.readyState === 1 && ws.send('ping'), 20000)
        ws._t = t
      }
      ws.onmessage = (e) => {
        try {
          const p = JSON.parse(e.data)
          setData(prev => ({
            ...prev, ...p,
            ambulances:    p.ambulances?.length    ? p.ambulances    : prev.ambulances,
            hospitals:     p.hospitals?.length     ? p.hospitals     : prev.hospitals,
            route:         p.route?.length         ? p.route         : prev.route,
            emergency_loc: p.emergency_loc         ? p.emergency_loc : prev.emergency_loc,
          }))
        } catch (_) {}
      }
      ws.onclose = () => {
        setConnected(false)
        clearInterval(ws._t)
        retryRef.current = setTimeout(connect, 3000)
      }
      ws.onerror = () => ws.close()
    } catch (_) {}
  }

  useEffect(() => {
    connect()
    return () => { clearTimeout(retryRef.current); wsRef.current?.close() }
  }, [])

  return <WSContext.Provider value={{ data, connected }}>{children}</WSContext.Provider>
}

export const useWS = () => useContext(WSContext)
