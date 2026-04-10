function polarToCartesian(cx, cy, r, angleDeg) {
  const angle = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
}

function gaugeArc(cx, cy, r, startAngle, endAngle) {
  const start    = polarToCartesian(cx, cy, r, endAngle)
  const end      = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

export default function TelemetryGauge({ label, value, min, max, unit, accentColor, alert }) {
  const pct       = Math.min(1, Math.max(0, (value - min) / (max - min)))
  const sweep     = 180 * pct
  const needleAng = -90 + sweep
  const needle    = polarToCartesian(100, 100, 56, needleAng)
  const valueArc  = gaugeArc(100, 100, 72, -90, -90 + sweep)
  const pctInt    = Math.round(pct * 100)

  return (
    <article style={{
      background: 'var(--surface2)',
      border: `1px solid ${alert ? accentColor + '55' : 'var(--border)'}`,
      borderRadius: 10,
      padding: '12px 14px',
      boxShadow: alert ? `0 0 0 2px ${accentColor}22` : 'var(--shadow-sm)',
      transition: 'border-color 0.3s, box-shadow 0.3s',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', fontFamily: "'Rajdhani', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {alert && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: accentColor,
              background: accentColor + '18',
              border: `1px solid ${accentColor}44`,
              borderRadius: 4,
              padding: '1px 6px',
              fontFamily: "'Rajdhani', sans-serif",
              letterSpacing: '0.04em',
              animation: 'pulse-dot 1.4s ease-in-out infinite',
            }}>
              {alert}
            </span>
          )}
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 16,
            fontWeight: 700,
            color: accentColor,
            lineHeight: 1,
          }}>
            {value}
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', marginLeft: 3 }}>{unit}</span>
          </span>
        </div>
      </div>

      {/* Gauge SVG */}
      <svg viewBox="0 0 200 112" style={{ width: '100%', display: 'block' }}>
        {/* Track */}
        <path d={gaugeArc(100, 100, 72, -90, 90)} stroke="#e2e8f0" strokeWidth="12" fill="none" strokeLinecap="round" />
        {/* Value arc */}
        {pct > 0.005 && (
          <path d={valueArc} stroke={accentColor} strokeWidth="12" fill="none" strokeLinecap="round" />
        )}
        {/* Needle */}
        <line x1="100" y1="100" x2={needle.x} y2={needle.y} stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="100" cy="100" r="5" fill="#1e293b" />
        <circle cx="100" cy="100" r="2.5" fill="white" />
        {/* Labels */}
        <text x="22" y="108" fill="#94a3b8" fontSize="10" fontFamily="monospace">{min}</text>
        <text x="168" y="108" fill="#94a3b8" fontSize="10" fontFamily="monospace">{max}</text>
        {/* Center % */}
        <text x="100" y="95" fill={accentColor} fontSize="13" fontFamily="monospace" fontWeight="700" textAnchor="middle">{pctInt}%</text>
      </svg>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginTop: 4 }}>
        <div style={{
          height: '100%',
          width: `${pctInt}%`,
          background: accentColor,
          borderRadius: 99,
          transition: 'width 0.15s ease',
        }} />
      </div>
    </article>
  )
}
