import { useEffect, useRef } from 'react'

export default function ECGMonitor({ data=[], color='#0d9488', min=0, max=200, height=80, label='', value=null }) {
  const canvasRef = useRef(null)
  const bufRef    = useRef([])
  const frameRef  = useRef(null)
  const posRef    = useRef(0)

  useEffect(() => {
    if (!data.length) return
    const v = data[data.length-1]
    if (v != null) { bufRef.current.push(v); if (bufRef.current.length > 200) bufRef.current.shift() }
  }, [data])

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      const W = canvas.width, H = canvas.height
      if (!W || !H) { frameRef.current = requestAnimationFrame(draw); return }
      const buf = bufRef.current

      ctx.fillStyle = '#fafbfc'; ctx.fillRect(0, 0, W, H)

      ctx.strokeStyle = '#eef1f6'; ctx.lineWidth = 0.5
      const cols = 8, rows = 4
      for (let i=0; i<=cols; i++) { const x=(i/cols)*W; ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      for (let i=0; i<=rows; i++) { const y=(i/rows)*H; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

      ctx.strokeStyle = '#dce3ed'; ctx.lineWidth = 1
      const mx = Math.floor(cols/2), my = Math.floor(rows/2)
      const mxP=(mx/cols)*W, myP=(my/rows)*H
      ctx.beginPath(); ctx.moveTo(mxP,0); ctx.lineTo(mxP,H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0,myP); ctx.lineTo(W,myP); ctx.stroke()

      if (buf.length < 2) { frameRef.current = requestAnimationFrame(draw); return }

      const pts = buf.slice(-Math.floor(W/2))
      const step = W / Math.max(pts.length-1, 1)
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'
      pts.forEach((v, i) => {
        const x = i * step
        const norm = Math.max(0, Math.min(1, (v - min) / (max - min)))
        const y = H - norm * H * 0.8 - H * 0.1
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()

      ctx.globalAlpha = 0.12
      ctx.lineWidth = 6
      ctx.beginPath()
      pts.forEach((v, i) => {
        const x = i * step
        const norm = Math.max(0, Math.min(1, (v - min) / (max - min)))
        const y = H - norm * H * 0.8 - H * 0.1
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.globalAlpha = 1

      const sx = posRef.current % W
      const grad = ctx.createLinearGradient(sx-20, 0, sx+4, 0)
      grad.addColorStop(0, 'rgba(250,251,252,0)')
      grad.addColorStop(1, 'rgba(250,251,252,0.9)')
      ctx.fillStyle = grad; ctx.fillRect(sx-20, 0, 24, H)
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5
      ctx.beginPath(); ctx.moveTo(sx,0); ctx.lineTo(sx,H); ctx.stroke()
      ctx.globalAlpha = 1
      posRef.current = (posRef.current + 1.8) % W

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameRef.current)
  }, [color, min, max])

  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const ro = new ResizeObserver(([e]) => {
      c.width = Math.round(e.contentRect.width)
      c.height = Math.round(e.contentRect.height)
    })
    ro.observe(c)
    c.width = c.offsetWidth || 200
    c.height = c.offsetHeight || height
    return () => ro.disconnect()
  }, [])

  return (
    <div style={{ position:'relative', width:'100%', height }}>
      <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block', borderRadius:6, border:'1px solid #eef1f6' }} />
      {value != null && (
        <div style={{
          position:'absolute', top:5, right:8, display:'flex', alignItems:'baseline', gap:3,
        }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:16, color }}>{typeof value==='number'?value.toFixed(1):value}</span>
          <span style={{ fontSize:10, color:'var(--text3)', fontWeight:500 }}>{label}</span>
        </div>
      )}
    </div>
  )
}
