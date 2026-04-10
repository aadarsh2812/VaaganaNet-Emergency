import { useCallback, useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout'
import MapView from '../components/MapView'
import TelemetryGauge from '../components/TelemetryGauge'
import { ToastContainer, useToast } from '../components/Toast'
import { useWS } from '../context/WSContext'

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_RPM     = 3000
const MAX_SPEED   = 70
const MAX_O2      = 120
const IDLE_RPM    = 650
const LOOKAHEAD_M = 300
const TURN_RATE   = 15
const TICK_MS     = 160
const INITIAL_POS = { lat: 13.0827, lng: 80.2707 }   // Chennai Egmore

// ── Helpers ────────────────────────────────────────────────────────────────────
const mToLat = m => m / 111320
const mToLng = (m, lat) => m / (111320 * Math.cos((lat * Math.PI) / 180))
const clamp  = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

function distM(a, b) {
  const dLat = (b.lat - a.lat) * 111320
  const dLng = (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

function bearingDeg(a, b) {
  const dLng = (b.lng - a.lng) * Math.cos((a.lat * Math.PI) / 180)
  return (Math.atan2(dLng, b.lat - a.lat) * 180 / Math.PI + 360) % 360
}

function compassLabel(deg) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][
    Math.round(((deg % 360) + 360) % 360 / 45) % 8
  ]
}

// ── Tiny UI pieces ─────────────────────────────────────────────────────────────
const KBD = {
  display: 'inline-block', padding: '1px 5px', borderRadius: 4,
  border: '1px solid var(--border2)', background: 'white',
  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
  color: 'var(--text)', boxShadow: '0 1px 0 var(--border2)', margin: '0 1px',
}

function StatusChip({ icon, label, value, accent = 'var(--blue2)', wide }) {
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)', borderRadius: 8,
      padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 7,
      boxShadow: 'var(--shadow-sm)', flex: wide ? 2 : 1, minWidth: 0,
    }}>
      <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase',
          letterSpacing: '0.06em', fontFamily: "'Rajdhani', sans-serif", whiteSpace: 'nowrap',
        }}>{label}</div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: accent,
          fontFamily: "'JetBrains Mono', monospace",
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{value}</div>
      </div>
    </div>
  )
}

function DBtn({ id, glyph, row, col, active, dir, onPress, onRelease }) {
  return (
    <button
      id={`dpad-${id}`}
      onPointerDown={e => { e.preventDefault(); onPress(dir) }}
      onPointerUp={() => onRelease(dir)}
      onPointerLeave={() => onRelease(dir)}
      onContextMenu={e => e.preventDefault()}
      style={{
        gridRow: row, gridColumn: col, width: 54, height: 54, borderRadius: 10,
        border: `1.5px solid ${active ? '#2563eb' : 'var(--border2)'}`,
        background: active ? 'linear-gradient(145deg,#2563eb,#1e3a8a)' : 'white',
        color: active ? 'white' : 'var(--text2)',
        fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: active ? '0 4px 14px rgba(37,99,235,0.45)' : '0 1px 3px rgba(15,23,42,0.08)',
        transform: active ? 'scale(0.93)' : 'scale(1)',
        transition: 'all 0.1s ease',
        userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none',
      }}
    >{glyph}</button>
  )
}

