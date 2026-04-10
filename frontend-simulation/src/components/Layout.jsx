import { useWS } from '../context/WSContext'
import { useSidebar } from '../context/SidebarContext'
import { useEffect, useState } from 'react'

// Each app runs on its own port — navigation links open the correct app
const NAV = [
  { key: 'control',    href: 'http://localhost:5173', label: 'Control Centre', sub: 'Fleet & Dispatch',   icon: IconControl },
  { key: 'ambulance',  href: 'http://localhost:5175', label: 'Ambulance',      sub: 'Driver & Paramedic', icon: IconAmb },
  { key: 'hospital',   href: 'http://localhost:5176', label: 'Hospital',       sub: 'Receiving & Triage', icon: IconHosp },
  { key: 'simulation', href: 'http://localhost:5174', label: 'Simulation',     sub: 'Demo & Testing',     icon: IconSim },
]

function IconControl() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
}
function IconAmb() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-6"/><polyline points="8 21 12 17 16 21"/></svg>
}
function IconHosp() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function IconSim() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
}

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14, color: 'var(--text)', letterSpacing: 1 }}>
        {time.toLocaleTimeString()}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: '0.04em' }}>
        {time.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
      </div>
    </div>
  )
}

export default function Layout({ children, title, subtitle, actions, currentPage }) {
  const { data, connected } = useWS()
  const { open, toggle } = useSidebar()

  const busyAmbs  = (data.ambulances || []).filter(a => a.status === 'busy').length
  const totalAmbs = (data.ambulances || []).length
  const activeEmerg = (data.patients || []).length

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Sidebar */}
      <aside style={{
        width: open ? 250 : 0, minWidth: open ? 250 : 0,
        overflow: 'hidden', background: 'white', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s ease, min-width 0.25s ease',
        flexShrink: 0, zIndex: 10,
        boxShadow: open ? '1px 0 8px rgba(15,23,42,0.04)' : 'none',
      }}>
        <div style={{ width: 250, display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Logo */}
          <div style={{ padding: '20px 18px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(29,78,216,0.25)' }}>
                <span style={{ fontSize: 20 }}>🚑</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--blue)', lineHeight: 1.2, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.02em' }}>AmbulanceOS</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Emergency Response</div>
              </div>
            </div>
          </div>

          {/* WS status */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? 'var(--green2)' : 'var(--red2)', animation: connected ? 'pulse-dot 2s ease-in-out infinite' : 'none', boxShadow: connected ? '0 0 6px rgba(13,148,136,0.4)' : 'none' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: connected ? 'var(--green)' : 'var(--red)', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.03em' }}>
                {connected ? 'SYSTEM LIVE' : 'RECONNECTING'}
              </span>
            </div>
            {activeEmerg > 0 && (
              <span style={{ background: 'var(--red-lt2)', color: 'var(--red)', fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 20, fontFamily: "'Rajdhani', sans-serif" }}>
                {activeEmerg} active
              </span>
            )}
          </div>

          {/* Nav */}
          <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
            <div className="label" style={{ padding: '4px 6px 10px' }}>Navigation</div>
            {NAV.map(n => {
              const isActive = n.key === currentPage
              return (
                <a key={n.key} href={n.href} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                  <div className={`nav-item${isActive ? ' active' : ''}`}>
                    <span className="nav-icon" style={{ color: isActive ? 'var(--blue2)' : 'var(--text3)', flexShrink: 0 }}>
                      <n.icon />
                    </span>
                    <div>
                      <div style={{ fontWeight: isActive ? 600 : 500, fontSize: 13 }}>{n.label}</div>
                      <div style={{ fontSize: 11, color: isActive ? 'var(--blue2)' : 'var(--text3)', opacity: 0.8, fontFamily: "'Rajdhani', sans-serif", fontWeight: 600 }}>{n.sub}</div>
                    </div>
                  </div>
                </a>
              )
            })}
          </nav>

          {/* Stats */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <div className="label" style={{ marginBottom: 10 }}>Live Stats</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <StatRow icon="🚑" label="Units Active"   val={`${busyAmbs}/${totalAmbs}`} color={busyAmbs > 0 ? 'var(--orange2)' : 'var(--green2)'} />
              <StatRow icon="🏥" label="Hospitals"      val={data.hospitals?.length ?? 0} color="var(--blue2)" />
              <StatRow icon="🚦" label="Traffic Lights" val={data.traffic?.length ?? 0}   color="var(--text2)" />
              <StatRow icon="🟢" label="Green Lights"   val={(data.traffic||[]).filter(t=>t.state==='green').length} color="var(--green2)" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{ height: 60, background: 'white', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, flexShrink: 0, boxShadow: '0 1px 3px rgba(15,23,42,0.03)' }}>
          <button onClick={toggle} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{ display: 'block', width: 14, height: 1.5, background: 'var(--text3)', borderRadius: 1 }} />
            <span style={{ display: 'block', width: 14, height: 1.5, background: 'var(--text3)', borderRadius: 1 }} />
            <span style={{ display: 'block', width: 14, height: 1.5, background: 'var(--text3)', borderRadius: 1 }} />
          </button>
          <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)', lineHeight: 1.2, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.01em' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>{subtitle}</div>}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
            {actions}
            <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
            <Clock />
          </div>
        </header>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function StatRow({ icon, label, val, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{label}</span>
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: "'JetBrains Mono', monospace" }}>{val}</span>
    </div>
  )
}
