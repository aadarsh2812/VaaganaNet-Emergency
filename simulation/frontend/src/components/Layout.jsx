import { useWS } from '../context/WSContext'
import { useSidebar } from '../context/SidebarContext'
import { useEffect, useState } from 'react'

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

export default function Layout({ children, title, subtitle, actions }) {
  const { data, connected } = useWS()

  const busyAmbs  = (data.ambulances || []).filter(a => a.status === 'busy').length
  const totalAmbs = (data.ambulances || []).length
  const activeEmerg = (data.patients || []).length

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)', flexDirection: 'column' }}>
      {/* ── Topbar ── */}
      <header style={{
        height: 60, background: 'white', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14,
        flexShrink: 0, boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: 'linear-gradient(135deg, #1e3a5f, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, boxShadow: '0 2px 8px rgba(29,78,216,0.25)',
          }}>
            <span style={{ fontSize: 18 }}>🚑</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--blue)', lineHeight: 1.2, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.02em' }}>AmbulanceOS</div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Emergency Response</div>
          </div>
        </div>

        <div style={{ width: 1, height: 28, background: 'var(--border)' }} />

        <div>
          <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)', lineHeight: 1.2, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.01em' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500 }}>{subtitle}</div>}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Live stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <StatPill icon="🚑" label="Units" val={`${busyAmbs}/${totalAmbs}`} color={busyAmbs > 0 ? 'var(--orange2)' : 'var(--green2)'} />
            <StatPill icon="🏥" label="Hospitals" val={data.hospitals?.length ?? 0} color="var(--blue2)" />
            <StatPill icon="🚦" label="Green" val={(data.traffic||[]).filter(t=>t.state==='green').length} color="var(--green2)" />
            {activeEmerg > 0 && (
              <span style={{ background: 'var(--red-lt2)', color: 'var(--red)', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, fontFamily: "'Rajdhani', sans-serif" }}>
                {activeEmerg} ACTIVE
              </span>
            )}
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
          {/* Connection status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: connected ? 'var(--green2)' : 'var(--red2)',
              animation: connected ? 'pulse-dot 2s ease-in-out infinite' : 'none',
              boxShadow: connected ? '0 0 6px rgba(13,148,136,0.4)' : 'none',
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: connected ? 'var(--green)' : 'var(--red)', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.03em' }}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
          {actions}
          <Clock />
        </div>
      </header>

      {/* Page content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function StatPill({ icon, label, val, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{val}</span>
    </div>
  )
}
