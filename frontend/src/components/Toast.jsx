import { useEffect, useState } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const show = (msg, type='success', duration=3500) => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x=>x.id!==id)), duration)
  }

  return { toasts, show }
}

export function ToastContainer({ toasts }) {
  const colors = {
    success: { bg:'#f0fdf4', border:'#86efac', text:'#15803d' },
    error:   { bg:'#fef2f2', border:'#fca5a5', text:'#b91c1c' },
    warning: { bg:'#fffbeb', border:'#fde68a', text:'#92400e' },
    info:    { bg:'#eff6ff', border:'#93c5fd', text:'#1d4ed8' },
  }
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
      {toasts.map(t => {
        const c = colors[t.type] || colors.success
        return (
          <div key={t.id} className="animate-slide-in" style={{
            background:c.bg, border:`1px solid ${c.border}`,
            color:c.text, borderRadius:10, padding:'10px 16px',
            fontSize:13, fontWeight:500, maxWidth:360,
            boxShadow:'var(--shadow-lg)', lineHeight:1.5,
          }}>{t.msg}</div>
        )
      })}
    </div>
  )
}