function PanelHdr({ title, children }) {
  return (
    <div style={{
      padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0,
      fontWeight: 700, fontSize: 12, color: 'var(--text)', textTransform: 'uppercase',
      letterSpacing: '0.05em', fontFamily: "'Rajdhani', sans-serif",
      background: 'var(--surface2)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span>{title}</span>{children}
    </div>
  )
}

function Panel({ title, extra, children, style }) {
  return (
    <div style={{
      background: 'white', border: '1px solid var(--border)', borderRadius: 12,
      boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', flexShrink: 0, ...style,
    }}>
      {title && <PanelHdr title={title}>{extra}</PanelHdr>}
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function SimulationDash() {
  const { data } = useWS()
  const hospitals = data.hospitals || []

  // ── React state ───────────────────────────────────────────────────────────────
  const [rpm,        setRpm]        = useState(IDLE_RPM)
  const [speed,      setSpeed]      = useState(0)
  const [fuel,       setFuel]       = useState(100)
  const [oxygen,     setOxygen]     = useState(95)
  const [heading,    setHeading]    = useState(0)
  const [roadStatus, setRoadStatus] = useState('READY')
  const [markerPos,  setMarkerPos]  = useState({ ...INITIAL_POS })
  const [trail,      setTrail]      = useState([[INITIAL_POS.lat, INITIAL_POS.lng]])
  const [distance,   setDistance]   = useState(0)
  const [patientIn,  setPatientIn]  = useState(false)
  const [emergency,  setEmergency]  = useState(null)
  const [activeKeys, setActiveKeys] = useState({ up: false, down: false, left: false, right: false })

  // ── Mutable refs (tick loop) ──────────────────────────────────────────────────
  const keyRef      = useRef({ up: false, down: false, left: false, right: false })
  const rpmRef      = useRef(IDLE_RPM)
  const speedRef    = useRef(0)
  const fuelRef     = useRef(100)
  const oxyRef      = useRef(95)
  const posRef      = useRef({ ...INITIAL_POS })
  const distRef     = useRef(0)
  const hdgRef      = useRef(0)
  const wayptsRef   = useRef([])
  const fetchingRef = useRef(false)
  const moveDirRef  = useRef(0)
  const patientRef  = useRef(false)

  const { toasts, show } = useToast()

  useEffect(() => { patientRef.current = patientIn }, [patientIn])

  // ── Emergency detection ────────────────────────────────────────────────────────
  const triggerEmergency = useCallback((loc) => {
    const d = distM(posRef.current, loc)
    setEmergency({ loc, distKm: (d / 1000).toFixed(1) })
    show(`🚨 Emergency reported! ${(d / 1000).toFixed(1)} km away — this unit is nearest`, 'error', 9000)
  }, [show])

  const prevPatientsRef = useRef([])
  useEffect(() => {
    const patients = data.patients || []
    const fresh    = patients.filter(p => !prevPatientsRef.current.find(o => o.id === p.id))
    prevPatientsRef.current = patients

    if (data.emergency_loc) {
      const el = data.emergency_loc
      triggerEmergency({ lat: el.lat ?? el.location_lat, lng: el.lng ?? el.lon ?? el.location_lon })
    } else if (fresh.length > 0 && fresh[0].location_lat) {
      triggerEmergency({ lat: fresh[0].location_lat, lng: fresh[0].location_lon })
    }
  }, [data.emergency_loc, data.patients, triggerEmergency])

  const simulateEmergency = useCallback(() => {
    const base = posRef.current
    triggerEmergency({
      lat: base.lat + (Math.random() - 0.5) * 0.025,
      lng: base.lng + (Math.random() - 0.5) * 0.025,
    })
  }, [triggerEmergency])

  // ── Keyboard listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    const DIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
    const onDown = e => {
      const d = DIR[e.key]
      if (!d) return
      e.preventDefault()
      if (keyRef.current[d]) return
      keyRef.current[d] = true
      setActiveKeys(p => ({ ...p, [d]: true }))
    }
    const onUp = e => {
      const d = DIR[e.key]
      if (!d) return
      keyRef.current[d] = false
      setActiveKeys(p => ({ ...p, [d]: false }))
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup',   onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [])

  const handlePress   = useCallback(d => { keyRef.current[d] = true;  setActiveKeys(p => ({ ...p, [d]: true  })) }, [])
  const handleRelease = useCallback(d => { keyRef.current[d] = false; setActiveKeys(p => ({ ...p, [d]: false })) }, [])

  // ── OSRM forward route fetcher ─────────────────────────────────────────────────
  const fetchRoute = useCallback(async (from, hdgDeg) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setRoadStatus('ROUTING…')

    const rad   = hdgDeg * Math.PI / 180
    const toLat = from.lat + mToLat(LOOKAHEAD_M) * Math.cos(rad)
    const toLng = from.lng + mToLng(LOOKAHEAD_M, from.lat) * Math.sin(rad)

    try {
      const res    = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${from.lng},${from.lat};${toLng},${toLat}?overview=full&geometries=geojson`
      )
      const json   = await res.json()
      const coords = json?.routes?.[0]?.geometry?.coordinates
      if (Array.isArray(coords) && coords.length > 1) {
        wayptsRef.current = coords.slice(1).map(([lng, lat]) => ({ lat, lng }))
        setRoadStatus('LOCKED')
      } else {
        wayptsRef.current = []
        setRoadStatus('NO ROAD')
      }
    } catch {
      wayptsRef.current = []
      setRoadStatus('OFFLINE')
    } finally {
      fetchingRef.current = false
    }
  }, [])

  // ── Main simulation tick ──────────────────────────────────────────────────────
  useEffect(() => {
    const tick = setInterval(() => {
      const k   = keyRef.current
      const fwd = k.up
      const rev = k.down

      // Turning
      if (k.left)  hdgRef.current = (hdgRef.current - TURN_RATE + 360) % 360
      if (k.right) hdgRef.current = (hdgRef.current + TURN_RATE)       % 360
      if ((k.left || k.right) && !fwd && !rev) wayptsRef.current = []

      // Direction change
      const newDir = fwd ? 1 : rev ? -1 : 0
      if (newDir !== 0 && newDir !== moveDirRef.current) {
        moveDirRef.current = newDir
        wayptsRef.current  = []
      }
      if (!fwd && !rev) moveDirRef.current = 0

      // RPM & Speed
      if (fwd) {
        rpmRef.current   = clamp(rpmRef.current + 28,  IDLE_RPM, MAX_RPM)
        speedRef.current = clamp(speedRef.current + 0.8, 0, MAX_SPEED)
      } else if (rev) {
        rpmRef.current   = clamp(rpmRef.current + 14,  IDLE_RPM, MAX_RPM)
        speedRef.current = clamp(speedRef.current + 0.5, 0, MAX_SPEED * 0.5)
      } else {
        rpmRef.current   = clamp(rpmRef.current - 120, IDLE_RPM, MAX_RPM)
        speedRef.current = clamp(speedRef.current - 0.8, 0, MAX_SPEED)
      }

      const mps = speedRef.current / 3.6

      // FORWARD — road-locked via OSRM waypoints
      if (moveDirRef.current === 1 && speedRef.current > 0.5) {
        if (wayptsRef.current.length === 0 && !fetchingRef.current) fetchRoute(posRef.current, hdgRef.current)
        if (wayptsRef.current.length < 4  && !fetchingRef.current) fetchRoute(posRef.current, hdgRef.current)

        if (wayptsRef.current.length > 0) {
          let rem = mps * (TICK_MS / 1000)
          while (rem > 0.05 && wayptsRef.current.length > 0) {
            const wp = wayptsRef.current[0]
            const d  = distM(posRef.current, wp)
            if (d <= rem) {
              hdgRef.current   = bearingDeg(posRef.current, wp)
              posRef.current   = wp
              distRef.current += d
              rem             -= d
              wayptsRef.current.shift()
            } else {
              const r        = rem / d
              hdgRef.current = bearingDeg(posRef.current, wp)
              posRef.current = {
                lat: posRef.current.lat + (wp.lat - posRef.current.lat) * r,
                lng: posRef.current.lng + (wp.lng - posRef.current.lng) * r,
              }
              distRef.current += rem
              rem = 0
            }
          }
          const snap = { ...posRef.current }
          setMarkerPos(snap)
          setTrail(prev => {
            const nx = [...prev, [snap.lat, snap.lng]]
            return nx.length > 600 ? nx.slice(-600) : nx
          })
          setDistance(Math.round(distRef.current))
        }
      }

      // REVERSE — raw arithmetic
      if (moveDirRef.current === -1 && speedRef.current > 0.1) {
        const step = mps * (TICK_MS / 1000)
        const rad  = ((hdgRef.current + 180) % 360) * Math.PI / 180
        posRef.current = {
          lat: clamp(posRef.current.lat + mToLat(step) * Math.cos(rad), -85, 85),
          lng: posRef.current.lng + mToLng(step, posRef.current.lat) * Math.sin(rad),
        }
        distRef.current += step
        setMarkerPos({ ...posRef.current })
        setTrail(prev => {
          const nx = [...prev, [posRef.current.lat, posRef.current.lng]]
          return nx.length > 600 ? nx.slice(-600) : nx
        })
        setDistance(Math.round(distRef.current))
        setRoadStatus('REVERSING')
      }

      // Fuel
      fuelRef.current = clamp(fuelRef.current - (0.01 + (rpmRef.current / MAX_RPM) * 0.055), 0, 100)

      // Oxygen — only drains when patient is onboard
      if (patientRef.current) oxyRef.current = clamp(oxyRef.current - 0.10, 0, MAX_O2)

      // Push to React
      setRpm(Math.round(rpmRef.current))
      setSpeed(+(speedRef.current.toFixed(1)))
      setFuel(+(fuelRef.current.toFixed(1)))
      setOxygen(+(oxyRef.current.toFixed(1)))
      setHeading(hdgRef.current)
    }, TICK_MS)

    return () => clearInterval(tick)
  }, [fetchRoute])

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    posRef.current     = { ...INITIAL_POS }
    hdgRef.current     = 0
    fuelRef.current    = 100
    oxyRef.current     = 95
    rpmRef.current     = IDLE_RPM
    speedRef.current   = 0
    distRef.current    = 0
    moveDirRef.current = 0
    wayptsRef.current  = []
    setMarkerPos({ ...INITIAL_POS })
    setTrail([[INITIAL_POS.lat, INITIAL_POS.lng]])
    setFuel(100); setOxygen(95); setRpm(IDLE_RPM)
    setSpeed(0); setDistance(0); setHeading(0)
    setRoadStatus('READY'); setEmergency(null)
    show('Simulation reset to origin.', 'info')
  }, [show])

  // ── Derived ───────────────────────────────────────────────────────────────────
  const cLabel    = compassLabel(heading)
  const fuelCrit  = fuel < 20
  const o2Crit    = oxygen < 20
  const lockColor = roadStatus === 'LOCKED'    ? 'var(--green2)'
                  : roadStatus === 'NO ROAD'   ? 'var(--red2)'
                  : roadStatus === 'REVERSING' ? 'var(--blue2)'
                  : 'var(--orange2)'

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <Layout
      title="Simulation"
      subtitle="Ambulance Drive Simulator · Road-locked OSRM routing"
      currentPage="simulation"
      hideSidebar
    >
      {/* ── Emergency Overlay ──────────────────────────────────────────────────── */}
      {emergency && (
        <div style={{
          position: 'absolute', top: 68, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: 'white', borderRadius: 14,
          border: '2.5px solid #dc2626', padding: '16px 20px',
          boxShadow: '0 10px 40px rgba(220,38,38,0.28)', minWidth: 320, maxWidth: 420,
        }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 30, lineHeight: 1 }}>🚨</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#dc2626' }}>Emergency Reported!</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                This ambulance is the nearest unit
              </div>
            </div>
          </div>
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 9, padding: '10px 14px', marginBottom: 12,
          }}>
            {[
              ['Distance',  `${emergency.distKm} km`,                              'var(--text)'],
              ['Location',  `${emergency.loc.lat.toFixed(4)}, ${emergency.loc.lng.toFixed(4)}`, 'var(--text2)'],
              ['Your unit', 'AMB-01 · Egmore',                                    '#16a34a'],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: c, fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              id="btn-dispatch"
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              onClick={() => {
                setEmergency(null)
                show('🚑 Responding to emergency — navigate to location!', 'success')
              }}
            >
              🚑 Respond Now
            </button>
            <button id="btn-dismiss" className="btn btn-ghost btn-sm" onClick={() => setEmergency(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Main Grid ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14,
        height: '100%', padding: 14,
        background: 'var(--bg)', overflow: 'hidden', boxSizing: 'border-box',
      }}>

        {/* LEFT — status chips + map */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>

          {/* Status strip */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <StatusChip icon="🔒" label="Road"     value={roadStatus} accent={lockColor} />
            <StatusChip icon="🧭" label="Heading"  value={`${cLabel} · ${Math.round(heading)}°`} accent="var(--blue2)" />
            <StatusChip icon="🚀" label="Speed"    value={`${speed.toFixed(1)} km/h`} accent="var(--blue2)" />
            <StatusChip icon="📏" label="Distance" value={`${(distance / 1000).toFixed(2)} km`} accent="var(--text2)" wide />
          </div>

          {/* Map card */}
          <div style={{
            flex: 1, minHeight: 0, background: 'white',
            border: '1px solid var(--border)', borderRadius: 12,
            overflow: 'hidden', boxShadow: 'var(--shadow)',
            display: 'flex', flexDirection: 'column',
          }}>
            <PanelHdr title="🗺  Live Road Navigation">
              <span style={{
                fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                color: 'var(--text3)', background: 'var(--surface3)',
                padding: '2px 8px', borderRadius: 5, border: '1px solid var(--border)',
              }}>
                {markerPos.lat.toFixed(5)}, {markerPos.lng.toFixed(5)}
              </span>
            </PanelHdr>
            <div style={{ flex: 1, minHeight: 0 }}>
              <MapView
                markerPosition={markerPos}
                headingDeg={heading}
                trail={trail}
                hospitals={hospitals}
                emergencyLoc={emergency?.loc ?? null}
              />
            </div>
          </div>
        </div>

        {/* RIGHT — telemetry + patient + controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', minHeight: 0 }}>

          {/* Unit ID card */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 32 }}>🚑</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'white', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.04em' }}>
                AMB-01
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
                Egmore Station · Chennai
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Status</div>
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#4ade80',
                fontFamily: "'Rajdhani', sans-serif",
              }}>
                {speed > 0 ? '● IN SERVICE' : '● STANDBY'}
              </div>
            </div>
          </div>

          {/* Telemetry */}
          <Panel title="📊  Telemetry">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <TelemetryGauge
                label="Engine RPM" value={rpm} min={0} max={MAX_RPM} unit="RPM" accentColor="#ef4444"
              />
              <TelemetryGauge
                label="Fuel Level" value={fuel} min={0} max={100} unit="%"
                accentColor={fuelCrit ? '#ef4444' : '#f59e0b'}
                alert={fuelCrit ? '⚠ Low Fuel' : null}
              />
              <div style={{ position: 'relative' }}>
                <TelemetryGauge
                  label="Patient O₂ Supply" value={oxygen} min={0} max={MAX_O2} unit="PSI"
                  accentColor={o2Crit ? '#ef4444' : '#0ea5e9'}
                  alert={patientIn && o2Crit ? '⚠ Critical O₂' : null}
                />
                {!patientIn && (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 10,
                    background: 'rgba(248,250,252,0.82)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(1px)',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>
                      No patient onboard
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {/* Patient onboard toggle */}
          <div style={{
            background: 'white', border: '1px solid var(--border)', borderRadius: 12,
            boxShadow: 'var(--shadow)', padding: '12px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 22 }}>🧑‍⚕️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Patient Onboard</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {patientIn ? 'O₂ supply active — draining' : 'Cylinder sealed — stable'}
                </div>
              </div>
            </div>
            <button
              id="btn-patient"
              onClick={() => {
                const next = !patientIn
                setPatientIn(next)
                show(next ? '🧑‍⚕️ Patient loaded — O₂ now draining' : '✅ Patient offloaded', next ? 'warning' : 'success')
              }}
              style={{
                padding: '6px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer',
                border: `1.5px solid ${patientIn ? 'var(--green2)' : 'var(--border2)'}`,
                background: patientIn ? 'var(--green-lt)' : 'var(--surface2)',
                color: patientIn ? 'var(--green)' : 'var(--text3)',
                transition: 'all 0.2s',
              }}
            >
              {patientIn ? 'LOADED' : 'EMPTY'}
            </button>
          </div>

          {/* Drive controls */}
          <Panel title="🎮  Drive Controls">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{
                display: 'grid', gap: 6,
                gridTemplateColumns: '54px 54px 54px',
                gridTemplateRows: '54px 54px 54px',
              }}>
                <DBtn id="up"    glyph="↑" row={1} col={2} dir="up"    active={activeKeys.up}    onPress={handlePress} onRelease={handleRelease} />
                <DBtn id="left"  glyph="←" row={2} col={1} dir="left"  active={activeKeys.left}  onPress={handlePress} onRelease={handleRelease} />
                <DBtn id="right" glyph="→" row={2} col={3} dir="right" active={activeKeys.right} onPress={handlePress} onRelease={handleRelease} />
                <DBtn id="down"  glyph="↓" row={3} col={2} dir="down"  active={activeKeys.down}  onPress={handlePress} onRelease={handleRelease} />
              </div>

              <div style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                fontSize: 11, color: 'var(--text3)', textAlign: 'center', lineHeight: 2,
              }}>
                <span style={{ fontWeight: 700, color: 'var(--text2)' }}>Keyboard shortcuts</span><br />
                <kbd style={KBD}>↑</kbd> Fwd &nbsp;·&nbsp;
                <kbd style={KBD}>↓</kbd> Rev &nbsp;·&nbsp;
                <kbd style={KBD}>←</kbd><kbd style={KBD}>→</kbd> Steer
              </div>

              <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                <button
                  id="btn-emergency"
                  onClick={simulateEmergency}
                  className="btn btn-danger btn-sm"
                  style={{ flex: 1 }}
                >
                  🚨 Simulate Emergency
                </button>
                <button id="btn-reset" onClick={resetAll} className="btn btn-ghost btn-sm">
                  🔄 Reset
                </button>
              </div>
            </div>
          </Panel>

        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </Layout>
  )
}
