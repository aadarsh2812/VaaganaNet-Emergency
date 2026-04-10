export default function SurvivalMeter({ pct=0, size=100 }) {
  const r    = size * 0.38
  const circ = 2 * Math.PI * r
  const off  = circ - (Math.min(100,Math.max(0,pct)) / 100) * circ
  const color = pct>=70?'#0d9488':pct>=45?'#d97706':'#dc2626'
  const bg    = pct>=70?'#f0fdfa':pct>=45?'#fefce8':'#fef2f2'
  const label = pct>=70?'Stable':pct>=45?'Moderate':pct>=30?'Critical':'Severe'

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill={bg} stroke="#e2e8f0" strokeWidth={size*0.07}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={size*0.07}
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
            style={{ transition:'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}/>
        </svg>
        <div style={{
          position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center',
        }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:size*0.18, color, lineHeight:1 }}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      <span style={{ fontSize:12, fontWeight:700, color, fontFamily:"'Rajdhani',sans-serif", letterSpacing:'0.04em' }}>{label}</span>
    </div>
  )
}
